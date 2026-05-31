import { Body, Controller, Logger, Post } from '@nestjs/common';
import { AnalysisReportService } from './analysis-report.service';
import { TestReportDto } from './dto/test-report.dto';

@Controller('analysis')
export class AnalysisReportController {
  private readonly logger = new Logger(AnalysisReportController.name);

  constructor(private readonly reports: AnalysisReportService) {}

  @Post('test-report')
  async testReport(@Body() dto: TestReportDto) {
    this.logger.log(
      `[Report] Incoming test report request keyword="${dto.keyword}"`,
    );
    return this.reports.generateTestReport(dto.keyword);
  }
}
