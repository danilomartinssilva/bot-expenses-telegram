package application

import (
	"errors"
	"strings"
)

var ErrMissingSession = errors.New("Não encontrei uma despesa pendente. Envie o print novamente.")

type MissingFieldsError struct {
	Missing []string
	OcrText string
}

func (e *MissingFieldsError) Error() string {
	ocrText := e.OcrText
	if ocrText == "" {
		ocrText = "(vazio)"
	}

	return strings.Join([]string{
		"Não consegui identificar: " + strings.Join(e.Missing, ", ") + ".",
		"Tente enviar um print mais nítido ou mais aproximado da notificação.",
		"",
		"Texto lido pelo OCR:",
		ocrText,
	}, "\n")
}
