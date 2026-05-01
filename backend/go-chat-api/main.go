package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

type chatRequest struct {
	Message       string          `json:"message"`
	Mode          string          `json:"mode"`
	SessionID     string          `json:"session_id"`
	Location      *chatLocation   `json:"location"`
	PlannerResult json.RawMessage `json:"planner_result,omitempty"`
	NearbyResult  json.RawMessage `json:"nearby_result,omitempty"`
}

type pythonChatRequest struct {
	Message       string           `json:"message"`
	Mode          string           `json:"mode"`
	SessionID     string           `json:"session_id"`
	History       []pythonChatTurn `json:"history"`
	Location      *chatLocation    `json:"location"`
	PlannerResult json.RawMessage  `json:"planner_result,omitempty"`
	NearbyResult  json.RawMessage  `json:"nearby_result,omitempty"`
}

type pythonChatResponse struct {
	Reply     string         `json:"reply"`
	MapAction *chatMapAction `json:"map_action,omitempty"`
}

type chatResponse struct {
	Reply     string         `json:"reply"`
	MapAction *chatMapAction `json:"map_action,omitempty"`
}

type pythonChatTurn struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatLocation struct {
	Lat       *float64 `json:"lat"`
	Lng       *float64 `json:"lng"`
	Label     string   `json:"label"`
	Source    string   `json:"source"`
	UpdatedAt int64    `json:"updated_at"`
}

type chatMapAction struct {
	Type  string `json:"type"`
	Query string `json:"query"`
	Label string `json:"label"`
	Mode  string `json:"mode"`
}

func main() {
	loadEnvFiles()

	addr := getEnv("GO_CHAT_API_ADDR", ":8080")
	pythonServiceURL := getPythonServiceURL()
	sessionStore := newChatSessionStore()

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/v1/chat", chatHandler(pythonServiceURL, sessionStore))

	server := &http.Server{
		Addr:              addr,
		Handler:           withCORS(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("go chat api listening on %s", addr)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("go chat api failed: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}

func getPythonServiceURL() string {
	if value := strings.TrimSpace(os.Getenv("PYTHON_CHAT_SERVICE_URL")); value != "" {
		return value
	}

	if hostport := strings.TrimSpace(os.Getenv("PYTHON_CHAT_SERVICE_HOSTPORT")); hostport != "" {
		return "http://" + hostport + "/chat"
	}

	return "http://localhost:8001/chat"
}
