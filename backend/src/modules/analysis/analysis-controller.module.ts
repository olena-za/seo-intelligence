import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisReportController } from './analysis-report.controller';
import { AnalysisReportService } from './analysis-report.service';
import { SeoAnalysisModule } from './seo-analysis.module';
import { AuthModule } from '../auth/auth.module';
import { SerpModule } from '../serp/serp.module';

@Module({
  imports: [AuthModule, SeoAnalysisModule, SerpModule],
  controllers: [AnalysisController, AnalysisReportController],
  providers: [AnalysisReportService],
})
export class AnalysisControllerModule {}
