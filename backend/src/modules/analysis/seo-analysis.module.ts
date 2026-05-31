import { Module } from '@nestjs/common';
import { SeoAnalysisService } from './seo-analysis.service';
import { KeywordIntelligenceService } from './keyword-intelligence.service';
import { SemanticAnalysisService } from './semantic-analysis.service';
import { EntityExtractionService } from './entity-extraction.service';
import { HistoricalDiffService } from './historical-diff.service';

@Module({
  providers: [
    SeoAnalysisService,
    KeywordIntelligenceService,
    SemanticAnalysisService,
    EntityExtractionService,
    HistoricalDiffService,
  ],
  exports: [
    SeoAnalysisService,
    KeywordIntelligenceService,
    SemanticAnalysisService,
    EntityExtractionService,
    HistoricalDiffService,
  ],
})
export class SeoAnalysisModule {}
