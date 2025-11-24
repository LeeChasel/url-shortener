import { WorkerHost, Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { UrlJobs, UrlJobName } from '../types/jobs.type';
import { UrlService } from '../url.service';

@Injectable()
@Processor('url')
export class UrlQueueProcessor extends WorkerHost {
  constructor(private readonly urlService: UrlService) {
    super();
  }

  async process(job: Job<UrlJobs['data'], any, UrlJobName>): Promise<any> {
    switch (job.name) {
      case 'url:redirected':
        return this.urlService.redirectedStatistics(job.data);

      default: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  }
}
