import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './core/http/http-exception.filter';
import { ApiResponseInterceptor } from './core/http/api-response.interceptor';
import { AppConfigService } from './core/config/app-config.service';
import { AppLoggerService } from './core/logging/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(AppLoggerService);
  app.useLogger(logger);
  const appConfig = app.get(AppConfigService);
  app.enableCors({
    origin: appConfig.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  const port = appConfig.port;
  await app.listen(port, '0.0.0.0');
  logger.log(`API listening on port ${port}`);
}
bootstrap();
