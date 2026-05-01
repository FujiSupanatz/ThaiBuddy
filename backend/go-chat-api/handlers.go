package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

func healthHandler(writer http.ResponseWriter, _ *http.Request) {
	writeJSON(writer, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "go-chat-api",
	})
}

func chatHandler(pythonServiceURL string, sessionStore *chatSessionStore) http.HandlerFunc {
	client := &http.Client{Timeout: 45 * time.Second}

	return func(writer http.ResponseWriter, request *http.Request) {
		if request.Method == http.MethodOptions {
			writer.WriteHeader(http.StatusNoContent)
			return
		}

		if request.Method != http.MethodPost {
			writeJSON(writer, http.StatusMethodNotAllowed, map[string]string{
				"error": "method not allowed",
			})
			return
		}

		var payload chatRequest
		if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
			writeJSON(writer, http.StatusBadRequest, map[string]string{
				"error": "invalid json body",
			})
			return
		}

		payload.Message = strings.TrimSpace(payload.Message)
		payload.Mode = strings.TrimSpace(payload.Mode)
		payload.SessionID = strings.TrimSpace(payload.SessionID)

		if payload.Message == "" {
			writeJSON(writer, http.StatusBadRequest, map[string]string{
				"error": "message is required",
			})
			return
		}

		if payload.Mode == "" {
			payload.Mode = "general"
		}

		sessionID, session := sessionStore.get(payload.SessionID)

		// Serialise requests per session so the same browser/tab cannot interleave
		// multiple sends and corrupt conversational ordering.
		session.mutex.Lock()
		defer session.mutex.Unlock()

		pythonPayload := pythonChatRequest{
			Message:       payload.Message,
			Mode:          payload.Mode,
			SessionID:     sessionID,
			History:       session.snapshotHistory(),
			Location:      sanitizeLocationForMode(payload.Mode, payload.Location),
			PlannerResult: payload.PlannerResult,
			NearbyResult:  payload.NearbyResult,
		}

		body, err := json.Marshal(pythonPayload)
		if err != nil {
			writeJSON(writer, http.StatusInternalServerError, map[string]string{
				"error": "failed to marshal python request",
			})
			return
		}

		pythonRequest, err := http.NewRequestWithContext(
			request.Context(),
			http.MethodPost,
			pythonServiceURL,
			bytes.NewReader(body),
		)
		if err != nil {
			writeJSON(writer, http.StatusInternalServerError, map[string]string{
				"error": "failed to create python service request",
			})
			return
		}

		pythonRequest.Header.Set("Content-Type", "application/json")

		pythonResponse, err := client.Do(pythonRequest)
		if err != nil {
			writeJSON(writer, http.StatusBadGateway, map[string]string{
				"error": "python service unavailable",
			})
			return
		}
		defer pythonResponse.Body.Close()

		responseBody, err := io.ReadAll(pythonResponse.Body)
		if err != nil {
			writeJSON(writer, http.StatusBadGateway, map[string]string{
				"error": "failed reading python response",
			})
			return
		}

		if pythonResponse.StatusCode >= http.StatusBadRequest {
			writer.Header().Set("Content-Type", "application/json")
			writer.WriteHeader(http.StatusBadGateway)
			_, _ = writer.Write(responseBody)
			return
		}

		var pythonPayloadResponse pythonChatResponse
		if err := json.Unmarshal(responseBody, &pythonPayloadResponse); err != nil {
			writeJSON(writer, http.StatusBadGateway, map[string]string{
				"error": "invalid python response",
			})
			return
		}

		writeJSON(writer, http.StatusOK, chatResponse{
			Reply:     pythonPayloadResponse.Reply,
			MapAction: pythonPayloadResponse.MapAction,
		})

		// Only persist conversational turns after the AI call succeeds.
		session.appendTurn("user", payload.Message)
		session.appendTurn("assistant", pythonPayloadResponse.Reply)
	}
}
