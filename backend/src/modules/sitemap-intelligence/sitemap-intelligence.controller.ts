import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CollectSitemapDto } from './dto/collect-sitemap.dto';
import { SitemapIntelligenceService } from './sitemap-intelligence.service';

@Controller('sitemap-intelligence')
export class SitemapIntelligenceController {
  constructor(
    private readonly sitemapIntelligence: SitemapIntelligenceService,
  ) {}

  @Post('snapshots')
  collect(@Body() dto: CollectSitemapDto) {
    return this.sitemapIntelligence.collect(dto);
  }

  @Get('snapshots')
  latest(@Query('limit') limit?: string) {
    return this.sitemapIntelligence.latest(limit ? Number(limit) : 10);
  }

  @Get('snapshots/:id')
  async get(@Param('id') id: string) {
    const snapshot = await this.sitemapIntelligence.get(id);
    if (!snapshot) throw new NotFoundException('Sitemap snapshot not found');
    return snapshot;
  }
}
