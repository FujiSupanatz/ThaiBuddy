# ThaiBuddy

ThaiBuddy is an AI-powered travel assistant web app for Thailand. It combines interactive maps, nearby place discovery, trip planning, multilingual chat, and OCR tools for signs, menus, and currency conversion.

## Features

- Interactive Google Maps experience for exploring places in Thailand
- AI chat assistant with `General`, `Nearby`, and `Plan Next` modes
- Nearby place recommendations based on the user's current location
- Trip planning with structured itinerary support
- OCR for Thai signs and printed text
- Menu OCR with price extraction and currency conversion
- Currency conversion tools for tourists

## Tech Stack

- Frontend: Next.js, React, TypeScript
- Chat Gateway: Go
- AI Services: Python
- OCR Service: Python
- External Services: Typhoon API, Google Maps Platform, Overpass / OpenStreetMap

## Project Structure

- `src/` - frontend UI, API routes, planner logic, and security guards
- `backend/go-chat-api/` - Go gateway for chat sessions and request orchestration
- `backend/python-chat-service/` - Python service for LLM-based chat logic
- `backend/ocr-service/` - Python OCR service for signs, menus, and exchange-rate tools

## Team Members

- `609154` - Aekkrit Kuntipalo
- `609077` - Wachirawit Piyaprapapan
- `602137` - Kittikorn Pimted
- `605602` - Supanat Kerdpoca

## Run Locally

```bash
npm install
docker compose --env-file .env.local up -d
```

Then open:

- `http://localhost:3000`

## Notes

- This project is designed for demo and prototype use.
- Some features require API keys in local environment files.
- Public demo access is currently restricted to Thailand through Cloudflare-aware request guards.
