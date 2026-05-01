# Backend Layout

The chatbot backend is split into 2 services.

## 1. Go Chat API

Path: `backend/go-chat-api`

Responsibilities:
- receive requests from the frontend
- validate request payloads
- act as the central backend layer
- forward chat requests to the Python AI service

Endpoints:
- `POST /api/v1/chat`
- `GET /health`

Environment variables:
- `GO_CHAT_API_ADDR` default `:8080`
- `PYTHON_CHAT_SERVICE_URL` default `http://localhost:8001/chat`

Notes:
- Go service also tries to load `.env.local` or `.env` from the project root automatically

## 2. Python Chat Service

Path: `backend/python-chat-service`

Responsibilities:
- receive chat requests from Go
- build prompts based on `general`, `nearby`, and `planner`
- call Typhoon API directly
- return `reply` as JSON

Endpoints:
- `POST /chat`
- `GET /health`

Environment variables:
- `PYTHON_CHAT_SERVICE_HOST` default `0.0.0.0`
- `PYTHON_CHAT_SERVICE_PORT` default `8001`
- `TYPHOON_API_KEY` required
- `TYPHOON_MODEL` default `typhoon-v2.5-30b-a3b-instruct`

Notes:
- Python service also tries to load `.env.local` or `.env` from the project root automatically
- Typhoon base URL is fixed in code as `https://api.opentyphoon.ai/v1/chat/completions`

## 3. Frontend

Frontend chat sends requests to:

```text
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8080/api/v1/chat
```

## Recommended `.env.local`

```env
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8080/api/v1/chat

GO_CHAT_API_ADDR=:8080
PYTHON_CHAT_SERVICE_URL=http://localhost:8001/chat

PYTHON_CHAT_SERVICE_HOST=0.0.0.0
PYTHON_CHAT_SERVICE_PORT=8001

TYPHOON_API_KEY=your_typhoon_api_key
TYPHOON_MODEL=typhoon-v2.5-30b-a3b-instruct
```
