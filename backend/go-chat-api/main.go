package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

type chatRequest struct {
	Message string `json:"message"`
	Mode    string `json:"mode"`
}

type pythonChatRequest struct {
	Message string `json:"message"`
	Mode    string `json:"mode"`
}

type pythonChatResponse struct {
	Reply string `json:"reply"`
}

type chatResponse struct {
	Reply string `json:"reply"`
}

func main() {
	loadEnvFiles()

	addr := getEnv("GO_CHAT_API_ADDR", ":8080")
	pythonServiceURL := getPythonServiceURL()

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/v1/chat", chatHandler(pythonServiceURL))

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
