import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly appConfig: AppConfigService) {}

  use(
    request: Request & { userId?: string },
    _response: Response,
    next: NextFunction,
  ) {
    // Auth enforcement happens in JwtAuthGuard on protected controllers.
    // This middleware remains as the future provider-agnostic request context hook.
    next();
  }
}
