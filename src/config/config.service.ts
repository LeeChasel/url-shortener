import { Injectable } from '@nestjs/common';
import { ConfigService as OfficialConfigService } from '@nestjs/config';
import { ConfigSchema } from './configuration';

@Injectable()
export class ConfigService {
  constructor(
    private readonly configService: OfficialConfigService<ConfigSchema>,
  ) {}

  get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
    return this.configService.get(key)!;
  }
}
