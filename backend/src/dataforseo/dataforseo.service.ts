import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export interface SerpResult {
  position: number;
  url: string;
  domain: string;
  title: string;
  description?: string;
  snippet?: string;
  sitelinks?: string[];
}

@Injectable()
export class DataForSeoService {
  private readonly logger = new Logger(DataForSeoService.name);
  private readonly login: string;
  private readonly password: string;
  private readonly baseUrl =
    'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';

  constructor(private readonly config: ConfigService) {
    this.login = this.config.get<string>('dataForSeoLogin') || '';
    this.password = this.config.get<string>('dataForSeoPassword') || '';
  }

  async fetchSerpResults(keyword: string): Promise<SerpResult[]> {
    if (!this.login || !this.password) {
      throw new BadGatewayException(
        'DataForSEO credentials are not configured',
      );
    }

    const credentials = Buffer.from(`${this.login}:${this.password}`).toString(
      'base64',
    );

    const response = await this.withRetry(() =>
      axios.post(
        this.baseUrl,
        [
          {
            keyword,
            location_code: 2840,
            language_code: 'en',
            depth: 10,
          },
        ],
        {
          timeout: 30000,
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const task = response.data?.tasks?.[0];
    const results = task?.result?.[0]?.items ?? [];

    if (task?.status_code && task.status_code >= 40000) {
      throw new BadGatewayException(
        task.status_message || 'DataForSEO returned an error',
      );
    }

    const parsed: SerpResult[] = results
      .filter((item) => item.type === 'organic' && item.url)
      .map((item) => ({
        position: item.rank_group ?? item.rank_absolute ?? 0,
        url: item.url ?? '',
        domain: this.extractDomain(item.url ?? ''),
        title: item.title ?? '',
        description: item.description ?? '',
        snippet: item.description ?? '',
        sitelinks: item.sitelinks?.map((link) => link.title) ?? [],
      }));

    this.logger.log(
      `Fetched ${parsed.length} SERP results for keyword: ${keyword}`,
    );
    return parsed;
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
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
            'DataForSEO rate limit reached',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        if (
          attempt >= maxAttempts ||
          (status && status < 500 && status !== 429)
        ) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    this.logger.error(`Failed to fetch SERP results: ${lastError}`);
    throw new BadGatewayException('DataForSEO request failed');
  }

  private extractDomain(url: string): string {
    try {
      const { hostname } = new URL(url);
      return hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }
}
