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
import re
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def load_env_files() -> None:
    """Load .env.local / .env without external dependencies."""
    current_file = Path(__file__).resolve()
    candidate_roots = [current_file.parent]

    # เดินขึ้น parent เท่าที่มีอยู่จริง เพื่อให้ใช้ได้ทั้ง local path และใน container
    candidate_roots.extend(current_file.parents)

    candidates = [
        Path(".env.local"),
        Path(".env"),
    ]

    for root in candidate_roots:
        candidates.append(root / ".env.local")
        candidates.append(root / ".env")

    seen: set[Path] = set()

    for env_path in candidates:
        env_path = env_path.resolve()
        if env_path in seen:
            continue
        seen.add(env_path)

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

TYPHOON_BASE_URL = os.getenv("TYPHOON_BASE_URL", "https://api.opentyphoon.ai/v1")
TYPHOON_API_URL = f"{TYPHOON_BASE_URL.rstrip('/')}/chat/completions"
HOST = os.getenv("PYTHON_CHAT_SERVICE_HOST", "0.0.0.0")
PORT = int(os.getenv("PYTHON_CHAT_SERVICE_PORT", "8001"))
TYPHOON_MODEL = os.getenv("TYPHOON_MODEL", "typhoon-v2.5-30b-a3b-instruct")
MAX_HISTORY_TURNS = 12
COORDINATE_LABEL_PATTERN = re.compile(
    r"^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$"
)


def build_system_prompt(mode: str) -> str:
    if mode == "nearby":
        return (
            "You are a Thailand travel assistant focused on nearby recommendations. "
            "Suggest practical places tourists may need such as food, ATM, toilet, transport, "
            "and nearby attractions. Use the user's current location context when it is provided. "
            "If coordinates or location context are already provided, do not ask the user where they are again. "
            "Be concise and helpful."
        )
    if mode == "planner":
        return (
            "You are a Thailand travel assistant focused on planning the next destination. "
            "Use the user's current place or context to suggest the next logical stop, explain why, "
            "and keep the plan practical for tourists. Use the user's current location context when it is provided. "
            "If coordinates or location context are already provided, do not ask the user where they are again."
        )

    return (
        "You are a friendly travel assistant for international tourists visiting Thailand. "
        "Help with Thai phrases, etiquette, food, transport, safety, and travel tips. "
        "Keep answers clear and concise."
    )


def normalize_history(history: Any) -> list[dict[str, str]]:
    if not isinstance(history, list):
        return []

    normalized: list[dict[str, str]] = []
    for item in history[-MAX_HISTORY_TURNS:]:
        if not isinstance(item, dict):
            continue

        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()

        if role not in {"user", "assistant"} or not content:
            continue

        normalized.append({"role": role, "content": content})

    return normalized


def normalize_location(location: Any) -> dict[str, Any] | None:
    if not isinstance(location, dict):
        return None

    normalized: dict[str, Any] = {}

    lat = location.get("lat")
    lng = location.get("lng")
    label = str(location.get("label", "")).strip()
    source = str(location.get("source", "")).strip()

    if isinstance(lat, (int, float)):
        normalized["lat"] = float(lat)
    if isinstance(lng, (int, float)):
        normalized["lng"] = float(lng)
    if label:
        normalized["label"] = label
    if source:
        normalized["source"] = source

    if not normalized:
        return None

    return normalized


def has_verified_place_label(location: dict[str, Any] | None) -> bool:
    if not location:
        return False

    label = str(location.get("label", "")).strip()
    if not label:
        return False

    lowered = label.lower()
    if lowered == "my gps location":
        return False

    if COORDINATE_LABEL_PATTERN.match(label):
        return False

    return True


def is_location_identity_question(message: str) -> bool:
    normalized = message.strip().lower()
    thai_message = message.strip()

    english_patterns = [
        "where am i",
        "where am i now",
        "what is my location",
        "my current location",
        "where is this",
    ]

    thai_patterns = [
        "ฉันอยู่ที่ไหน",
        "ตอนนี้ฉันอยู่ที่ไหน",
        "ผมอยู่ที่ไหน",
        "ตอนนี้ผมอยู่ที่ไหน",
        "อยู่ที่ไหน",
        "ฉันอยู่ไหน",
        "ผมอยู่ไหน",
    ]

    return any(pattern in normalized for pattern in english_patterns) or any(
        pattern in thai_message for pattern in thai_patterns
    )


def build_coordinates_only_reply(location: dict[str, Any]) -> str:
    lat = location.get("lat")
    lng = location.get("lng")
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        return "ตอนนี้แอปยังระบุตำแหน่งแบบชื่อสถานที่ไม่ได้ แต่คุณสามารถใช้ GPS หรือคลิกบนแผนที่เพื่ออัปเดตตำแหน่งได้"

    return (
        f"ตอนนี้ตำแหน่งปัจจุบันของคุณคือพิกัด {lat:.6f}, {lng:.6f} "
        "แอปยังไม่ได้ยืนยันชื่ออำเภอหรือจังหวัดจากพิกัดนี้แบบแน่นอน จึงจะอ้างอิงจากพิกัดนี้โดยตรงก่อน"
    )


def build_location_context(mode: str, location: dict[str, Any] | None) -> str | None:
    if mode not in {"nearby", "planner"} or not location:
        return None

    label = str(location.get("label", "")).strip()
    verified_place_label = has_verified_place_label(location)

    lines = [
        "Current user location context:",
        "Treat the provided coordinates as authoritative.",
        "Do not guess or rename the city, province, district, or neighborhood from coordinates alone.",
        "If the app did not provide a verified human-readable place label, refer only to the user's current GPS coordinates.",
    ]

    if "lat" in location and "lng" in location:
        lines.append(f"- latitude: {location['lat']:.6f}")
        lines.append(f"- longitude: {location['lng']:.6f}")

    if verified_place_label:
        lines.append(f"- verified place label: {label}")
    elif label:
        lines.append(f"- raw app label: {label}")
        lines.append(
            "- this raw app label is not a verified place name and must not be expanded into a guessed city or province"
        )

    if location.get("source"):
        lines.append(f"- source: {location['source']}")

    lines.append(
        "Use this as the user's current position. Ground nearby or next-stop suggestions in this location context."
    )
    return "\n".join(lines)


def call_typhoon(
    message: str,
    mode: str,
    history: list[dict[str, str]] | None = None,
    location: dict[str, Any] | None = None,
) -> str:
    api_key = os.getenv("TYPHOON_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("TYPHOON_API_KEY is not set")

    messages: list[dict[str, str]] = [
        {"role": "system", "content": build_system_prompt(mode)},
    ]
    location_context = build_location_context(mode, location)
    if location_context:
        messages.append({"role": "system", "content": location_context})
    messages.extend(history or [])
    if location_context:
        messages.append(
            {
                "role": "user",
                "content": f"Use this location context for the next answer:\n{location_context}",
            }
        )
    messages.append({"role": "user", "content": message})

    payload: dict[str, Any] = {
        "model": TYPHOON_MODEL,
        "messages": messages,
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
            history = normalize_history(payload.get("history"))
            location = normalize_location(payload.get("location"))

            if not message:
                self._write_json(HTTPStatus.BAD_REQUEST, {"error": "message is required"})
                return

            if (
                mode in {"nearby", "planner"}
                and location
                and not has_verified_place_label(location)
                and is_location_identity_question(message)
            ):
                self._write_json(
                    HTTPStatus.OK,
                    {"reply": build_coordinates_only_reply(location)},
                )
                return

            reply = call_typhoon(message, mode, history, location)
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
