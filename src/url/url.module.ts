import { Module } from '@nestjs/common';
import { UrlsController } from './urls.controller';
import { UrlService } from './url.service';
import { UrlCleanupService } from './url-cleanup.service';
import { BullModule } from '@nestjs/bullmq';
import { UrlQueueProcessor } from './queue/url.processor';
import { UrlQueueProducer } from './queue';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'url',
    }),
  ],
  controllers: [UrlsController],
  providers: [
    UrlService,
    UrlCleanupService,
    UrlQueueProcessor,
    UrlQueueProducer,
  ],
  exports: [UrlService, UrlCleanupService, UrlQueueProducer],
})
export class UrlModule {}
