import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DataForSeoService } from '../../dataforseo/dataforseo.service';
import { FirecrawlService } from '../../firecrawl/firecrawl.service';
import { OpenAIService } from '../../ai/openai.service';

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataForSeo: DataForSeoService,
    private readonly firecrawl: FirecrawlService,
    private readonly openai: OpenAIService,
  ) {}

  async runProjectKeyword(
    projectId: string,
    rawKeyword: string,
    userId: string,
  ) {
    const project = await this.ensureProject(projectId, userId);
    const keywordText = rawKeyword.trim().toLowerCase();
    const job = await this.createJob(projectId, { keyword: keywordText });

    try {
      await this.updateJob(job.id, 'processing');
      const keyword = await this.prisma.keyword.upsert({
        where: {
          projectId_keyword_locationCode_languageCode_device: {
            projectId,
            keyword: keywordText,
            locationCode: 2840,
            languageCode: 'en',
            device: 'desktop',
          },
        },
        update: {},
        create: {
          projectId,
          keyword: keywordText,
          locationCode: 2840,
          languageCode: 'en',
          device: 'desktop',
        },
      });

      const serpResults = await this.dataForSeo.fetchSerpResults(keywordText);

      if (serpResults.length === 0) {
        throw new BadGatewayException('DataForSEO returned an empty SERP');
      }

      const serpSnapshot = await this.prisma.serpSnapshot.create({
        data: {
          projectId,
          keywordId: keyword.id,
          provider: 'dataforseo',
          status: 'success',
          totalResults: serpResults.length,
          organicResultsCount: serpResults.length,
          resultTypes: ['organic'],
          results: {
            create: serpResults.map((result) => ({
              position: result.position,
              url: result.url,
              domain: result.domain,
              title: result.title,
              description: result.description,
              snippet: result.snippet ?? result.description,
              sitelinks: result.sitelinks?.length
                ? JSON.stringify(result.sitelinks)
                : undefined,
            })),
          },
        },
        include: {
          results: {
            orderBy: { position: 'asc' },
          },
        },
      });

      const crawledPages: unknown[] = [];
      for (const result of serpSnapshot.results
        .filter((item) => item.url)
        .slice(0, 5)) {
        const crawledPage = await this.crawlAndAnalyzeResult(
          project.id,
          keyword.id,
          keyword.keyword,
          result,
        );
        crawledPages.push(crawledPage);
      }

      await this.updateJob(job.id, 'completed');
      return {
        keyword,
        serpSnapshot,
        crawledPages: await this.prisma.crawledPage.findMany({
          where: { keywordId: keyword.id },
          orderBy: { position: 'asc' },
          take: 5,
          select: crawledPageSummarySelect,
        }),
      };
    } catch (error) {
      await this.updateJob(job.id, 'failed', error);
      this.logger.error(
        `Intelligence pipeline failed for project ${projectId}: ${error}`,
      );
      throw error;
    }
  }

  async getProjectIntelligence(projectId: string, userId: string) {
    await this.ensureProject(projectId, userId);

    const [keywords, serpSnapshots, crawledPages, analyses, jobs] =
      await Promise.all([
        this.prisma.keyword.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.prisma.serpSnapshot.findMany({
          where: { projectId },
          orderBy: { collectedAt: 'desc' },
          take: 10,
          include: {
            keyword: true,
            results: {
              orderBy: { position: 'asc' },
              take: 10,
            },
          },
        }),
        this.prisma.crawledPage.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
          take: 25,
          select: crawledPageSummarySelect,
        }),
        this.prisma.pageAnalysis.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' },
          take: 25,
          select: pageAnalysisSummarySelect,
        }),
        this.prisma.queuedJob.findMany({
          where: { projectId, jobType: 'seo_intelligence_pipeline' },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    return { keywords, serpSnapshots, crawledPages, analyses, jobs };
  }

  async getKeywordIntelligence(keywordId: string, userId: string) {
    const keyword = await this.prisma.keyword.findFirst({
      where: { id: keywordId, project: { userId } },
    });

    if (!keyword) {
      throw new NotFoundException('Keyword not found');
    }

    const [serpSnapshots, crawledPages, analyses] = await Promise.all([
      this.prisma.serpSnapshot.findMany({
        where: { keywordId },
        orderBy: { collectedAt: 'desc' },
        include: { results: { orderBy: { position: 'asc' } } },
      }),
      this.prisma.crawledPage.findMany({
        where: { keywordId },
        orderBy: { createdAt: 'desc' },
        select: crawledPageSummarySelect,
      }),
      this.prisma.pageAnalysis.findMany({
        where: { keywordId },
        orderBy: { createdAt: 'desc' },
        select: pageAnalysisSummarySelect,
      }),
    ]);

    return { keyword, serpSnapshots, crawledPages, analyses };
  }

  private async crawlAndAnalyzeResult(
    projectId: string,
    keywordId: string,
    keyword: string,
    result: SerpResultForPipeline,
  ) {
    if (!result.url) {
      throw new Error('SERP result has no URL to crawl');
    }

    const crawledPage = await this.prisma.crawledPage.create({
      data: {
        projectId,
        keywordId,
        serpResultId: result.id,
        status: 'processing',
        position: result.position,
        url: result.url,
        domain: result.domain,
        title: result.title,
        metaDescription: result.description,
        internalLinks: [],
      },
    });

    try {
      const extraction = await this.firecrawl.extractPage(result.url);
      const updatedPage = await this.prisma.crawledPage.update({
        where: { id: crawledPage.id },
        data: {
          status: 'completed',
          title: extraction.title ?? result.title,
          metaDescription: extraction.metaDescription ?? result.description,
          canonical: extraction.canonical,
          schema: extraction.schema as Prisma.InputJsonValue,
          headings: extraction.headings as Prisma.InputJsonValue,
          internalLinks: extraction.internalLinks,
          bodyContent: extraction.bodyContent,
          raw: extraction.raw as Prisma.InputJsonValue,
          crawledAt: new Date(),
        },
      });

      const analysis = await this.analyzePage(
        projectId,
        keywordId,
        keyword,
        updatedPage,
      );
      return { ...updatedPage, analysis };
    } catch (error) {
      const message = getErrorMessage(error);
      const failedPage = await this.prisma.crawledPage.update({
        where: { id: crawledPage.id },
        data: {
          status: 'failed',
          error: message,
          crawledAt: new Date(),
        },
      });

      await this.prisma.pageAnalysis.create({
        data: {
          projectId,
          keywordId,
          crawledPageId: failedPage.id,
          status: 'failed',
          error: message,
        },
      });

      this.logger.warn(
        `Crawl or analysis failed for ${result.url}: ${message}`,
      );
      return failedPage;
    }
  }

  private async analyzePage(
    projectId: string,
    keywordId: string,
    keyword: string,
    page: PageForAnalysis,
  ) {
    const analysis = await this.prisma.pageAnalysis.create({
      data: {
        projectId,
        keywordId,
        crawledPageId: page.id,
        status: 'processing',
      },
    });

    try {
      const result = await this.openai.analyzeSeoPage({
        keyword,
        url: page.url,
        title: page.title,
        metaDescription: page.metaDescription,
        headings: page.headings,
        bodyContent: page.bodyContent,
        canonical: page.canonical,
        schema: page.schema,
        internalLinks: page.internalLinks,
      });

      return this.prisma.pageAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: 'completed',
          summary: result.result.summary,
          scores: result.result.scores,
          gaps: result.result.contentGaps,
          opportunities: result.result.optimizationOpportunities,
          raw: result.result,
          tokensUsed: result.tokens,
          analyzedAt: new Date(),
        },
      });
    } catch (error) {
      return this.prisma.pageAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: 'failed',
          error: getErrorMessage(error),
        },
      });
    }
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

  private createJob(projectId: string, payload: Record<string, unknown>) {
    return this.prisma.queuedJob.create({
      data: {
        jobType: 'seo_intelligence_pipeline',
        status: 'pending',
        projectId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }

  private updateJob(id: string, status: string, error?: unknown) {
    return this.prisma.queuedJob.update({
      where: { id },
      data: {
        status,
        attempts: { increment: status === 'failed' ? 1 : 0 },
        error: error ? getErrorMessage(error) : undefined,
        processedAt:
          status === 'completed' || status === 'failed'
            ? new Date()
            : undefined,
      },
    });
  }
}

type SerpResultForPipeline = {
  id: string;
  position: number;
  url: string | null;
  domain: string | null;
  title: string | null;
  description: string | null;
};

type PageForAnalysis = {
  id: string;
  url: string;
  title: string | null;
  metaDescription: string | null;
  headings: unknown;
  bodyContent: string | null;
  canonical: string | null;
  schema: unknown;
  internalLinks: string[];
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown pipeline error';
}

const pageAnalysisSummarySelect = {
  id: true,
  projectId: true,
  keywordId: true,
  crawledPageId: true,
  status: true,
  error: true,
  summary: true,
  scores: true,
  gaps: true,
  opportunities: true,
  tokensUsed: true,
  analyzedAt: true,
  createdAt: true,
  updatedAt: true,
  keyword: true,
  crawledPage: {
    select: {
      id: true,
      url: true,
      domain: true,
      title: true,
      position: true,
      status: true,
    },
  },
} as const;

const crawledPageSummarySelect = {
  id: true,
  projectId: true,
  keywordId: true,
  serpResultId: true,
  status: true,
  error: true,
  position: true,
  url: true,
  domain: true,
  title: true,
  metaDescription: true,
  canonical: true,
  headings: true,
  internalLinks: true,
  crawledAt: true,
  createdAt: true,
  updatedAt: true,
  keyword: true,
  analysis: {
    select: {
      id: true,
      projectId: true,
      keywordId: true,
      crawledPageId: true,
      status: true,
      error: true,
      summary: true,
      scores: true,
      gaps: true,
      opportunities: true,
      tokensUsed: true,
      analyzedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;
