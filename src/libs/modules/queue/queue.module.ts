import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullConfigService } from './queue.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      useClass: BullConfigService,
    }),
  ],
})
export class QueueModule {}
