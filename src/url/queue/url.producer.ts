import { TypedQueue } from 'src/libs/queue/typed-queue.class';
import { UrlJobs } from '../types/jobs.type';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UrlQueueProducer extends TypedQueue<UrlJobs> {
  constructor(@InjectQueue('url') queue: Queue) {
    super(queue);
  }
}
