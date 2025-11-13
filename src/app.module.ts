import { Module } from '@nestjs/common';
import { CacheModule, ConfigModule, PrismaModule } from './libs';

@Module({
  imports: [
    //
    ConfigModule,
    PrismaModule,
    CacheModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
