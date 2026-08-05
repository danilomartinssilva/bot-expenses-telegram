export interface FileDownloader {
  download(fileId: string): Promise<Buffer>;
}
