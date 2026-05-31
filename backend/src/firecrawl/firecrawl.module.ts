import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { FirecrawlService } from './firecrawl.service';

@Module({
  imports: [HttpModule],
  providers: [FirecrawlService],
  exports: [FirecrawlService],
})
export class FirecrawlModule {}
