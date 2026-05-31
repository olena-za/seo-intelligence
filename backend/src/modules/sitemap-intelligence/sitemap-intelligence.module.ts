import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EntityNormalizationService } from '../entity-normalization/entity-normalization.service';
import { SitemapIntelligenceController } from './sitemap-intelligence.controller';
import { SitemapIntelligenceService } from './sitemap-intelligence.service';
import { SitemapParserService } from './sitemap-parser.service';

@Module({
  imports: [PrismaModule],
  controllers: [SitemapIntelligenceController],
  providers: [
    SitemapIntelligenceService,
    SitemapParserService,
    EntityNormalizationService,
  ],
  exports: [SitemapIntelligenceService],
})
export class SitemapIntelligenceModule {}
