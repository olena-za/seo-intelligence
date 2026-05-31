import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompetitorsService } from './competitors.service';
import { CompetitorsController } from './competitors.controller';

@Module({
  imports: [AuthModule],
  providers: [CompetitorsService],
  controllers: [CompetitorsController],
})
export class CompetitorsModule {}
