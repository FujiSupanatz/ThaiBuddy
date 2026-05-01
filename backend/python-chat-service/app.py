"""
Python AI service for the chatbot.

Flow:
1. Receive chat requests from the Go backend.
2. Build a system prompt based on the selected chat mode.
3. Call Typhoon chat completions API directly.
4. Return the reply as JSON.
"""

from __future__ import annotations

import json
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def load_env_files() -> None:
    """Load .env.local / .env without external dependencies."""
    base_dir = Path(__file__).resolve().parents[2]
    candidates = [
        Path(".env.local"),
        Path(".env"),
        base_dir / ".env.local",
        base_dir / ".env",
    ]

    for env_path in candidates:
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip("'").strip('"')

            if key and key not in os.environ:
                os.environ[key] = value


load_env_files()


TYPHOON_API_URL = "https://api.opentyphoon.ai/v1/chat/completions"
HOST = os.getenv("PYTHON_CHAT_SERVICE_HOST", "0.0.0.0")
PORT = int(os.getenv("PYTHON_CHAT_SERVICE_PORT", "8001"))
TYPHOON_MODEL = os.getenv("TYPHOON_MODEL", "typhoon-v2.5-30b-a3b-instruct")


def build_system_prompt(mode: str) -> str:
    if mode == "nearby":
        return (
            "You are a Thailand travel assistant focused on nearby recommendations. "
            "Suggest practical places tourists may need such as food, ATM, toilet, transport, "
            "and nearby attractions. Be concise and helpful."
        )
    if mode == "planner":
        return (
            "You are a Thailand travel assistant focused on planning the next destination. "
            "Use the user's current place or context to suggest the next logical stop, explain why, "
            "and keep the plan practical for tourists."
        )

    return (
        "You are a friendly travel assistant for international tourists visiting Thailand. "
        "Help with Thai phrases, etiquette, food, transport, safety, and travel tips. "
        "Keep answers clear and concise."
    )


def call_typhoon(message: str, mode: str) -> str:
    api_key = os.getenv("TYPHOON_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("TYPHOON_API_KEY is not set")

    payload: dict[str, Any] = {
        "model": TYPHOON_MODEL,
        "messages": [
            {"role": "system", "content": build_system_prompt(mode)},
            {"role": "user", "content": message},
        ],
        "temperature": 0.4,
        "max_tokens": 512,
    }

    body = json.dumps(payload).encode("utf-8")
    request = Request(
        TYPHOON_API_URL,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    with urlopen(request, timeout=60) as response:
        response_body = response.read().decode("utf-8")

    data = json.loads(response_body)
    return data["choices"][0]["message"]["content"].strip()


class ChatHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self._write_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        if self.path != "/health":
            self._write_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return

        self._write_json(
            HTTPStatus.OK,
            {
                "status": "ok",
                "service": "python-chat-service",
                "provider": "typhoon",
                "model": TYPHOON_MODEL,
            },
        )

    def do_POST(self) -> None:
        if self.path != "/chat":
            self._write_json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length)
            payload = json.loads(raw_body.decode("utf-8"))

            message = str(payload.get("message", "")).strip()
            mode = str(payload.get("mode", "general")).strip() or "general"

            if not message:
                self._write_json(HTTPStatus.BAD_REQUEST, {"error": "message is required"})
                return

            reply = call_typhoon(message, mode)
            self._write_json(HTTPStatus.OK, {"reply": reply})
        except HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            self._write_json(
                HTTPStatus.BAD_GATEWAY,
                {
                    "error": "typhoon http error",
                    "details": body,
                },
            )
        except URLError as error:
            self._write_json(
                HTTPStatus.BAD_GATEWAY,
                {
                    "error": "typhoon network error",
                    "details": str(error),
                },
            )
        except RuntimeError as error:
            self._write_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"error": str(error)},
            )
        except Exception as error:  # noqa: BLE001
            self._write_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {
                    "error": "unexpected python chat service error",
                    "details": str(error),
                },
            )

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _write_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Type", "application/json")

    def _write_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        self.send_response(status)
        self._write_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))


if __name__ == "__main__":
    print(f"python chat service listening on {HOST}:{PORT}")
    server = ThreadingHTTPServer((HOST, PORT), ChatHandler)
    server.serve_forever()
