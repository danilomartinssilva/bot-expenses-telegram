package ocr

import (
	"context"
	"fmt"

	"github.com/otiai10/gosseract/v2"
)

type OcrService struct{}

func NewOcrService() *OcrService {
	return &OcrService{}
}

func (o *OcrService) ExtractText(ctx context.Context, image []byte) (string, error) {
	client := gosseract.NewClient()
	defer client.Close()

	if err := client.SetLanguage("por"); err != nil {
		return "", fmt.Errorf("ocr: set language: %w", err)
	}

	if err := client.SetImageFromBytes(image); err != nil {
		return "", fmt.Errorf("ocr: set image: %w", err)
	}

	text, err := client.Text()
	if err != nil {
		return "", fmt.Errorf("ocr: %w", err)
	}

	return text, nil
}
