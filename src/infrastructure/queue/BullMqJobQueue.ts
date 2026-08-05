import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import type { AnalyzeImageJob, JobQueue } from '../../application/ports/JobQueue';

const QUEUE_NAME = 'analyze-image';
const DEFAULT_ATTEMPTS = 3;

export class BullMqJobQueue implements JobQueue {
  private readonly queue: Queue<AnalyzeImageJob>;

  constructor(private readonly connectionString: string) {
    const connection = new IORedis(connectionString, { maxRetriesPerRequest: null });
    this.queue = new Queue<AnalyzeImageJob>(QUEUE_NAME, { connection });
  }

  async publish(job: AnalyzeImageJob): Promise<void> {
    await this.queue.add(
      'analyze',
      job,
      {
        jobId: job.jobId,
        attempts: DEFAULT_ATTEMPTS,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
  }

  async subscribe(handler: (job: AnalyzeImageJob) => Promise<void>): Promise<void> {
    const connection = new IORedis(this.connectionString, { maxRetriesPerRequest: null });
    const worker = new Worker<AnalyzeImageJob>(
      QUEUE_NAME,
      async (job) => {
        await handler(job.data);
      },
      { connection }
    );

    worker.on('failed', (job, error) => {
      console.error(`Job failed after retries (id=${job?.id}):`, error);
    });

    worker.on('error', (error) => {
      console.error('BullMQ worker error:', error);
    });
  }
}
