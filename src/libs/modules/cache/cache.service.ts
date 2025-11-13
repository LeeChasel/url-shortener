import KeyvRedis from '@keyv/redis';
import { CacheOptionsFactory, CacheModuleOptions } from '@nestjs/cache-manager';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

@Injectable()
export class CacheConfigService implements CacheOptionsFactory {
  constructor(private readonly configService: ConfigService) {}
  createCacheOptions(): CacheModuleOptions {
    return {
      stores: [new KeyvRedis(this.configService.get('REDIS_URL'))],
    };
  }
}
