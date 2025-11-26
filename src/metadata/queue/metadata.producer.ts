import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { TypedQueue } from 'src/libs/queue/typed-queue.class';
import { MetadataJobs } from '../types/jobs.type';

@Injectable()
export class MetadataQueueProducer extends TypedQueue<MetadataJobs> {
  constructor(@InjectQueue('metadata') queue: Queue) {
    super(queue);
  }
}
