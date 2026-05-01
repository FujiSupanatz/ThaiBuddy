package main

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

const maxSessionTurns = 12

type chatSession struct {
	mutex      sync.Mutex
	history    []pythonChatTurn
	lastAccess time.Time
}

type chatSessionStore struct {
	mutex    sync.Mutex
	sessions map[string]*chatSession
}

func newChatSessionStore() *chatSessionStore {
	return &chatSessionStore{
		sessions: make(map[string]*chatSession),
	}
}

func (store *chatSessionStore) get(sessionID string) (string, *chatSession) {
	if sessionID == "" {
		sessionID = newSessionID()
	}

	store.mutex.Lock()
	defer store.mutex.Unlock()

	session := store.sessions[sessionID]
	if session == nil {
		session = &chatSession{
			lastAccess: time.Now(),
		}
		store.sessions[sessionID] = session
	}

	return sessionID, session
}

func (session *chatSession) snapshotHistory() []pythonChatTurn {
	session.lastAccess = time.Now()

	if len(session.history) == 0 {
		return nil
	}

	history := make([]pythonChatTurn, len(session.history))
	copy(history, session.history)
	return history
}

func (session *chatSession) appendTurn(role string, content string) {
	session.lastAccess = time.Now()
	session.history = append(session.history, pythonChatTurn{
		Role:    role,
		Content: content,
	})

	if len(session.history) > maxSessionTurns {
		session.history = append([]pythonChatTurn(nil), session.history[len(session.history)-maxSessionTurns:]...)
	}
}

func newSessionID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return hex.EncodeToString([]byte(time.Now().Format(time.RFC3339Nano)))
	}

	return hex.EncodeToString(bytes)
}
