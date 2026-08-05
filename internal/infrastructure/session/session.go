package session

import (
	"sync"

	"github.com/danilomartinssilva/bot-expenses-telegram/internal/application"
	"github.com/danilomartinssilva/bot-expenses-telegram/internal/domain"
)

type InMemory struct {
	mu       sync.RWMutex
	sessions map[int64]domain.SessionData
}

func NewInMemory() *InMemory {
	return &InMemory{sessions: make(map[int64]domain.SessionData)}
}

func (s *InMemory) Get(chatID int64) (domain.SessionData, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	data, ok := s.sessions[chatID]
	return data, ok
}

func (s *InMemory) Set(chatID int64, data domain.SessionData) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.sessions[chatID] = data
}

func (s *InMemory) SetStep(chatID int64, step domain.FlowStep) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	current, ok := s.sessions[chatID]
	if !ok {
		return false
	}

	current.Step = step
	s.sessions[chatID] = current
	return true
}

func (s *InMemory) SetExpenseAndStep(chatID int64, expense domain.Expense, step domain.FlowStep) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	current, ok := s.sessions[chatID]
	if !ok {
		return false
	}

	current.Expense = expense
	current.Step = step
	s.sessions[chatID] = current
	return true
}

func (s *InMemory) Clear(chatID int64) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.sessions, chatID)
}

func (s *InMemory) Require(chatID int64) (domain.SessionData, error) {
	data, ok := s.Get(chatID)
	if !ok {
		return domain.SessionData{}, application.ErrMissingSession
	}

	return data, nil
}
