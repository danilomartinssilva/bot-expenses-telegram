export interface OcrService {
  extractText(imageBuffer: Buffer): Promise<string>;
}
