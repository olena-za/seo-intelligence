import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CompetitorIntelligenceModule } from '../competitor-intelligence/competitor-intelligence.module';
import { WeeklySnapshotsService } from './weekly-snapshots.service';

@Module({
  imports: [PrismaModule, CompetitorIntelligenceModule],
  providers: [WeeklySnapshotsService],
})
export class WeeklySnapshotsModule {}
