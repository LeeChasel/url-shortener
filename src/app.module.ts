import { Module } from '@nestjs/common';
import { CacheModule, ConfigModule, PrismaModule, LoggerModule } from './libs';
import { UrlModule } from './url';
import { RedirectModule } from './redirect';

@Module({
  imports: [
    // libs
    ConfigModule,
    PrismaModule,
    CacheModule,
    LoggerModule,

    // features
    UrlModule,

    // place at the end
    RedirectModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
