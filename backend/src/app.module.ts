import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { KeywordsModule } from './modules/keywords/keywords.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SerpModule } from './modules/serp/serp.module';
import { FirecrawlModule } from './firecrawl/firecrawl.module';
import { DataForSeoModule } from './dataforseo/dataforseo.module';
import { AiModule } from './ai/ai.module';
import { CompetitorsModule } from './modules/competitors/competitors.module';
import { CompetitorIntelligenceModule } from './modules/competitor-intelligence/competitor-intelligence.module';
import { PagesModule } from './modules/snapshots/pages/pages.module';
import { PageSnapshotsModule } from './modules/snapshots/page-snapshots.module';
import { QueueModule } from './queue/queue.module';
import { SeoAnalysisModule } from './modules/analysis/seo-analysis.module';
import { AnalysisControllerModule } from './modules/analysis/analysis-controller.module';
import { CronJobsModule } from './jobs/cron-jobs.module';
import configuration from './core/config/configuration';
import { validationSchema } from './core/config/validation.schema';
import { AppConfigService } from './core/config/app-config.service';
import { AppLoggerService } from './core/logging/app-logger.service';
import { RequestLoggingMiddleware } from './core/http/request-logging.middleware';
import { AuthMiddleware } from './core/auth/auth.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { CrawlModule } from './modules/crawl/crawl.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { SitemapIntelligenceModule } from './modules/sitemap-intelligence/sitemap-intelligence.module';
import { WeeklySnapshotsModule } from './modules/weekly-snapshots/weekly-snapshots.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CrawlModule,
    PipelineModule,
    IntelligenceModule,
    ProjectsModule,
    KeywordsModule,
    SerpModule,
    CompetitorsModule,
    CompetitorIntelligenceModule,
    SitemapIntelligenceModule,
    WeeklySnapshotsModule,
    PagesModule,
    PageSnapshotsModule,
    FirecrawlModule,
    DataForSeoModule,
    AiModule,
    SeoAnalysisModule,
    AnalysisControllerModule,
    CronJobsModule,
    QueueModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    AppConfigService,
    AppLoggerService,
    RequestLoggingMiddleware,
    AuthMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware, AuthMiddleware).forRoutes('*');
  }
}
