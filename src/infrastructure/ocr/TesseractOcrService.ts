import { createWorker } from 'tesseract.js';
import type { OcrService } from '../../application/ports/OcrService';

export class TesseractOcrService implements OcrService {
  async extractText(imageBuffer: Buffer): Promise<string> {
    const worker = await createWorker('por');

    try {
      const result = await worker.recognize(imageBuffer);
      return result.data.text.trim();
    } finally {
      await worker.terminate();
    }
  }
}
