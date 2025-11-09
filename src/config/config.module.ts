import { Module } from '@nestjs/common';
import { ConfigModule as OfficialConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import configuration from './configuration';

@Module({
  imports: [
    OfficialConfigModule.forRoot({
      load: [configuration],
      isGlobal: false,
      cache: true,
      expandVariables: true,
    }),
  ],
  controllers: [],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
