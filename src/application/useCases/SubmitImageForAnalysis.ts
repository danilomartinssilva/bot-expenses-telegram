import type { JobQueue } from '../ports/JobQueue';

export type SubmitImageInput = {
  chatId: number;
  userId: number;
  fileId: string;
  jobId: string;
};

export class SubmitImageForAnalysis {
  constructor(private readonly queue: JobQueue) {}

  async execute(input: SubmitImageInput): Promise<void> {
    await this.queue.publish({
      jobId: input.jobId,
      chatId: input.chatId,
      userId: input.userId,
      fileId: input.fileId,
    });
  }
}
