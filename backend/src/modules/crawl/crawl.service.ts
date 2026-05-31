import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

type FirecrawlScrapeResponse = {
  success?: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: Record<string, unknown>;
  };
  error?: string;
};

@Injectable()
export class CrawlService {
  private readonly logger = new Logger(CrawlService.name);
  private readonly scrapeUrl = 'https://api.firecrawl.dev/v1/scrape';

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async providerStatus() {
    const hasApiKey = Boolean(this.apiKey);

    if (!hasApiKey) {
      return {
        provider: 'firecrawl',
        configured: false,
        reachable: false,
      };
    }

    try {
      await firstValueFrom(
        this.httpService.get('https://api.firecrawl.dev', {
          timeout: 10000,
          validateStatus: () => true,
        }),
      );

      return {
        provider: 'firecrawl',
        configured: true,
        reachable: true,
      };
    } catch {
      return {
        provider: 'firecrawl',
        configured: true,
        reachable: false,
      };
    }
  }

  async testUrl(url: string) {
    this.assertValidUrl(url);
    this.assertConfigured();
    this.logger.log(`[CrawlService] Fetching URL... url=${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<FirecrawlScrapeResponse>(
          this.scrapeUrl,
          {
            url,
            formats: ['markdown'],
            onlyMainContent: true,
          },
          {
            timeout: 45000,
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const payload = response.data;
      this.logger.debug(
        `[CrawlService] Firecrawl raw response... ${safeJson(payload, 4000)}`,
      );

      if (payload?.success === false) {
        throw new BadGatewayException(
          payload.error || 'Firecrawl failed to fetch URL',
        );
      }

      const data = payload?.data ?? {};
      const markdown = data.markdown ?? '';
      const metadata = data.metadata ?? {};
      const title =
        stringValue(metadata.title) ?? extractMarkdownTitle(markdown) ?? '';
      const wordCount = countWords(markdown);

      this.logger.log(
        `[CrawlService] Success... url=${url} wordCount=${wordCount}`,
      );

      return {
        url,
        title,
        markdown,
        metadata,
        wordCount,
        status: 'success',
      };
    } catch (error) {
      this.logger.error(
        `[CrawlService] Failed... url=${url} error=${messageOf(error)}`,
      );
      throw this.normalizeError(error);
    }
  }

  private assertValidUrl(url: string) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Unsupported protocol');
      }
    } catch {
      throw new BadRequestException(
        'Invalid URL. Provide a full http or https URL.',
      );
    }
  }

  private assertConfigured() {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'FIRECRAWL_API_KEY is not configured',
      );
    }
  }

  private normalizeError(error: unknown) {
    if (error instanceof HttpException) {
      return error;
    }

    const axiosError = error as AxiosError<{
      error?: string;
      message?: string;
    }>;
    const status = axiosError.response?.status;
    const providerMessage =
      axiosError.response?.data?.error || axiosError.response?.data?.message;

    if (status === 400) {
      return new BadRequestException(
        providerMessage || 'Firecrawl rejected the URL',
      );
    }

    if (status === 401 || status === 403) {
      return new HttpException(
        providerMessage || 'Firecrawl authentication failed',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (status === 429) {
      return new HttpException(
        providerMessage || 'Firecrawl rate limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (axiosError.code === 'ECONNABORTED') {
      return new ServiceUnavailableException('Firecrawl request timed out');
    }

    return new BadGatewayException(
      providerMessage || 'Firecrawl API request failed',
    );
  }

  private get apiKey() {
    return this.config.get<string>('firecrawlApiKey') ?? '';
  }
}

function countWords(markdown: string) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text ? text.split(/\s+/).length : 0;
}

function extractMarkdownTitle(markdown: string) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function safeJson(value: unknown, maxLength: number) {
  try {
    return JSON.stringify(value).slice(0, maxLength);
  } catch {
    return '[unserializable]';
  }
}
