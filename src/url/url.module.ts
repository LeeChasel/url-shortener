import { Module } from '@nestjs/common';
import { UrlsController } from './urls.controller';
import { UrlService } from './url.service';

@Module({
  controllers: [UrlsController],
  providers: [UrlService],
})
export class UrlModule {}
