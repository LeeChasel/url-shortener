import { Global, Module } from '@nestjs/common';
import { CacheModule as OfficialCacheModule } from '@nestjs/cache-manager';
import { CacheConfigService } from './cache.service';
import { ConfigModule } from '../config/config.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    OfficialCacheModule.registerAsync({
      useClass: CacheConfigService,
      isGlobal: true,
    }),
  ],
})
export class CacheModule {}
