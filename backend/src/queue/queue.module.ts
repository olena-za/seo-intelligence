import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

@Module({
  imports: [BullModule.registerQueue({ name: 'seo-analysis' })],
  exports: [BullModule],
})
export class QueueModule {}
