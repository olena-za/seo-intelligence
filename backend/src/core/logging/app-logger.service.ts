import { ConsoleLogger, Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLoggerService extends ConsoleLogger implements LoggerService {
  constructor() {
    super('SeoIntelligence');
  }
}
