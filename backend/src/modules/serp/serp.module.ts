import { Module } from '@nestjs/common';
import { DataForSeoModule } from '../../dataforseo/dataforseo.module';
import { AiModule } from '../../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { CrawlModule } from '../crawl/crawl.module';
import { SerpService } from './serp.service';
import { SerpController } from './serp.controller';
import { DataForSeoClient } from './providers/dataforseo/dataforseo.client';
import { DataForSeoMapper } from './providers/dataforseo/dataforseo.mapper';

@Module({
  imports: [AuthModule, AiModule, CrawlModule, DataForSeoModule],
  controllers: [SerpController],
  providers: [SerpService, DataForSeoClient, DataForSeoMapper],
  exports: [SerpService],
})
export class SerpModule {}
