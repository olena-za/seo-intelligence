import { Module } from '@nestjs/common';
import { CrawlModule } from '../crawl/crawl.module';
import { SerpModule } from '../serp/serp.module';
import { PipelineController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';

@Module({
  imports: [SerpModule, CrawlModule],
  controllers: [PipelineController],
  providers: [PipelineService],
})
export class PipelineModule {}
