import { Global, Module } from '@nestjs/common';
import { ConfigModule as OfficialConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import configuration from './configuration';

@Global()
@Module({
  imports: [
    OfficialConfigModule.forRoot({
      load: [configuration],
      cache: true,
      expandVariables: true,
    }),
  ],
  controllers: [],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
