import { Module } from '@nestjs/common';
import { CacheModule, ConfigModule, PrismaModule, LoggerModule } from './libs';
import { UrlModule } from './url';
import { RedirectModule } from './redirect';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    // libs
    ConfigModule,
    PrismaModule,
    CacheModule,
    LoggerModule,

    // features
    UrlModule,

    SchedulerModule,
    // place at the end
    RedirectModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
