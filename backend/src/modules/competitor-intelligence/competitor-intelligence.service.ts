import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CrawlService } from '../crawl/crawl.service';
import { ResultQualityService } from '../quality/result-quality.service';
import { SerpVolatilityService } from '../serp-volatility/serp-volatility.service';
import { DataForSeoClient } from '../serp/providers/dataforseo/dataforseo.client';
import type { NormalizedSerpResult } from '../serp/providers/dataforseo/dataforseo.types';
import { SnapshotDiffService } from '../snapshot-diff/snapshot-diff.service';
import { CreateKeywordSnapshotDto } from './dto/create-keyword-snapshot.dto';
import { FeatureExtractorService } from './feature-extractor.service';

@Injectable()
export class CompetitorIntelligenceService {
  private readonly logger = new Logger(CompetitorIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataForSeo: DataForSeoClient,
    private readonly crawlService: CrawlService,
    private readonly extractor: FeatureExtractorService,
    private readonly quality: ResultQualityService,
    private readonly diffs: SnapshotDiffService,
    private readonly volatility: SerpVolatilityService,
  ) {}

  async createKeywordSnapshot(dto: CreateKeywordSnapshotDto) {
    const startedAt = Date.now();
    const limit = dto.limit ?? 10;
    this.logger.log(
      `[CompetitorIntel] Starting top-${limit} snapshot keyword="${dto.keyword}"`,
    );

    const collection = await this.dataForSeo.collectOrganicSerp({
      keyword: dto.keyword,
      locationCode: dto.locationCode ?? 2840,
      languageCode: dto.languageCode ?? 'en',
      device: dto.device ?? 'desktop',
      depth: 20,
    });

    const organicResults = topOrganicResults(collection.results, limit);
    this.logger.log(
      `[CompetitorIntel] Organic competitors extracted count=${organicResults.length}`,
    );

    if (!organicResults.length) {
      throw new BadGatewayException(
        'DataForSEO returned no organic competitors',
      );
    }

    const keywordSnapshot = await this.prisma.keywordSnapshot.create({
      data: {
        keyword: dto.keyword.trim(),
        locationCode: dto.locationCode ?? 2840,
        languageCode: dto.languageCode ?? 'en',
        device: dto.device ?? 'desktop',
        provider: collection.provider,
        status: collection.status,
        errorMessage: collection.errorMessage,
        requestDurationMs: collection.requestDurationMs,
        totalResults: collection.totalResults,
        organicResultsCount: organicResults.length,
        rawSerpResponse: collection.rawResponse,
      },
    });

    for (const result of organicResults) {
      await this.createCompetitorSnapshot(
        keywordSnapshot.id,
        dto.keyword,
        result,
      );
    }

    await this.volatility.calculateForSnapshot(keywordSnapshot.id);

    const snapshot = await this.getSnapshot(keywordSnapshot.id);
    this.logger.log(
      `[CompetitorIntel] Snapshot completed id=${keywordSnapshot.id} durationMs=${Date.now() - startedAt}`,
    );
    return snapshot;
  }

  async latestSnapshots(limit = 5) {
    const snapshots = await this.prisma.keywordSnapshot.findMany({
      orderBy: { capturedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 25),
      include: snapshotInclude,
    });

    return snapshots.map((snapshot) => mapSnapshot(snapshot));
  }

  async getSnapshot(id: string) {
    const snapshot = await this.prisma.keywordSnapshot.findUnique({
      where: { id },
      include: snapshotInclude,
    });

    if (!snapshot) return null;

    const urls = [
      ...new Set(
        snapshot.competitorSnapshots
          .map((competitor) => competitor.normalizedUrl)
          .filter((url): url is string => Boolean(url)),
      ),
    ];
    const historicalRanking = urls.length
      ? await this.prisma.rankingHistory.findMany({
          where: {
            keyword: snapshot.keyword,
            url: { in: urls },
          },
          orderBy: { capturedAt: 'desc' },
        })
      : [];

    return mapSnapshot(snapshot, historicalRanking);
  }

  async getPage(id: string) {
    const competitor = await this.prisma.competitorSnapshot.findUnique({
      where: { id },
      include: {
        extractedFeatures: true,
        rankingHistory: true,
        currentDiffs: true,
        internalLinkItems: true,
        aiAssumptions: true,
        keywordSnapshot: true,
      },
    });

    if (!competitor) return null;

    const keyword = competitor.keywordSnapshot?.keyword;
    const normalizedUrl =
      competitor.normalizedUrl ?? normalizeRankingUrl(competitor.url);
    const capturedAt =
      competitor.keywordSnapshot?.capturedAt ?? competitor.createdAt;

    const fullRankingHistory = keyword
      ? await this.prisma.rankingHistory.findMany({
          where: {
            keyword,
            url: normalizedUrl,
          },
          orderBy: { capturedAt: 'desc' },
        })
      : [];

    const currentHistory =
      fullRankingHistory.find(
        (row) => row.competitorSnapshotId === competitor.id,
      ) ??
      competitor.rankingHistory?.[0] ??
      null;
    const previousCheck =
      fullRankingHistory.find(
        (row) =>
          row.competitorSnapshotId !== competitor.id &&
          new Date(row.capturedAt).getTime() <
            new Date(capturedAt).getTime(),
      ) ?? null;

    const internalLinkItems = (competitor.internalLinkItems ?? []).filter(
      (row: any) => {
        const destinationUrl = String(row?.destinationUrl ?? '');
        const sourceUrl = String(row?.sourceUrl ?? competitor.url ?? '');
        const { url: cleanHref } = parseMarkdownLinkTarget(destinationUrl);
        const resolved = sourceUrl
          ? stripEncodedMarkdownTitle(resolveUrl(sourceUrl, cleanHref))
          : stripEncodedMarkdownTitle(cleanHref);
        const normalized = normalizeRankingUrl(resolved);
        row.destinationUrl = cleanHref;
        row.normalizedUrl = normalized;
        return isLikelyHtmlPageUrl(normalized);
      },
    );

    const anchorTexts = [
      ...new Set(
        internalLinkItems
          .map((row: any) =>
            normalizeAnchorText(String(row?.anchorText ?? '')),
          )
          .filter((value: string) => value.length > 0),
      ),
    ].slice(0, 30);
    const hubPageReferences = [
      ...new Set(
        internalLinkItems
          .filter((row: any) => Boolean(row?.isHubReference))
          .map((row: any) =>
            String(row?.normalizedUrl ?? row?.destinationUrl ?? ''),
          )
          .filter((value: string) => value.length > 0),
      ),
    ].slice(0, 20);

    const extractedFeatures = competitor.extractedFeatures
      ? {
          ...competitor.extractedFeatures,
          internalLinksCount: internalLinkItems.length,
          anchorTexts,
          hubPageReferences,
        }
      : competitor.extractedFeatures;

    return {
      id: competitor.id,
      keywordSnapshotId: competitor.keywordSnapshotId,
      position: competitor.position,
      url: competitor.url,
      rankingUrl: competitor.rankingUrl ?? competitor.url,
      normalizedUrl,
      urlHash: competitor.urlHash,
      domain: competitor.domain,
      title: competitor.title,
      metaDescription: competitor.metaDescription,
      snippet: competitor.snippet,
      crawlStatus: competitor.crawlStatus,
      crawlError: competitor.crawlError,
      crawlDurationMs: competitor.crawlDurationMs,
      crawledAt: competitor.crawledAt,
      resultQuality: competitor.resultQuality,
      extractionConfidence: competitor.extractionConfidence,
      renderQualityScore: competitor.renderQualityScore,
      processingSkipped: competitor.processingSkipped,
      skipReason: competitor.skipReason,
      protectionType: competitor.protectionType,
      blockedBy: competitor.blockedBy,
      partialExtraction: competitor.partialExtraction,
      extractedFeatures,
      rawCrawlResponse: competitor.rawCrawlResponse,
      rankingHistory: currentHistory ? [currentHistory] : competitor.rankingHistory,
      positionHistory: fullRankingHistory.map((row) => ({
        position: row.position,
        previousPosition: row.previousPosition,
        positionDelta: row.positionDelta,
        capturedAt: row.capturedAt,
        competitorSnapshotId: row.competitorSnapshotId,
      })),
      previousCheck: previousCheck
        ? {
            position: previousCheck.position,
            capturedAt: previousCheck.capturedAt,
            competitorSnapshotId: previousCheck.competitorSnapshotId,
          }
        : null,
      diffs: previousCheck ? competitor.currentDiffs : [],
      internalLinkItems,
      aiAssumptions: competitor.aiAssumptions,
      keyword: keyword ?? null,
      capturedAt,
    };
  }

  private async createCompetitorSnapshot(
    keywordSnapshotId: string,
    keyword: string,
    result: NormalizedSerpResult,
  ) {
    const url = result.url;
    const domain = result.domain ?? extractDomain(url);

    if (!url || !domain) {
      this.logger.warn(
        `[CompetitorIntel] Skipping organic result with missing URL/domain title="${result.title ?? ''}"`,
      );
      return;
    }

    const position = result.rankAbsolute ?? result.rankGroup ?? result.position;
    const normalizedUrl = normalizeRankingUrl(url);
    const urlHash = hashUrl(normalizedUrl);
    const previous = await this.prisma.rankingHistory.findFirst({
      where: { keyword, url: normalizedUrl },
      orderBy: { capturedAt: 'desc' },
    });
    const previousCompetitors = await this.prisma.competitorSnapshot.findMany({
      where: {
        normalizedUrl,
        keywordSnapshot: { keyword },
      },
      include: { extractedFeatures: true, keywordSnapshot: true },
      orderBy: { keywordSnapshot: { capturedAt: 'desc' } },
      take: 10,
    });
    const previousCompetitor = previousCompetitors[0];
    const previousFeatures = previousCompetitor?.extractedFeatures;
    const preCrawlQuality = this.quality.classifyBeforeCrawl({
      url,
      domain,
      title: result.title,
    });

    const competitor = await this.prisma.competitorSnapshot.create({
      data: {
        keywordSnapshotId,
        position,
        url,
        domain,
        rankingUrl: url,
        normalizedUrl,
        urlHash,
        title: result.title,
        snippet: result.snippet,
        crawlStatus: preCrawlQuality.processingSkipped
          ? preCrawlQuality.crawlStatus
          : 'pending',
        crawlError: preCrawlQuality.crawlError,
        resultQuality: preCrawlQuality.quality,
        extractionConfidence: preCrawlQuality.extractionConfidence,
        renderQualityScore: preCrawlQuality.renderQualityScore,
        processingSkipped: preCrawlQuality.processingSkipped,
        skipReason: preCrawlQuality.skipReason,
        protectionType: preCrawlQuality.protectionType,
        blockedBy: preCrawlQuality.blockedBy,
        partialExtraction: preCrawlQuality.partialExtraction,
      },
    });

    await this.prisma.rankingHistory.create({
      data: {
        keywordSnapshotId,
        competitorSnapshotId: competitor.id,
        keyword,
        domain,
        url: normalizedUrl,
        position,
        previousPosition: previous?.position,
        positionDelta: previous ? previous.position - position : undefined,
      },
    });

    if (preCrawlQuality.processingSkipped) {
      this.logger.warn(
        `[CompetitorIntel] Skipping crawl position=${position} domain=${domain} reason=${preCrawlQuality.skipReason}`,
      );
      return;
    }

    const crawlStartedAt = Date.now();
    this.logger.log(
      `[CompetitorIntel] Crawling exact ranking URL position=${position} domain=${domain} url=${url}`,
    );

    try {
      const page = await this.crawlService.testUrl(url);
      const crawlDurationMs = Date.now() - crawlStartedAt;
      const qualityStatus = this.quality.classifyAfterCrawl({
        url,
        domain,
        title: page.title,
        markdown: page.markdown,
        metadata: page.metadata,
        wordCount: page.wordCount,
      });

      if (qualityStatus.processingSkipped && !qualityStatus.partialExtraction) {
        const fallbackMarkdown = fallbackMarkdownFromSerp(
          result,
          page.markdown,
        );
        const fallbackFeatures = this.extractor.extract({
          keyword,
          url,
          domain,
          title: page.title || result.title,
          markdown: fallbackMarkdown,
          metadata: page.metadata,
          wordCount: wordCount(fallbackMarkdown),
        });

        await this.prisma.competitorSnapshot.update({
          where: { id: competitor.id },
          data: {
            title: page.title || result.title,
            metaDescription: stringValue(page.metadata?.description),
            crawlStatus: 'partial',
            crawlError: qualityStatus.crawlError,
            crawlDurationMs,
            crawledAt: new Date(),
            rawCrawlResponse: {
              metadata: page.metadata,
              markdownPreview: page.markdown.slice(0, 5000),
            } as Prisma.InputJsonValue,
            resultQuality: qualityStatus.quality,
            extractionConfidence: qualityStatus.extractionConfidence,
            renderQualityScore: qualityStatus.renderQualityScore,
            processingSkipped: true,
            skipReason: qualityStatus.skipReason,
            protectionType: qualityStatus.protectionType,
            blockedBy: qualityStatus.blockedBy,
            partialExtraction: true,
            extractedFeatures: {
              create: {
                ...fallbackFeatures,
                semanticClusters: fallbackFeatures.semanticClusters,
                keywordUsageFrequency: fallbackFeatures.keywordUsageFrequency,
                keywordPhraseFrequency: fallbackFeatures.keywordPhraseFrequency,
                seoKeywordPhraseFrequency:
                  fallbackFeatures.seoKeywordPhraseFrequency,
                keywordUsageChange: keywordUsageChange(
                  fallbackFeatures.keywordPhraseFrequency,
                  fallbackFeatures.seoKeywordPhraseFrequency,
                  previousFeatures?.keywordPhraseFrequency,
                  previousFeatures?.seoKeywordPhraseFrequency,
                ),
              },
            },
          },
        });
        await this.diffs.createDiffs(competitor.id, previousCompetitor?.id);
        this.logger.warn(
          `[CompetitorIntel] Created partial SERP-based extraction domain=${domain} reason=${qualityStatus.skipReason}`,
        );
        return;
      }

      const features = this.extractor.extract({
        keyword,
        url,
        domain,
        title: page.title,
        markdown: page.markdown,
        metadata: page.metadata,
        wordCount: page.wordCount,
      });

      await this.prisma.competitorSnapshot.update({
        where: { id: competitor.id },
        data: {
          title: page.title || result.title,
          metaDescription: stringValue(page.metadata?.description),
          crawlStatus: qualityStatus.crawlStatus,
          crawlError: qualityStatus.crawlError,
          crawlDurationMs,
          crawledAt: new Date(),
          rawCrawlResponse: {
            metadata: page.metadata,
            markdownPreview: page.markdown.slice(0, 5000),
          } as Prisma.InputJsonValue,
          resultQuality: qualityStatus.quality,
          extractionConfidence: qualityStatus.extractionConfidence,
          renderQualityScore: qualityStatus.renderQualityScore,
          processingSkipped: qualityStatus.processingSkipped,
          skipReason: qualityStatus.skipReason,
          protectionType: qualityStatus.protectionType,
          blockedBy: qualityStatus.blockedBy,
          partialExtraction: qualityStatus.partialExtraction,
          extractedFeatures: {
            create: {
              ...features,
              semanticClusters: features.semanticClusters,
              keywordUsageFrequency: features.keywordUsageFrequency,
              keywordPhraseFrequency: features.keywordPhraseFrequency,
              seoKeywordPhraseFrequency: features.seoKeywordPhraseFrequency,
              keywordUsageChange: keywordUsageChange(
                features.keywordPhraseFrequency,
                features.seoKeywordPhraseFrequency,
                previousFeatures?.keywordPhraseFrequency,
                previousFeatures?.seoKeywordPhraseFrequency,
              ),
            },
          },
        },
      });

      await this.storeInternalLinks(competitor.id, url, page.markdown, domain);
      await this.diffs.createDiffs(competitor.id, previousCompetitor?.id);

      this.logger.log(
        `[CompetitorIntel] Extracted features domain=${domain} words=${features.wordCount} ctas=${features.ctaCount} faq=${features.faqCount} confidence=${qualityStatus.extractionConfidence}`,
      );
    } catch (error) {
      const message = messageOf(error);
      this.logger.error(
        `[CompetitorIntel] Crawl/extraction failed domain=${domain} url=${url} error=${message}`,
      );
      await this.prisma.competitorSnapshot.update({
        where: { id: competitor.id },
        data: {
          crawlStatus: 'failed',
          crawlError: message,
          crawlDurationMs: Date.now() - crawlStartedAt,
          crawledAt: new Date(),
        },
      });
    }
  }

  private async storeInternalLinks(
    competitorSnapshotId: string,
    sourceUrl: string,
    markdown: string,
    domain: string,
  ) {
    const normalizedSourceUrl = normalizeRankingUrl(sourceUrl);
    const links = extractMarkdownLinks(markdown)
      .map((link) => {
        const resolved = stripEncodedMarkdownTitle(resolveUrl(sourceUrl, link.url));
        const normalized = normalizeRankingUrl(resolved);
        return { ...link, resolvedUrl: resolved, normalizedUrl: normalized };
      })
      .filter((link) => isInternalLink(domain, link.url))
      .filter((link) => !link.isImageLink)
      .filter((link) => link.anchor.length > 0)
      .filter((link) => isLikelyHtmlPageUrl(link.normalizedUrl))
      .filter((link) => link.normalizedUrl !== normalizedSourceUrl)
      .slice(0, 250)
      .map((link) => ({
        competitorSnapshotId,
        sourceUrl,
        destinationUrl: link.url,
        normalizedUrl: link.normalizedUrl,
        anchorText: link.anchor,
        isHubReference: /casino|bonus|review|crypto|bitcoin|guide|no kyc/i.test(
          `${link.anchor} ${link.url}`,
        ),
      }));

    if (!links.length) return;
    await this.prisma.internalLinkSnapshot.createMany({ data: links });
  }
}

const snapshotInclude = {
  competitorSnapshots: {
    orderBy: { position: 'asc' as const },
    include: {
      extractedFeatures: true,
      rankingHistory: true,
      currentDiffs: true,
      internalLinkItems: true,
      aiAssumptions: true,
    },
  },
  rankingHistory: {
    orderBy: { position: 'asc' as const },
  },
  volatilitySnapshot: true,
  aiAssumptions: true,
};

function topOrganicResults(results: NormalizedSerpResult[], limit: number) {
  return results
    .filter((result) => result.itemType === 'organic' && result.url)
    .sort(
      (a, b) =>
        (a.rankAbsolute ?? a.rankGroup ?? a.position) -
        (b.rankAbsolute ?? b.rankGroup ?? b.position),
    )
    .slice(0, limit);
}

function extractDomain(url?: string) {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function mapSnapshot(snapshot: any, historicalRanking: any[] = []) {
  const historyByUrl = historicalRanking.reduce((acc, row) => {
    if (!acc.has(row.url)) acc.set(row.url, []);
    acc.get(row.url).push(row);
    return acc;
  }, new Map<string, any[]>());

  return {
    id: snapshot.id,
    projectId: snapshot.projectId,
    keyword: snapshot.keyword,
    locationCode: snapshot.locationCode,
    languageCode: snapshot.languageCode,
    device: snapshot.device,
    provider: snapshot.provider,
    status: snapshot.status,
    errorMessage: snapshot.errorMessage,
    requestDurationMs: snapshot.requestDurationMs,
    totalResults: snapshot.totalResults,
    organicResultsCount: snapshot.organicResultsCount,
    capturedAt: snapshot.capturedAt,
    competitorSnapshots: snapshot.competitorSnapshots.map((competitor: any) => {
      const rankingHistory = [
        ...(historyByUrl.get(competitor.normalizedUrl) ??
          competitor.rankingHistory ??
          []),
      ].sort(
        (a, b) =>
          new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
      );
      const currentHistory =
        rankingHistory.find(
          (row) => row.competitorSnapshotId === competitor.id,
        ) ??
        competitor.rankingHistory?.[0] ??
        null;
      const previousCheck =
        rankingHistory.find(
          (row) =>
            row.competitorSnapshotId !== competitor.id &&
            new Date(row.capturedAt).getTime() <
              new Date(snapshot.capturedAt).getTime(),
        ) ?? null;

      const internalLinkItems = (competitor.internalLinkItems ?? []).filter(
        (row: any) => {
          const destinationUrl = String(row?.destinationUrl ?? '');
          const sourceUrl = String(row?.sourceUrl ?? competitor.url ?? '');
          const { url: cleanHref } = parseMarkdownLinkTarget(destinationUrl);
          const resolved = sourceUrl
            ? stripEncodedMarkdownTitle(resolveUrl(sourceUrl, cleanHref))
            : stripEncodedMarkdownTitle(cleanHref);
          const normalized = normalizeRankingUrl(resolved);
          row.destinationUrl = cleanHref;
          row.normalizedUrl = normalized;
          return isLikelyHtmlPageUrl(normalized);
        },
      );
      const anchorTexts = [
        ...new Set(
          internalLinkItems
            .map((row: any) => normalizeAnchorText(String(row?.anchorText ?? '')))
            .filter((value: string) => value.length > 0),
        ),
      ].slice(0, 30);
      const hubPageReferences = [
        ...new Set(
          internalLinkItems
            .filter((row: any) => Boolean(row?.isHubReference))
            .map((row: any) => String(row?.normalizedUrl ?? row?.destinationUrl ?? ''))
            .filter((value: string) => value.length > 0),
        ),
      ].slice(0, 20);
      const extractedFeatures = competitor.extractedFeatures
        ? {
            ...competitor.extractedFeatures,
            internalLinksCount: internalLinkItems.length,
            anchorTexts,
            hubPageReferences,
          }
        : competitor.extractedFeatures;

      return {
        id: competitor.id,
        keywordSnapshotId: competitor.keywordSnapshotId,
        position: competitor.position,
        url: competitor.url,
        rankingUrl: competitor.rankingUrl ?? competitor.url,
        normalizedUrl: competitor.normalizedUrl,
        urlHash: competitor.urlHash,
        domain: competitor.domain,
        title: competitor.title,
        metaDescription: competitor.metaDescription,
        snippet: competitor.snippet,
        crawlStatus: competitor.crawlStatus,
        crawlError: competitor.crawlError,
        crawlDurationMs: competitor.crawlDurationMs,
        crawledAt: competitor.crawledAt,
        resultQuality: competitor.resultQuality,
        extractionConfidence: competitor.extractionConfidence,
        renderQualityScore: competitor.renderQualityScore,
        processingSkipped: competitor.processingSkipped,
        skipReason: competitor.skipReason,
        protectionType: competitor.protectionType,
        blockedBy: competitor.blockedBy,
        partialExtraction: competitor.partialExtraction,
        extractedFeatures,
        rawCrawlResponse: competitor.rawCrawlResponse,
        rankingHistory: currentHistory
          ? [currentHistory]
          : competitor.rankingHistory,
        positionHistory: rankingHistory.map((row) => ({
          position: row.position,
          previousPosition: row.previousPosition,
          positionDelta: row.positionDelta,
          capturedAt: row.capturedAt,
          competitorSnapshotId: row.competitorSnapshotId,
        })),
        previousCheck: previousCheck
          ? {
              position: previousCheck.position,
              capturedAt: previousCheck.capturedAt,
              competitorSnapshotId: previousCheck.competitorSnapshotId,
            }
          : null,
        diffs: previousCheck ? competitor.currentDiffs : [],
        internalLinkItems,
        aiAssumptions: competitor.aiAssumptions,
      };
    }),
    rankingHistory: snapshot.rankingHistory,
    volatilitySnapshot: snapshot.volatilitySnapshot,
    aiAssumptions: snapshot.aiAssumptions,
  };
}

function normalizeRankingUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.protocol = parsed.protocol.toLowerCase();

    for (const param of [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
    ]) {
      parsed.searchParams.delete(param);
    }

    if (parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }

    return parsed.toString();
  } catch {
    return url.trim();
  }
}

function hashUrl(url: string) {
  return createHash('sha256').update(url).digest('hex');
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function keywordUsageChange(
  currentBody: Record<string, number>,
  currentSeo: Record<string, number>,
  previousBodyUnknown: unknown,
  previousSeoUnknown: unknown,
) {
  const previousBody = frequencyRecord(previousBodyUnknown);
  const previousSeo = frequencyRecord(previousSeoUnknown);
  const phrases = [
    ...new Set([
      ...Object.keys(currentBody),
      ...Object.keys(currentSeo),
      ...Object.keys(previousBody),
      ...Object.keys(previousSeo),
    ]),
  ];

  return {
    body: phrases
      .map((phrase) => ({
        phrase,
        current: currentBody[phrase] ?? 0,
        previous: previousBody[phrase] ?? 0,
        delta: (currentBody[phrase] ?? 0) - (previousBody[phrase] ?? 0),
      }))
      .filter((item) => item.current || item.previous)
      .sort(
        (a, b) =>
          Math.abs(b.delta) - Math.abs(a.delta) || b.current - a.current,
      ),
    seo: phrases
      .map((phrase) => ({
        phrase,
        current: currentSeo[phrase] ?? 0,
        previous: previousSeo[phrase] ?? 0,
        delta: (currentSeo[phrase] ?? 0) - (previousSeo[phrase] ?? 0),
      }))
      .filter((item) => item.current || item.previous)
      .sort(
        (a, b) =>
          Math.abs(b.delta) - Math.abs(a.delta) || b.current - a.current,
      ),
  };
}

function frequencyRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, count]) => [key, Number(count)] as const)
      .filter(([, count]) => Number.isFinite(count)),
  );
}

function fallbackMarkdownFromSerp(
  result: NormalizedSerpResult,
  crawlMarkdown: string,
) {
  const crawlText = crawlMarkdown.toLowerCase();
  const crawlLooksLikeChallenge =
    /cloudflare|captcha|verify you are human|access denied|attention required|enable javascript/.test(
      crawlText,
    );
  const safeCrawlExcerpt = crawlLooksLikeChallenge
    ? ''
    : crawlMarkdown.slice(0, 1500);
  return [
    result.title ? `# ${result.title}` : '',
    result.snippet ?? '',
    result.breadcrumb ?? '',
    safeCrawlExcerpt,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractMarkdownLinks(markdown: string) {
  return [...markdown.matchAll(/\[([^\]]{1,180})\]\(([^)]+)\)/g)]
    .map((match) => {
      const rawAnchor = match[1] ?? '';
      const rawUrl = match[2] ?? '';
      const { url: parsedUrl } = parseMarkdownLinkTarget(rawUrl);
      const isImageLink =
        /^\s*!\[/.test(rawAnchor) || /!\[[^\]]*]\([^)]*\)/.test(rawAnchor);

      return {
        anchor: normalizeAnchorText(rawAnchor),
        url: parsedUrl,
        isImageLink,
      };
    })
    .filter(
      (link) =>
        link.url &&
        !link.url.startsWith('#') &&
        !/^mailto:|^tel:/i.test(link.url),
    );
}

function normalizeAnchorText(value: string) {
  return (
    value
      .trim()
      // Unwrap nested markdown images like: [![Dogecoin](...)](href)
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Some crawlers emit leading "![" fragments when the image URL is missing/truncated.
      .replace(/^!\[?/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function parseMarkdownLinkTarget(rawTarget: string) {
  const trimmed = rawTarget.trim();
  if (!trimmed) return { url: '' };

  // Markdown allows: (url "title") or (<url> "title")
  // Firecrawl often emits the title too; we want only the URL.
  if (trimmed.startsWith('<')) {
    const close = trimmed.indexOf('>');
    if (close > 1) {
      return { url: trimmed.slice(1, close).trim() };
    }
  }

  // Take the first whitespace-delimited token as the URL.
  // This intentionally drops any trailing title string.
  const firstToken = trimmed.split(/\s+/)[0] ?? '';
  return { url: firstToken.trim() };
}

function isLikelyHtmlPageUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) return false;

    const pathname = parsed.pathname.toLowerCase();
    if (pathname.startsWith('/cdn-cgi/')) return false;
    if (pathname.includes('/wp-content/uploads/')) return false;

    const lastSegment = pathname.split('/').filter(Boolean).pop() ?? '';
    const hasExtension = lastSegment.includes('.') && !lastSegment.endsWith('.');
    if (!hasExtension) return true;

    const extension = `.${lastSegment.split('.').pop() ?? ''}`;
    const htmlExtensions = new Set(['.html', '.htm', '.php', '.aspx', '.asp']);
    if (htmlExtensions.has(extension)) return true;

    const nonHtmlExtensions = new Set([
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.webp',
      '.svg',
      '.ico',
      '.pdf',
      '.zip',
      '.rar',
      '.7z',
      '.mp3',
      '.wav',
      '.mp4',
      '.mov',
      '.webm',
      '.css',
      '.js',
      '.mjs',
      '.json',
      '.xml',
      '.txt',
      '.csv',
      '.woff',
      '.woff2',
      '.ttf',
      '.eot',
    ]);

    return !nonHtmlExtensions.has(extension);
  } catch {
    return false;
  }
}

function stripEncodedMarkdownTitle(url: string) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    // Firecrawl markdown sometimes leaks the optional markdown link title into the href which later gets URL-encoded
    // e.g. `/plinko-bitcoin/ "Plinko"` -> `/plinko-bitcoin/%20%22Plinko%22`
    if (/%20%22/i.test(pathname) && /%22$/i.test(pathname)) {
      parsed.pathname = pathname.replace(/(?:\/)?%20%22[^/]*%22$/i, '');
      if (!parsed.pathname) parsed.pathname = '/';
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function isInternalLink(domain: string, href: string) {
  if (href.startsWith('/')) return true;
  try {
    return new URL(href).hostname.replace(/^www\./, '') === domain;
  } catch {
    return false;
  }
}

function resolveUrl(sourceUrl: string, href: string) {
  try {
    return new URL(href, sourceUrl).toString();
  } catch {
    return href;
  }
}
