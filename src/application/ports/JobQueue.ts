export type AnalyzeImageJob = {
  jobId: string;
  chatId: number;
  userId: number;
  fileId: string;
};

export interface JobQueue {
  publish(job: AnalyzeImageJob): Promise<void>;
  subscribe(handler: (job: AnalyzeImageJob) => Promise<void>): Promise<void>;
}
