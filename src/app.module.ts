import { Module } from '@nestjs/common';
import { CacheModule, ConfigModule, PrismaModule, LoggerModule } from './libs';

@Module({
  imports: [
    // libs
    ConfigModule,
    PrismaModule,
    CacheModule,
    LoggerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
