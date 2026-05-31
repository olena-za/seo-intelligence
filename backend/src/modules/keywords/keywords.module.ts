import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { KeywordsService } from './keywords.service';
import { KeywordsController } from './keywords.controller';

@Module({
  imports: [AuthModule],
  providers: [KeywordsService],
  controllers: [KeywordsController],
})
export class KeywordsModule {}
