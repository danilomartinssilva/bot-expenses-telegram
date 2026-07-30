import { createWorker } from 'tesseract.js';

export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const worker = await createWorker('por');

  try {
    const result = await worker.recognize(imageBuffer);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}
