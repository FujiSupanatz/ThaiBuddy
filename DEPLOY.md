# Deploy Guide

This repo is ready to deploy as 3 services:

- `frontend` (Next.js)
- `go-chat-api` (Go backend)
- `python-chat-service` (Typhoon integration)

There are now two deployment paths:

- Manual deployment on Render or Railway
- Render Blueprint deployment via `render.yaml`

## 1. Local production-style test

Create a `.env` file from `.env.production.example`, then run:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Go API: `http://localhost:8080/health`
- Python service: `http://localhost:8001/health`

## 2. Deploy on a platform that supports Docker

Recommended providers:

- Render
- Railway
- Fly.io
- DigitalOcean App Platform

Create 3 services from the same GitHub repo:

### Frontend service

- Root directory: repository root
- Dockerfile path: `Dockerfile`
- Port: `3000`
- Env:
  - `NEXT_PUBLIC_CHAT_API_URL=https://<your-go-api-domain>/api/v1/chat`

### Go API service

- Root directory: `backend/go-chat-api`
- Dockerfile path: `backend/go-chat-api/Dockerfile`
- Port: `8080`
- Env:
  - `GO_CHAT_API_ADDR=:8080`
  - `PYTHON_CHAT_SERVICE_URL=http://<internal-python-service-host>:8001/chat`
  - `CORS_ALLOW_ORIGIN=https://<your-frontend-domain>`

### Python AI service

- Root directory: `backend/python-chat-service`
- Dockerfile path: `backend/python-chat-service/Dockerfile`
- Port: `8001`
- Env:
  - `PYTHON_CHAT_SERVICE_HOST=0.0.0.0`
  - `PYTHON_CHAT_SERVICE_PORT=8001`
  - `TYPHOON_API_KEY=<your-secret>`
  - `TYPHOON_BASE_URL=https://api.opentyphoon.ai/v1`
  - `TYPHOON_MODEL=typhoon-v2.5-30b-a3b-instruct`

## 3. Render Blueprint option

This repo includes a root-level `render.yaml`.

On Render:

1. Click `New +`
2. Click `Blueprint`
3. Select this GitHub repository
4. Render will detect `render.yaml`
5. Fill the prompted secret values:
   - `TYPHOON_API_KEY`
   - `CORS_ALLOW_ORIGIN`
   - `NEXT_PUBLIC_CHAT_API_URL`
6. Create the Blueprint

Recommended values:

- `CORS_ALLOW_ORIGIN=https://<your-frontend-domain>`
- `NEXT_PUBLIC_CHAT_API_URL=https://<your-go-api-domain>/api/v1/chat`

## 4. Recommended deployment order

1. Deploy `python-chat-service`
2. Deploy `go-chat-api`
3. Deploy `frontend`

## 5. Post-deploy checks

Check:

- `https://<go-api-domain>/health`
- `https://<python-service-domain>/health`

Then test:

```bash
curl -X POST https://<go-api-domain>/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","mode":"general"}'
```

## 5. Important note

`TYPHOON_API_KEY` must stay on the backend only. Do not expose it to the frontend.
