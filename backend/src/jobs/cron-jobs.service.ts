import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SerpService } from '../modules/serp/serp.service';

@Injectable()
export class CronJobsService {
  private readonly logger = new Logger(CronJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serpService: SerpService,
  ) {}

  /**
   * Runs every 6 hours to collect SERP data for all keywords in active projects
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async collectSerpData() {
    this.logger.log('Starting scheduled SERP collection...');

    try {
      const projects = await this.prisma.project.findMany({
        include: { keywords: true },
      });

      for (const project of projects) {
        for (const keyword of project.keywords) {
          try {
            await this.serpService.collectSerpData(project.id, keyword.id);
            this.logger.log(`SERP collected for keyword: ${keyword.keyword}`);
          } catch (error) {
            this.logger.error(
              `Failed to collect SERP for keyword ${keyword.keyword}:`,
              error,
            );
          }
        }
      }

      this.logger.log('SERP collection job completed');
    } catch (error) {
      this.logger.error('SERP collection job failed:', error);
    }
  }

  /**
   * Runs every 12 hours to perform maintenance tasks
   */
  @Cron(CronExpression.EVERY_12_HOURS)
  async maintenanceTasks() {
    this.logger.log('Starting maintenance tasks...');

    try {
      // Clean up old job entries
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await this.prisma.queuedJob.deleteMany({
        where: {
          status: 'completed',
          createdAt: { lt: thirtyDaysAgo },
        },
      });

      this.logger.log('Maintenance tasks completed');
    } catch (error) {
      this.logger.error('Maintenance tasks failed:', error);
    }
  }
}
