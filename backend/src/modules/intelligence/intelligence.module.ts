import { Module } from '@nestjs/common';
import { AiModule } from '../../ai/ai.module';
import { DataForSeoModule } from '../../dataforseo/dataforseo.module';
import { FirecrawlModule } from '../../firecrawl/firecrawl.module';
import { AuthModule } from '../auth/auth.module';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';

@Module({
  imports: [AuthModule, AiModule, DataForSeoModule, FirecrawlModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService],
})
export class IntelligenceModule {}
