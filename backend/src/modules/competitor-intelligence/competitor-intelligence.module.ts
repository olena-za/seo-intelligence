import { Module } from '@nestjs/common';
import { DataForSeoModule } from '../../dataforseo/dataforseo.module';
import { CrawlModule } from '../crawl/crawl.module';
import { DataForSeoClient } from '../serp/providers/dataforseo/dataforseo.client';
import { DataForSeoMapper } from '../serp/providers/dataforseo/dataforseo.mapper';
import { ResultQualityService } from '../quality/result-quality.service';
import { SnapshotDiffService } from '../snapshot-diff/snapshot-diff.service';
import { SerpVolatilityService } from '../serp-volatility/serp-volatility.service';
import { CompetitorIntelligenceController } from './competitor-intelligence.controller';
import { CompetitorIntelligenceService } from './competitor-intelligence.service';
import { FeatureExtractorService } from './feature-extractor.service';

@Module({
  imports: [CrawlModule, DataForSeoModule],
  controllers: [CompetitorIntelligenceController],
  providers: [
    CompetitorIntelligenceService,
    FeatureExtractorService,
    ResultQualityService,
    SnapshotDiffService,
    SerpVolatilityService,
    DataForSeoClient,
    DataForSeoMapper,
  ],
  exports: [CompetitorIntelligenceService],
})
export class CompetitorIntelligenceModule {}
