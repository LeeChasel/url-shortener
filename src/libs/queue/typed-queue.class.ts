import { Queue, Job, JobsOptions } from 'bullmq';

interface JobDefinition {
  name: string;
  data: any;
}

type ExtractJobData<
  TJobs extends JobDefinition,
  TName extends TJobs['name'],
> = Extract<TJobs, { name: TName }>['data'];

/**
 * A typed wrapper around BullMQ's Queue to enforce job name and data types. Type safety is ensured
 * when adding jobs to the queue.
 */
export class TypedQueue<TJobs extends JobDefinition> {
  constructor(private readonly queue: Queue) {}

  async add<TName extends TJobs['name']>(
    name: TName,
    data: ExtractJobData<TJobs, TName>,
    options?: JobsOptions,
  ): Promise<Job> {
    return this.queue.add(name, data, options);
  }

  async addBulk<TName extends TJobs['name']>(
    jobs: Array<{
      name: TName;
      data: ExtractJobData<TJobs, TName>;
      opts?: JobsOptions;
    }>,
  ): Promise<Job[]> {
    return this.queue.addBulk(jobs);
  }

  async remove(jobId: string): Promise<void> {
    await this.queue.remove(jobId);
  }

  async pause(): Promise<void> {
    await this.queue.pause();
  }

  async resume(): Promise<void> {
    await this.queue.resume();
  }
}
