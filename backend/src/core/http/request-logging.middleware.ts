import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AppLoggerService } from '../logging/app-logger.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(request: Request, response: Response, next: NextFunction) {
    const start = Date.now();

    response.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.log(
        `${request.method} ${request.originalUrl} ${response.statusCode} ${duration}ms`,
      );
    });

    next();
  }
}
