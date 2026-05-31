import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { Prisma, SnapshotDiffChangeType } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityNormalizationService } from '../entity-normalization/entity-normalization.service';
import { CollectSitemapDto } from './dto/collect-sitemap.dto';
import {
  ParsedSitemapUrl,
  SitemapParserService,
} from './sitemap-parser.service';

const MAX_SITEMAPS = 25;
const MAX_URLS = 5000;

@Injectable()
export class SitemapIntelligenceService {
  private readonly logger = new Logger(SitemapIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: SitemapParserService,
    private readonly entities: EntityNormalizationService,
  ) {}

  async collect(dto: CollectSitemapDto) {
    const startedAt = Date.now();
    const domain = normalizeDomain(dto.domain);
    const robotsUrl = `https://${domain}/robots.txt`;
    this.logger.log(`[Sitemap] Starting collection domain=${domain}`);

    const robotsTxt = await fetchText(robotsUrl).catch((error) => {
      this.logger.warn(
        `[Sitemap] robots.txt failed domain=${domain} error=${messageOf(error)}`,
      );
      return '';
    });

    const sitemapUrls = this.parser
      .extractSitemapUrls(robotsTxt, domain)
      .slice(0, MAX_SITEMAPS);
    const urls = await this.fetchSitemaps(sitemapUrls);
    const previous = await this.prisma.sitemapSnapshot.findFirst({
      where: { domain },
      orderBy: { capturedAt: 'desc' },
      include: { urls: true },
    });

    const previousByHash = new Map(
      (previous?.urls ?? []).map((item) => [item.urlHash, item]),
    );
    const currentRows = uniqueBy(urls, (url) => normalizeUrl(url.url))
      .slice(0, MAX_URLS)
      .map((item) => toSitemapRow(item));
    const currentByHash = new Map(
      currentRows.map((item) => [item.urlHash, item]),
    );
    const diffs = buildSitemapDiffs(currentByHash, previousByHash);
    const semanticClusters = this.entities.group(
      currentRows.map((item) => item.path),
    );
    const categoryExpansions = currentRows
      .filter((item) => !previousByHash.has(item.urlHash))
      .map((item) => item.semanticCluster)
      .filter((item): item is string => Boolean(item));

    const snapshot = await this.prisma.sitemapSnapshot.create({
      data: {
        projectId: dto.projectId,
        domain,
        robotsUrl,
        sitemapUrls,
        requestDurationMs: Date.now() - startedAt,
        totalUrls: currentRows.length,
        addedUrlsCount: diffs.filter(
          (item) => item.changeType === SnapshotDiffChangeType.ADDED,
        ).length,
        removedUrlsCount: diffs.filter(
          (item) => item.changeType === SnapshotDiffChangeType.REMOVED,
        ).length,
        changedUrlsCount: diffs.filter(
          (item) => item.changeType === SnapshotDiffChangeType.CHANGED,
        ).length,
        freshnessVelocity: currentRows.filter(
          (item) =>
            item.lastmod &&
            item.lastmod.getTime() > Date.now() - 1000 * 60 * 60 * 24 * 30,
        ).length,
        semanticClusters: semanticClusters,
        categoryExpansions: [...new Set(categoryExpansions)],
        rawRobotsTxt: robotsTxt,
        urls: {
          create: currentRows.map((item) => ({
            url: item.url,
            normalizedUrl: item.normalizedUrl,
            urlHash: item.urlHash,
            path: item.path,
            lastmod: item.lastmod,
            changefreq: item.changefreq,
            priority: item.priority,
            semanticCluster: item.semanticCluster,
          })),
        },
        diffs: {
          create: diffs.map((item) => ({
            url: item.url,
            urlHash: item.urlHash,
            changeType: item.changeType,
            previousValue: item.previousValue as Prisma.InputJsonValue,
            currentValue: item.currentValue as Prisma.InputJsonValue,
            semanticCluster: item.semanticCluster,
          })),
        },
      },
      include: sitemapInclude,
    });

    this.logger.log(
      `[Sitemap] Completed domain=${domain} urls=${currentRows.length} durationMs=${Date.now() - startedAt}`,
    );
    return mapSitemapSnapshot(snapshot);
  }

  async latest(limit = 10) {
    const snapshots = await this.prisma.sitemapSnapshot.findMany({
      orderBy: { capturedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
      include: sitemapInclude,
    });
    return snapshots.map(mapSitemapSnapshot);
  }

  async get(id: string) {
    const snapshot = await this.prisma.sitemapSnapshot.findUnique({
      where: { id },
      include: sitemapInclude,
    });
    return snapshot ? mapSitemapSnapshot(snapshot) : null;
  }

  private async fetchSitemaps(seedUrls: string[]) {
    const queue = [...seedUrls];
    const visited = new Set<string>();
    const urls: ParsedSitemapUrl[] = [];

    while (
      queue.length &&
      visited.size < MAX_SITEMAPS &&
      urls.length < MAX_URLS
    ) {
      const sitemapUrl = queue.shift();
      if (!sitemapUrl || visited.has(sitemapUrl)) continue;
      visited.add(sitemapUrl);

      try {
        const xml = await fetchText(sitemapUrl);
        if (this.parser.isSitemapIndex(xml)) {
          queue.push(...this.parser.parseSitemapIndex(xml));
        } else {
          urls.push(...this.parser.parseUrlSet(xml));
        }
      } catch (error) {
        this.logger.warn(
          `[Sitemap] sitemap fetch failed url=${sitemapUrl} error=${messageOf(error)}`,
        );
      }
    }

    if (!urls.length) {
      throw new BadGatewayException(
        'No sitemap URLs could be parsed for this domain',
      );
    }

    return urls;
  }
}

const sitemapInclude = {
  urls: {
    orderBy: { createdAt: 'asc' as const },
    take: 500,
  },
  diffs: {
    orderBy: { createdAt: 'desc' as const },
    take: 500,
  },
};

function toSitemapRow(item: ParsedSitemapUrl) {
  const normalizedUrl = normalizeUrl(item.url);
  const path = pathFromUrl(normalizedUrl);
  return {
    ...item,
    normalizedUrl,
    urlHash: createHash('sha256').update(normalizedUrl).digest('hex'),
    path,
    semanticCluster: classifySitemapPath(path),
  };
}

type SitemapDiffDraft = {
  url: string;
  urlHash: string;
  changeType: SnapshotDiffChangeType;
  previousValue: unknown;
  currentValue: unknown;
  semanticCluster?: string;
};

function buildSitemapDiffs(
  current: Map<string, ReturnType<typeof toSitemapRow>>,
  previous: Map<
    string,
    {
      urlHash: string;
      url: string;
      lastmod: Date | null;
      semanticCluster: string | null;
    }
  >,
) {
  const diffs: SitemapDiffDraft[] = [];

  for (const row of current.values()) {
    const old = previous.get(row.urlHash);
    if (!old) {
      diffs.push({
        url: row.url,
        urlHash: row.urlHash,
        changeType: SnapshotDiffChangeType.ADDED,
        previousValue: null,
        currentValue: row,
        semanticCluster: row.semanticCluster,
      });
    } else if (String(old.lastmod ?? '') !== String(row.lastmod ?? '')) {
      diffs.push({
        url: row.url,
        urlHash: row.urlHash,
        changeType: SnapshotDiffChangeType.CHANGED,
        previousValue: { lastmod: old.lastmod },
        currentValue: { lastmod: row.lastmod },
        semanticCluster: row.semanticCluster,
      });
    }
  }

  for (const old of previous.values()) {
    if (!current.has(old.urlHash)) {
      diffs.push({
        url: old.url,
        urlHash: old.urlHash,
        changeType: SnapshotDiffChangeType.REMOVED,
        previousValue: old,
        currentValue: null,
        semanticCluster: old.semanticCluster ?? undefined,
      });
    }
  }

  return diffs;
}

function mapSitemapSnapshot(snapshot: any) {
  return {
    id: snapshot.id,
    projectId: snapshot.projectId,
    domain: snapshot.domain,
    robotsUrl: snapshot.robotsUrl,
    sitemapUrls: snapshot.sitemapUrls,
    status: snapshot.status,
    errorMessage: snapshot.errorMessage,
    requestDurationMs: snapshot.requestDurationMs,
    totalUrls: snapshot.totalUrls,
    addedUrlsCount: snapshot.addedUrlsCount,
    removedUrlsCount: snapshot.removedUrlsCount,
    changedUrlsCount: snapshot.changedUrlsCount,
    freshnessVelocity: snapshot.freshnessVelocity,
    semanticClusters: snapshot.semanticClusters,
    categoryExpansions: snapshot.categoryExpansions,
    capturedAt: snapshot.capturedAt,
    urls: snapshot.urls,
    diffs: snapshot.diffs,
  };
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SEOIntelligenceBot/1.0' },
    });
    if (!response.ok)
      throw new Error(`${response.status} ${response.statusText}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeDomain(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return new URL(withProtocol).hostname.replace(/^www\./, '').toLowerCase();
}

function normalizeUrl(value: string) {
  const url = new URL(value);
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

function pathFromUrl(value: string) {
  try {
    return new URL(value).pathname || '/';
  } catch {
    return '/';
  }
}

function classifySitemapPath(path: string) {
  const readable = path.toLowerCase().replace(/[-_/]+/g, ' ');
  if (/telegram/.test(readable)) return 'telegram casino';
  if (/solana|\bsol\b/.test(readable)) return 'solana casino';
  if (/no kyc|anonymous/.test(readable)) return 'no kyc casino';
  if (/prediction market/.test(readable)) return 'prediction market';
  if (/bonus|promo|offer/.test(readable)) return 'bonus';
  if (/review/.test(readable)) return 'review';
  if (/casino|gambling|betting/.test(readable)) return 'casino';
  return undefined;
}

function uniqueBy<T>(items: T[], keyFn: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
