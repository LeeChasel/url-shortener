import { Injectable } from '@nestjs/common';
import {
  BullRootModuleOptions,
  SharedBullConfigurationFactory,
} from '@nestjs/bullmq';
import { ConfigService } from '../config/config.service';

@Injectable()
export class BullConfigService implements SharedBullConfigurationFactory {
  constructor(private readonly configService: ConfigService) {}

  createSharedConfiguration(): BullRootModuleOptions {
    return {
      connection: {
        url: this.configService.get('REDIS_URL'),
      },
    };
  }
}
