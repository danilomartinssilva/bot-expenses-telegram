export class MissingFieldsError extends Error {
  constructor(missingFields: string[], ocrText: string) {
    super(
      [
        `Não consegui identificar: ${missingFields.join(', ')}.`,
        'Tente enviar um print mais nítido ou mais aproximado da notificação.',
        '',
        'Texto lido pelo OCR:',
        ocrText || '(vazio)',
      ].join('\n')
    );
    this.name = 'MissingFieldsError';
  }
}
