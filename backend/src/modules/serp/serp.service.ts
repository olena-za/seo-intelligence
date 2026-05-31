import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenAIService } from '../../ai/openai.service';
import { CrawlService } from '../crawl/crawl.service';
import { CreateSerpSnapshotDto } from './dto/create-serp-snapshot.dto';
import { DataForSeoClient } from './providers/dataforseo/dataforseo.client';
import type {
  NormalizedSerpCollection,
  SerpCollectionRequest,
} from './providers/dataforseo/dataforseo.types';

type CollectInput = SerpCollectionRequest & {
  projectId: string;
};

export type TestPipelineResult = {
  keyword: string;
  collection: NormalizedSerpCollection;
  organicResults: Array<{
    title: string | null;
    url: string;
    domain: string | null;
    snippet: string | null;
    rank: number | undefined;
    item_type: string;
  }>;
  crawledUrl: string;
  crawledPage: Awaited<ReturnType<CrawlService['testUrl']>>;
  crawlDurationMs: number;
  analysis: Awaited<ReturnType<OpenAIService['analyzeSeoPage']>>;
  totalDurationMs: number;
};

@Injectable()
export class SerpService {
  private readonly logger = new Logger(SerpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataForSeo: DataForSeoClient,
    private readonly crawlService: CrawlService,
    private readonly openai: OpenAIService,
  ) {}

  async collect(input: CollectInput, userId?: string) {
    const project = userId
      ? await this.ensureProject(input.projectId, userId)
      : await this.ensureProjectExistsForDevelopment(input.projectId);
    const keyword = await this.findOrCreateKeyword(project.id, input);
    this.logger.log(
      `[SERP] Starting collection projectId=${project.id} keywordId=${keyword.id}`,
    );

    try {
      const collection = await this.dataForSeo.collectOrganicSerp(input);
      const snapshot = await this.saveSnapshot(
        project.id,
        keyword.id,
        collection,
      );
      this.logger.log(`[SERP] Snapshot saved snapshotId=${snapshot.id}`);
      this.logger.log(
        `[SERP] Collection completed in ${collection.requestDurationMs}ms`,
      );
      return snapshot;
    } catch (error) {
      const snapshot = await this.saveFailedSnapshot(
        project.id,
        keyword.id,
        error,
      );
      this.logger.error(
        `[SERP] Failed snapshot saved snapshotId=${snapshot.id} error=${messageOf(error)}`,
      );
      throw error;
    }
  }

  async collectSerpData(projectId: string, keywordId: string, userId?: string) {
    const keyword = await this.prisma.keyword.findFirst({
      where: {
        id: keywordId,
        projectId,
        ...(userId ? { project: { userId } } : {}),
      },
    });

    if (!keyword) {
      throw new NotFoundException('Keyword not found');
    }

    if (userId) {
      return this.collect(
        {
          projectId,
          keyword: keyword.keyword,
          locationCode: keyword.locationCode ?? undefined,
          languageCode: keyword.languageCode,
          device: keyword.device,
        },
        userId,
      );
    }

    const collection = await this.dataForSeo.collectOrganicSerp({
      keyword: keyword.keyword,
      locationCode: keyword.locationCode ?? undefined,
      languageCode: keyword.languageCode,
      device: keyword.device,
    });
    return this.saveSnapshot(projectId, keyword.id, collection);
  }

  async testKeyword(input: SerpCollectionRequest) {
    const pipeline = await this.runTestPipeline(input);

    return {
      keyword: pipeline.keyword,
      serp: {
        provider: pipeline.collection.provider,
        requestDurationMs: pipeline.collection.requestDurationMs,
        totalResults: pipeline.collection.totalResults,
        organicResultsCount: pipeline.organicResults.length,
        resultTypes: pipeline.collection.resultTypes,
      },
      crawl: {
        successCount: 1,
        url: pipeline.crawledUrl,
        title: pipeline.crawledPage.title,
        wordCount: pipeline.crawledPage.wordCount,
      },
      analysis: {
        status: 'success',
        summary: pipeline.analysis.result.summary,
        scores: pipeline.analysis.result.scores,
        contentGaps: pipeline.analysis.result.contentGaps,
        optimizationOpportunities:
          pipeline.analysis.result.optimizationOpportunities,
        tokensUsed: pipeline.analysis.tokens,
      },
      pipeline: {
        status: 'success',
        totalDurationMs: pipeline.totalDurationMs,
      },
    };
  }

  async runTestPipeline(
    input: SerpCollectionRequest,
  ): Promise<TestPipelineResult> {
    const startedAt = Date.now();
    this.logger.log(
      `[SERP] Test pipeline incoming keyword="${input.keyword}" save=false`,
    );
    const collection = await this.dataForSeo.collectOrganicSerp(input);
    this.logger.debug(
      `[SERP] DataForSEO raw response... ${safeJson(collection.rawResponse, 8000)}`,
    );

    const organicResults = collection.results
      .filter((result) => result.itemType === 'organic' && result.url)
      .map((result) => ({
        title: result.title ?? null,
        url: result.url as string,
        domain: result.domain ?? null,
        snippet: result.snippet ?? null,
        rank: result.rankAbsolute ?? result.rankGroup ?? result.position,
        item_type: result.itemType,
      }));

    this.logger.log(
      `[SERP] Extracted organic results count=${organicResults.length}`,
    );
    this.logger.debug(
      `[SERP] Extracted organic results... ${safeJson(organicResults, 6000)}`,
    );

    if (organicResults.length === 0) {
      throw new BadGatewayException('DataForSEO returned no organic results');
    }

    const crawlFailures: Array<{ url: string; error: string }> = [];
    let crawledPage: Awaited<ReturnType<CrawlService['testUrl']>> | null = null;
    let crawledUrl = '';
    let crawlDurationMs = 0;

    for (const result of organicResults) {
      this.assertValidExtractedUrl(result.url);
      this.logger.log(`[SERP] URL passed to Firecrawl url=${result.url}`);

      try {
        const crawlStartedAt = Date.now();
        const candidatePage = await this.crawlService.testUrl(result.url);
        const candidateDurationMs = Date.now() - crawlStartedAt;
        const qualityIssue = crawlQualityIssue(candidatePage);

        if (qualityIssue) {
          throw new Error(`Crawled page rejected: ${qualityIssue}`);
        }

        crawledPage = candidatePage;
        crawlDurationMs = candidateDurationMs;
        crawledUrl = result.url;
        break;
      } catch (error) {
        const message = messageOf(error);
        crawlFailures.push({ url: result.url, error: message });
        this.logger.error(
          `[SERP] Firecrawl failed url=${result.url} error=${message}`,
        );
      }
    }

    if (!crawledPage) {
      throw new ServiceUnavailableException({
        message: 'Firecrawl failed for all extracted organic URLs',
        failures: crawlFailures,
      });
    }

    this.logger.log(
      `[SERP] Firecrawl success url=${crawledUrl} wordCount=${crawledPage.wordCount}`,
    );
    this.logger.log(
      `[SERP] OpenAI request summary url=${crawledUrl} markdownChars=${crawledPage.markdown.length}`,
    );

    let analysis: Awaited<ReturnType<OpenAIService['analyzeSeoPage']>>;
    try {
      analysis = await this.openai.analyzeSeoPage({
        keyword: input.keyword,
        url: crawledUrl,
        title: crawledPage.title,
        metaDescription: stringValue(crawledPage.metadata?.description),
        bodyContent: crawledPage.markdown,
        schema: [],
        internalLinks: [],
      });
    } catch (error) {
      const message = messageOf(error);
      this.logger.error(
        `[SERP] OpenAI analysis failed url=${crawledUrl} error=${message}`,
      );
      throw new ServiceUnavailableException({
        message: 'OpenAI analysis failed',
        error: message,
        url: crawledUrl,
      });
    }

    this.logger.log(
      `[SERP] OpenAI response summary tokens=${analysis.tokens} summary="${analysis.result.summary.slice(0, 180)}"`,
    );

    const totalDurationMs = Date.now() - startedAt;
    this.logger.log(
      `[SERP] Test pipeline completed durationMs=${totalDurationMs}`,
    );

    return {
      keyword: input.keyword,
      collection,
      organicResults,
      crawledUrl,
      crawledPage,
      crawlDurationMs,
      analysis,
      totalDurationMs,
    };
  }

  providerStatus() {
    return this.dataForSeo.status();
  }

  async createSnapshot(dto: CreateSerpSnapshotDto, userId: string) {
    await this.ensureProject(dto.projectId, userId);

    return this.prisma.serpSnapshot.create({
      data: {
        project: { connect: { id: dto.projectId } },
        keyword: { connect: { id: dto.keywordId } },
        provider: 'manual',
        status: 'success',
        totalResults: dto.results.length,
        organicResultsCount: dto.results.length,
        resultTypes: ['organic'],
        results: {
          create: dto.results.map((item, index) => ({
            position: index + 1,
            rankGroup: index + 1,
            rankAbsolute: index + 1,
            itemType: 'organic',
            url: item.url,
            domain: item.domain,
            title: item.title,
            description: item.description,
            snippet: item.description,
            sitelinks: item.sitelinks
              ? JSON.stringify(item.sitelinks)
              : undefined,
          })),
        },
      },
      include: { results: true },
    });
  }

  async findByKeyword(keywordId: string, userId: string) {
    return this.prisma.serpSnapshot.findMany({
      where: { keywordId, project: { userId } },
      orderBy: { collectedAt: 'desc' },
      include: { results: { orderBy: { position: 'asc' } } },
    });
  }

  async findSnapshots(
    userId: string,
    filters: { projectId?: string; keywordId?: string },
  ) {
    return this.prisma.serpSnapshot.findMany({
      where: {
        projectId: filters.projectId,
        keywordId: filters.keywordId,
        project: { userId },
      },
      orderBy: { collectedAt: 'desc' },
      include: { keyword: true, results: { orderBy: { position: 'asc' } } },
    });
  }

  async findSnapshot(id: string, userId: string) {
    const snapshot = await this.prisma.serpSnapshot.findFirst({
      where: { id, project: { userId } },
      include: { keyword: true, results: { orderBy: { position: 'asc' } } },
    });

    if (!snapshot) {
      throw new NotFoundException('SERP snapshot not found');
    }

    return snapshot;
  }

  async latestByProject(projectId: string, userId: string) {
    await this.ensureProject(projectId, userId);
    const keywords = await this.prisma.keyword.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    const snapshots = await Promise.all(
      keywords.map((keyword) =>
        this.prisma.serpSnapshot.findFirst({
          where: { projectId, keywordId: keyword.id },
          orderBy: { collectedAt: 'desc' },
          include: { keyword: true, results: { orderBy: { position: 'asc' } } },
        }),
      ),
    );

    return snapshots.filter(Boolean);
  }

  async historyByProject(
    projectId: string,
    userId: string,
    options: { limit?: number; offset?: number; orderBy?: 'asc' | 'desc' },
  ) {
    await this.ensureProject(projectId, userId);
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const offset = Math.max(options.offset ?? 0, 0);
    const orderBy = options.orderBy ?? 'desc';

    const snapshots = await this.prisma.serpSnapshot.findMany({
      where: { projectId },
      orderBy: { collectedAt: orderBy },
      skip: offset,
      take: limit,
      include: { keyword: true, results: { orderBy: { position: 'asc' } } },
    });

    return snapshots.reduce<Record<string, typeof snapshots>>(
      (groups, snapshot) => {
        const key = snapshot.keyword.keyword;
        groups[key] = groups[key] ?? [];
        groups[key].push(snapshot);
        return groups;
      },
      {},
    );
  }

  async removeSnapshot(id: string, userId: string) {
    await this.findSnapshot(id, userId);
    return this.prisma.serpSnapshot.delete({ where: { id } });
  }

  async findResults(userId: string, snapshotId?: string) {
    return this.prisma.serpResult.findMany({
      where: {
        serpSnapshotId: snapshotId,
        serpSnapshot: { project: { userId } },
      },
      orderBy: { position: 'asc' },
    });
  }

  async removeResult(id: string, userId: string) {
    const result = await this.prisma.serpResult.findFirst({
      where: { id, serpSnapshot: { project: { userId } } },
    });

    if (!result) {
      throw new NotFoundException('SERP result not found');
    }

    return this.prisma.serpResult.delete({ where: { id } });
  }

  private async findOrCreateKeyword(
    projectId: string,
    input: SerpCollectionRequest,
  ) {
    const keyword = input.keyword.trim().toLowerCase();
    return this.prisma.keyword.upsert({
      where: {
        projectId_keyword_locationCode_languageCode_device: {
          projectId,
          keyword,
          locationCode: input.locationCode ?? 2840,
          languageCode: input.languageCode ?? 'en',
          device: input.device ?? 'desktop',
        },
      },
      update: {},
      create: {
        projectId,
        keyword,
        locationCode: input.locationCode ?? 2840,
        languageCode: input.languageCode ?? 'en',
        device: input.device ?? 'desktop',
      },
    });
  }

  private async saveSnapshot(
    projectId: string,
    keywordId: string,
    collection: NormalizedSerpCollection,
  ) {
    const snapshot = await this.prisma.serpSnapshot.create({
      data: {
        projectId,
        keywordId,
        provider: collection.provider,
        rawResponse: collection.rawResponse,
        requestDurationMs: collection.requestDurationMs,
        totalResults: collection.totalResults,
        organicResultsCount: collection.organicResultsCount,
        resultTypes: collection.resultTypes,
        status: collection.status,
        errorMessage: collection.errorMessage,
        results: {
          create: collection.results.map((item) => ({
            position: item.position,
            rankGroup: item.rankGroup,
            rankAbsolute: item.rankAbsolute,
            xpath: item.xpath,
            itemType: item.itemType,
            url: item.url,
            domain: item.domain,
            title: item.title,
            description: item.snippet,
            snippet: item.snippet,
            breadcrumb: item.breadcrumb,
            isFeatured: item.isFeatured,
            isPaid: item.isPaid,
            sitelinks: item.sitelinks?.length
              ? JSON.stringify(item.sitelinks)
              : undefined,
          })),
        },
      },
      include: { keyword: true, results: { orderBy: { position: 'asc' } } },
    });

    for (const result of snapshot.results.filter((item) => item.url)) {
      await this.prisma.page.upsert({
        where: { projectId_url: { projectId, url: result.url as string } },
        update: { title: result.title ?? undefined },
        create: {
          projectId,
          url: result.url as string,
          domain: result.domain ?? '',
          title: result.title,
        },
      });
    }

    return snapshot;
  }

  private saveFailedSnapshot(
    projectId: string,
    keywordId: string,
    error: unknown,
  ) {
    return this.prisma.serpSnapshot.create({
      data: {
        projectId,
        keywordId,
        provider: 'dataforseo',
        status: 'failed',
        errorMessage: messageOf(error),
        organicResultsCount: 0,
        resultTypes: [],
      },
      include: { keyword: true, results: true },
    });
  }

  private async ensureProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private async ensureProjectExistsForDevelopment(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private assertValidExtractedUrl(url: string) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Unsupported protocol');
      }
    } catch {
      throw new BadGatewayException(`Invalid extracted organic URL: ${url}`);
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unknown SERP collection error';
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function safeJson(value: unknown, maxLength: number) {
  try {
    return JSON.stringify(value).slice(0, maxLength);
  } catch {
    return '[unserializable]';
  }
}

function crawlQualityIssue(
  page: Awaited<ReturnType<CrawlService['testUrl']>>,
): string | null {
  const text = `${page.title}\n${page.markdown}`.toLowerCase();

  if (page.wordCount < 250) {
    return `too little crawlable content wordCount=${page.wordCount}`;
  }

  if (
    /attention required|cloudflare|verify you are human|access denied|enable javascript|captcha/.test(
      text,
    )
  ) {
    return 'bot protection or challenge page detected';
  }

  return null;
}
