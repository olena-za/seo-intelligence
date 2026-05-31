import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtUser } from './types/auth.types';
import { DEVELOPMENT_PUBLIC_ROUTE } from './development-public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isDevelopmentPublic = this.reflector.getAllAndOverride<boolean>(
      DEVELOPMENT_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );

    if (isDevelopmentPublic && process.env.NODE_ENV === 'development') {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtUser }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      request.user = await this.jwtService.verifyAsync<JwtUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
