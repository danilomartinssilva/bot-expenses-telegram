import type { AnalyzeImageJob, JobQueue } from '../../application/ports/JobQueue';

export class NoopJobQueue implements JobQueue {
  private handler: ((job: AnalyzeImageJob) => Promise<void>) | null = null;

  async publish(job: AnalyzeImageJob): Promise<void> {
    if (this.handler) {
      await this.handler(job);
    }
  }

  async subscribe(handler: (job: AnalyzeImageJob) => Promise<void>): Promise<void> {
    this.handler = handler;
  }
}
