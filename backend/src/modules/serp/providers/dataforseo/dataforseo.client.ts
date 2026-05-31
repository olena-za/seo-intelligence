import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import type { SerpProvider } from '../../interfaces/serp-provider.interface';
import { DataForSeoMapper } from './dataforseo.mapper';
import type {
  DataForSeoResponse,
  NormalizedSerpCollection,
  SerpCollectionRequest,
} from './dataforseo.types';

@Injectable()
export class DataForSeoClient implements SerpProvider {
  private readonly logger = new Logger(DataForSeoClient.name);
  private readonly baseUrl =
    'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';
  private activeRequests = 0;
  private lastRequestAt = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly mapper: DataForSeoMapper,
  ) {}

  async collectOrganicSerp(
    request: SerpCollectionRequest,
  ): Promise<NormalizedSerpCollection> {
    await this.throttle();
    const startedAt = Date.now();
    this.logger.log(
      `[SERP] Starting collection keyword="${request.keyword}" provider=dataforseo`,
    );

    try {
      const response = await this.withRetry(() => this.sendRequest(request));
      const duration = Date.now() - startedAt;
      this.logger.log(
        `[SERP] Response received provider=dataforseo durationMs=${duration}`,
      );
      this.validateResponse(response.data);
      const normalized = this.normalizeResults(response.data, duration);
      this.logger.log(
        `[SERP] ${normalized.organicResultsCount} organic results normalized`,
      );
      return normalized;
    } catch (error) {
      const duration = Date.now() - startedAt;
      this.logger.error(
        `[SERP] Collection failed provider=dataforseo durationMs=${duration} error=${messageOf(error)}`,
      );
      throw error;
    } finally {
      this.activeRequests = Math.max(0, this.activeRequests - 1);
    }
  }

  normalizeResults(response: unknown, requestDurationMs: number) {
    return this.mapper.normalize(
      response as DataForSeoResponse,
      requestDurationMs,
    );
  }

  validateResponse(response: unknown): void {
    const payload = response as DataForSeoResponse;

    if (!payload || typeof payload !== 'object') {
      throw new BadGatewayException('Malformed DataForSEO response');
    }

    if (!payload.tasks?.length) {
      throw new BadGatewayException('DataForSEO response contained no tasks');
    }

    const task = payload.tasks[0];
    if (payload.status_code && payload.status_code >= 40000) {
      throw this.mapDataForSeoError(
        payload.status_code,
        payload.status_message,
      );
    }

    if (task.status_code && task.status_code >= 40000) {
      throw this.mapDataForSeoError(task.status_code, task.status_message);
    }

    if (!task.result?.length) {
      throw new BadGatewayException('DataForSEO task contained no result');
    }
  }

  async status() {
    const configured = Boolean(this.login && this.password);
    if (!configured) {
      return {
        provider: 'dataforseo',
        configured,
        credentialsValid: false,
        reachable: false,
      };
    }

    try {
      await this.withRetry(
        () =>
          axios.get('https://api.dataforseo.com/v3/appendix/user_data', {
            timeout: 15000,
            headers: { Authorization: this.authorizationHeader },
          }),
        1,
      );

      return {
        provider: 'dataforseo',
        configured,
        credentialsValid: true,
        reachable: true,
      };
    } catch (error) {
      const status = (error as AxiosError).response?.status;
      return {
        provider: 'dataforseo',
        configured,
        credentialsValid: status !== 401,
        reachable: Boolean(status),
      };
    }
  }

  private async sendRequest(request: SerpCollectionRequest) {
    this.logger.log('[SERP] Request sent to DataForSEO');
    return axios.post(
      this.baseUrl,
      [
        {
          keyword: request.keyword,
          location_code: request.locationCode ?? 2840,
          language_code: request.languageCode ?? 'en',
          device: request.device ?? 'desktop',
          depth: request.depth ?? 10,
        },
      ],
      {
        timeout: 30000,
        headers: {
          Authorization: this.authorizationHeader,
          'Content-Type': 'application/json',
        },
      },
    );
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
        if (!this.shouldRetry(error) || attempt >= maxAttempts) break;
        const delayMs = 500 * 2 ** (attempt - 1);
        this.logger.warn(
          `[SERP] Retry scheduled attempt=${attempt + 1} delayMs=${delayMs} error=${messageOf(error)}`,
        );
        await sleep(delayMs);
      }
    }

    throw this.normalizeRequestError(lastError);
  }

  private shouldRetry(error: unknown) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    return (
      !status ||
      status === 429 ||
      status >= 500 ||
      axiosError.code === 'ECONNABORTED'
    );
  }

  private normalizeRequestError(error: unknown) {
    const status = (error as AxiosError).response?.status;
    if (status === 401 || status === 403)
      return new UnauthorizedException('Invalid DataForSEO credentials');
    if (status === 429)
      return new HttpException(
        'DataForSEO rate limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    if (status && status >= 500)
      return new BadGatewayException('DataForSEO service error');
    if ((error as AxiosError).code === 'ECONNABORTED')
      return new ServiceUnavailableException('DataForSEO request timed out');
    return error instanceof Error
      ? error
      : new BadGatewayException('DataForSEO request failed');
  }

  private mapDataForSeoError(code: number, message?: string) {
    if ([40100, 40200, 40201, 40300].includes(code))
      return new UnauthorizedException(
        message ?? 'DataForSEO authentication failed',
      );
    if ([40205, 40206].includes(code))
      return new HttpException(
        message ?? 'DataForSEO billing issue',
        HttpStatus.PAYMENT_REQUIRED,
      );
    if ([40209].includes(code))
      return new HttpException(
        message ?? 'DataForSEO rate limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    return new BadGatewayException(message ?? 'DataForSEO returned an error');
  }

  private async throttle() {
    const maxConcurrent = Number(
      this.config.get('serpMaxConcurrentRequests') ?? 3,
    );
    const delayMs = Number(this.config.get('serpRequestDelayMs') ?? 300);

    while (this.activeRequests >= maxConcurrent) {
      await sleep(delayMs);
    }

    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < delayMs) {
      await sleep(delayMs - elapsed);
    }

    this.activeRequests += 1;
    this.lastRequestAt = Date.now();
  }

  private get login() {
    return this.config.get<string>('dataForSeoLogin') ?? '';
  }

  private get password() {
    return this.config.get<string>('dataForSeoPassword') ?? '';
  }

  private get authorizationHeader() {
    return `Basic ${Buffer.from(`${this.login}:${this.password}`).toString('base64')}`;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
