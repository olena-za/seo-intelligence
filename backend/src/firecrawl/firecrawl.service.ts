import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export type FirecrawlExtraction = {
  title?: string;
  metaDescription?: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  bodyContent: string;
  canonical?: string;
  schema: unknown[];
  internalLinks: string[];
  markdown?: string;
  html?: string;
  raw: Record<string, unknown>;
};

@Injectable()
export class FirecrawlService {
  private readonly logger = new Logger(FirecrawlService.name);
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('firecrawlApiKey') || '';
  }

  async crawlUrl(url: string) {
    const payload = {
      url,
      formats: ['json', 'markdown', 'text'],
      includeHTML: true,
    };

    const response = await firstValueFrom(
      this.httpService.post('https://api.firecrawl.dev/v0/crawl', payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }),
    );

    this.logger.log(`Firecrawl crawl request completed for ${url}`);
    return {
      markdown: response.data?.markdown ?? '',
      text: response.data?.text ?? '',
      html: response.data?.html ?? '',
      metadata: response.data?.metadata ?? {},
      internal_links: response.data?.internal_links ?? [],
      external_links: response.data?.external_links ?? [],
      last_modified: response.data?.last_modified ?? new Date(),
    };
  }

  async extractPage(url: string): Promise<FirecrawlExtraction> {
    if (!this.apiKey) {
      throw new BadGatewayException('Firecrawl API key is not configured');
    }

    const payload = {
      url,
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      waitFor: 1000,
    };

    const response = await this.withRetry(() =>
      firstValueFrom(
        this.httpService.post('https://api.firecrawl.dev/v1/scrape', payload, {
          timeout: 45000,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      ),
    );

    const data = response.data?.data ?? response.data ?? {};
    const metadata = data.metadata ?? {};
    const markdown = data.markdown ?? '';
    const html = data.html ?? '';
    const bodyContent = data.text ?? markdownToText(markdown) ?? '';

    this.logger.log(`Firecrawl extraction completed for ${url}`);
    return {
      title: metadata.title ?? extractTitle(html),
      metaDescription: metadata.description ?? metadata.ogDescription,
      headings: extractHeadings(markdown, html),
      bodyContent,
      canonical: metadata.sourceURL ?? metadata.url ?? url,
      schema: extractJsonLd(html),
      internalLinks: extractInternalLinks(markdown, html, url),
      markdown,
      html,
      raw: data,
    };
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts = 2,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const status = (error as AxiosError).response?.status;

        if (status === 429 && attempt >= maxAttempts) {
          throw new HttpException(
            'Firecrawl rate limit reached',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        if (
          attempt >= maxAttempts ||
          (status && status < 500 && status !== 429)
        ) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
      }
    }

    this.logger.error(`Firecrawl extraction failed for page: ${lastError}`);
    throw new BadGatewayException('Firecrawl extraction failed');
  }
}

function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadings(markdown: string, html: string) {
  const fromMarkdown = (level: number) =>
    [...markdown.matchAll(new RegExp(`^#{${level}}\\s+(.+)$`, 'gim'))]
      .map((match) => match[1].trim())
      .filter(Boolean);

  const fromHtml = (tag: string) =>
    [...html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi'))]
      .map((match) => stripHtml(match[1]).trim())
      .filter(Boolean);

  return {
    h1: dedupe([...fromMarkdown(1), ...fromHtml('h1')]),
    h2: dedupe([...fromMarkdown(2), ...fromHtml('h2')]),
    h3: dedupe([...fromMarkdown(3), ...fromHtml('h3')]),
  };
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).trim() : undefined;
}

function extractJsonLd(html: string): unknown[] {
  return [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
    .map((match) => {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function extractInternalLinks(
  markdown: string,
  html: string,
  pageUrl: string,
): string[] {
  const base = new URL(pageUrl);
  const links = [
    ...[...markdown.matchAll(/\[[^\]]+]\((https?:\/\/[^)]+)\)/gi)].map(
      (match) => match[1],
    ),
    ...[...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]),
  ];

  return dedupe(
    links
      .map((link) => {
        try {
          return new URL(link, base.origin).toString();
        } catch {
          return '';
        }
      })
      .filter((link) => link && new URL(link).hostname === base.hostname),
  ).slice(0, 100);
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
