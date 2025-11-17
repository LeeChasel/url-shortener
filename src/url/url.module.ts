import { Module } from '@nestjs/common';
import { UrlsController } from './urls.controller';
import { UrlService } from './url.service';
import { UrlCleanupService } from './url-cleanup.service';

@Module({
  controllers: [UrlsController],
  providers: [UrlService, UrlCleanupService],
  exports: [UrlService, UrlCleanupService],
})
export class UrlModule {}
