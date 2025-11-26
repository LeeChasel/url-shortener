import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MetadataService } from './metadata.service';
import { MetadataQueueProducer, MetadataQueueProcessor } from './queue';
import { METADATA_FETCHER } from './interfaces/metadata-fetcher.interface';
import { MetadataFetcherAdapter } from './adapters/metadata-fetcher.adapter';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'metadata',
    }),
  ],
  providers: [
    MetadataService,
    MetadataQueueProducer,
    MetadataQueueProcessor,
    {
      provide: METADATA_FETCHER,
      useClass: MetadataFetcherAdapter,
    },
  ],
  exports: [MetadataService, MetadataQueueProducer],
})
export class MetadataModule {}
