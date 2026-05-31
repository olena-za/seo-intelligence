import { Module } from '@nestjs/common';
import { CronJobsService } from './cron-jobs.service';
import { SerpModule } from '../modules/serp/serp.module';

@Module({
  imports: [SerpModule],
  providers: [CronJobsService],
})
export class CronJobsModule {}
