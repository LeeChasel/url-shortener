import { WorkerHost, Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { MetadataJobs, MetadataJobName } from '../types/jobs.type';
import { MetadataService } from '../metadata.service';

@Injectable()
@Processor('metadata')
export class MetadataQueueProcessor extends WorkerHost {
  constructor(private readonly metadataService: MetadataService) {
    super();
  }

  async process(
    job: Job<MetadataJobs['data'], any, MetadataJobName>,
  ): Promise<any> {
    switch (job.name) {
      case 'metadata:fetch':
        return this.metadataService.fetchAndStoreMetadata(job.data);

      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }
}
