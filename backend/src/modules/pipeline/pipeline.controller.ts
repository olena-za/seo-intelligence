import { Body, Controller, Post } from '@nestjs/common';
import { TestSerpCrawlDto } from './dto/test-serp-crawl.dto';
import { PipelineService } from './pipeline.service';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post('test-serp-crawl')
  testSerpCrawl(@Body() dto: TestSerpCrawlDto) {
    return this.pipelineService.testSerpCrawl(dto.keyword);
  }
}
