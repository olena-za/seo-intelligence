import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export type ApiResponse<T> = {
  data: T;
  meta: {
    path: string;
    timestamp: string;
  };
};

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { url: string }>();

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          path: request.url,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
