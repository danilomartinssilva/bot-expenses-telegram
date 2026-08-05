package domain

type TransactionType string

const (
	TransactionIncoming TransactionType = "Entrada"
	TransactionOutgoing TransactionType = "Saída"
)

type FlowStep string

const (
	StepAwaitingResponsible     FlowStep = "awaiting-responsible"
	StepAwaitingType            FlowStep = "awaiting-type"
	StepAwaitingCategory        FlowStep = "awaiting-category"
	StepAwaitingValue           FlowStep = "awaiting-value"
	StepAwaitingValueEdit       FlowStep = "awaiting-value-edit"
	StepAwaitingDescription     FlowStep = "awaiting-description"
	StepAwaitingDescriptionEdit FlowStep = "awaiting-description-edit"
	StepAwaitingFinal           FlowStep = "awaiting-final"
)

type Expense struct {
	Date           string
	Type           TransactionType
	Category       string
	Description    string
	Responsible    string
	Value          float64
	Essential      string
	PaidOrReceived string
	OcrText        string
	MissingFields  []string
}

type SessionData struct {
	Expense Expense
	Step    FlowStep
}
