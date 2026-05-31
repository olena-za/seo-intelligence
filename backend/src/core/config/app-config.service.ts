import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return this.configService.get<number>('port', 3000);
  }

  get nodeEnv(): string {
    return this.configService.get<string>('nodeEnv', 'development');
  }

  get corsOrigins(): string[] {
    return this.configService
      .get<string>('corsOrigins', 'http://localhost:3001')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get authEnabled(): boolean {
    return this.configService.get<boolean>('authEnabled', true);
  }
}
