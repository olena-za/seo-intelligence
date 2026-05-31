import { Module } from '@nestjs/common';
import { FirecrawlModule } from '../../firecrawl/firecrawl.module';
import { SeoAnalysisModule } from '../analysis/seo-analysis.module';
import { AuthModule } from '../auth/auth.module';
import { PageSnapshotsService } from './page-snapshots.service';
import { PageSnapshotsController } from './page-snapshots.controller';

@Module({
  imports: [AuthModule, FirecrawlModule, SeoAnalysisModule],
  providers: [PageSnapshotsService],
  controllers: [PageSnapshotsController],
})
export class PageSnapshotsModule {}
