import { Module } from '@nestjs/common';
import {
  CacheModule,
  ConfigModule,
  PrismaModule,
  LoggerModule,
  QueueModule,
} from './libs';
import { UrlModule } from './url';
import { RedirectModule } from './redirect';
import { SchedulerModule } from './scheduler/scheduler.module';
import { MetadataModule } from './metadata';

@Module({
  imports: [
    // libs
    ConfigModule,
    PrismaModule,
    CacheModule,
    LoggerModule,
    QueueModule,

    // features
    UrlModule,
    MetadataModule,

    SchedulerModule,
    // place at the end
    RedirectModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
