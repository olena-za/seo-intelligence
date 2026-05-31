import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CompetitorIntelligenceService } from '../competitor-intelligence/competitor-intelligence.service';

@Injectable()
export class WeeklySnapshotsService {
  private readonly logger = new Logger(WeeklySnapshotsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly competitorIntelligence: CompetitorIntelligenceService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async runWeeklySnapshots() {
    if (process.env.WEEKLY_SNAPSHOTS_ENABLED !== 'true') {
      return;
    }

    const latestKeywords = await this.prisma.keywordSnapshot.findMany({
      distinct: ['keyword', 'locationCode', 'languageCode', 'device'],
      orderBy: { capturedAt: 'desc' },
      take: Number(process.env.WEEKLY_SNAPSHOT_KEYWORD_LIMIT ?? 25),
    });

    this.logger.log(
      `[WeeklySnapshots] Starting scheduled run count=${latestKeywords.length}`,
    );

    for (const keyword of latestKeywords) {
      try {
        await this.competitorIntelligence.createKeywordSnapshot({
          keyword: keyword.keyword,
          locationCode: keyword.locationCode,
          languageCode: keyword.languageCode,
          device: keyword.device,
          limit: 10,
        });
      } catch (error) {
        this.logger.error(
          `[WeeklySnapshots] Failed keyword="${keyword.keyword}" error=${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
