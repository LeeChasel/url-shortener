import { Module } from '@nestjs/common';
import { CacheModule, ConfigModule, PrismaModule, LoggerModule } from './libs';
import { UrlModule } from './url/url.module';

@Module({
  imports: [
    // libs
    ConfigModule,
    PrismaModule,
    CacheModule,
    LoggerModule,

    // features
    UrlModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
