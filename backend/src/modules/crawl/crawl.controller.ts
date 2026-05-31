import { Body, Controller, Get, Post } from '@nestjs/common';
import { CrawlService } from './crawl.service';
import { TestUrlDto } from './dto/test-url.dto';

@Controller('crawl')
export class CrawlController {
  constructor(private readonly crawlService: CrawlService) {}

  @Get('providers/status')
  providerStatus() {
    return this.crawlService.providerStatus();
  }

  @Post('test-url')
  testUrl(@Body() dto: TestUrlDto) {
    return this.crawlService.testUrl(dto.url);
  }
}
