import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CrawlService } from '../crawl/crawl.service';
import { SerpService } from '../serp/serp.service';

type TestSerpResult = {
  title: string | null;
  url: string | null;
  domain: string | null;
  snippet: string | null;
  rank: number;
  item_type: string;
};

type TestSerpResponse = {
  keyword: string;
  provider: string;
  status: string;
  requestDurationMs: number;
  totalResults: number;
  organicResultsCount: number;
  resultTypes: string[];
  results: TestSerpResult[];
};

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly serpService: SerpService,
    private readonly crawlService: CrawlService,
  ) {}

  async testSerpCrawl(keyword: string) {
    this.logger.log(
      '[Pipeline] Delegating to /serp/test-keyword pipeline flow...',
    );
    return this.serpService.testKeyword({ keyword });
  }

  async testSerpCrawlLegacy(keyword: string) {
    const startedAt = Date.now();
    this.logger.log('[Pipeline] Starting SERP fetch...');

    const serp = (await this.serpService.testKeyword({
      keyword,
    })) as unknown as TestSerpResponse;

    if (!serp || !Array.isArray(serp.results)) {
      throw new BadGatewayException('Invalid SERP response');
    }

    this.logger.log(
      `[Pipeline] SERP completed... totalResults=${serp.totalResults} organicResults=${serp.organicResultsCount}`,
    );

    const organicResults = serp.results.filter(
      (result) => result.item_type === 'organic' && result.url,
    );

    if (organicResults.length === 0) {
      throw new BadGatewayException('No organic results found for keyword');
    }

    let lastCrawlError: unknown;

    for (const organicResult of organicResults) {
      const topUrl = organicResult.url as string;
      this.assertValidExtractedUrl(topUrl);
      this.logger.log(`[Pipeline] Extracted URL... url=${topUrl}`);
      this.logger.log('[Pipeline] Starting crawl...');

      try {
        const crawl = await this.crawlService.testUrl(topUrl);
        this.logger.log(
          `[Pipeline] Crawl completed... url=${topUrl} wordCount=${crawl.wordCount}`,
        );

        const totalDurationMs = Date.now() - startedAt;
        this.logger.log(
          `[Pipeline] Pipeline completed... durationMs=${totalDurationMs}`,
        );

        return {
          keyword,
          serp: {
            provider: serp.provider,
            requestDurationMs: serp.requestDurationMs,
            totalResults: serp.totalResults,
            organicResultsCount: serp.organicResultsCount,
            topUrl,
          },
          crawl: {
            url: crawl.url,
            title: crawl.title,
            status: crawl.status,
            wordCount: crawl.wordCount,
            markdownPreview: crawl.markdown.slice(0, 1000),
          },
          pipeline: {
            status: 'success',
            totalDurationMs,
          },
        };
      } catch (error) {
        lastCrawlError = error;
        this.logger.error(
          `[Pipeline] Crawl failed... url=${topUrl} error=${messageOf(error)}`,
        );
      }
    }

    if (messageOf(lastCrawlError).toLowerCase().includes('timed out')) {
      throw new ServiceUnavailableException(
        'Crawl timeout while fetching organic results',
      );
    }

    throw new ServiceUnavailableException(
      `Firecrawl failed for all valid organic result URLs: ${messageOf(lastCrawlError)}`,
    );
  }

  private assertValidExtractedUrl(url: string) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Unsupported URL protocol');
      }
    } catch {
      throw new BadRequestException('Invalid extracted organic result URL');
    }
  }
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
