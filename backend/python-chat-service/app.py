"""
Python AI service for the chatbot.

Flow:
1. Receive chat requests from the Go backend.
2. Build a system prompt based on the selected chat mode.
3. Let Typhoon call a reverse-geocoding tool when location-sensitive modes
   include raw coordinates.
4. Execute the Google reverse-geocoding tool server-side.
5. Feed the verified tool result back to Typhoon for the final answer.
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
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def load_env_files() -> None:
    """Load .env.local / .env without external dependencies."""
    current_file = Path(__file__).resolve()
    candidate_roots = [current_file.parent]
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
GOOGLE_GEOCODING_API_URL = os.getenv(
    "GOOGLE_GEOCODING_API_URL",
    "https://maps.googleapis.com/maps/api/geocode/json",
)
GOOGLE_GEOCODING_LANGUAGE = os.getenv("GOOGLE_GEOCODING_LANGUAGE", "en")
HOST = os.getenv("PYTHON_CHAT_SERVICE_HOST", "0.0.0.0")
PORT = int(os.getenv("PYTHON_CHAT_SERVICE_PORT", "8001"))
TYPHOON_MODEL = os.getenv("TYPHOON_MODEL", "typhoon-v2.5-30b-a3b-instruct")
MAX_HISTORY_TURNS = 12
REVERSE_GEOCODE_TOOL_NAME = "reverse_geocode_current_location"
COORDINATE_LABEL_PATTERN = re.compile(
    r"^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$"
)


def get_google_geocoding_api_key() -> str:
    return (
        os.getenv("GOOGLE_GEOCODING_API_KEY", "").strip()
        or os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    )


def has_coordinate_location(location: dict[str, Any] | None) -> bool:
    return bool(
        location
        and isinstance(location.get("lat"), (int, float))
        and isinstance(location.get("lng"), (int, float))
    )


def build_system_prompt(mode: str) -> str:
    language_rule = (
        "Always reply in the same language as the user's latest message. "
        "If the user writes in English, reply in English. "
        "If the user writes in Thai, reply in Thai. "
        "Only switch languages if the user explicitly asks you to."
    )

    if mode == "nearby":
        return (
            "You are a Thailand travel assistant focused on nearby recommendations. "
            "This mode is only for finding things near the user's current position right now. "
            "Suggest practical places tourists may need such as food, coffee, ATM, toilet, transport, "
            "and nearby attractions. "
            "Keep the answer grounded in what is close to the user now. "
            "If the user's request is too vague to recommend a specific place, ask one short follow-up question first. "
            "If raw GPS coordinates are provided, you must resolve them with the "
            "reverse_geocode_current_location tool before giving any location-specific answer. "
            "Treat the tool result as authoritative. "
            "If reverse geocoding fails, refer only to the provided coordinates and do not guess "
            "the city, district, province, or neighborhood. "
            f"{language_rule}"
        )
    if mode == "planner":
        return (
            "You are a Thailand travel assistant focused on planning the next destination. "
            "This mode is only for suggesting the next stop after the user's current place. "
            "Use the user's current place or context to suggest the next logical destination, explain why, "
            "and keep the plan practical for tourists with route intent in mind. "
            "Prefer one strong next-stop recommendation over a broad nearby list. "
            "If the user has not said enough to plan the next stop well, ask one short follow-up question first. "
            "If raw GPS coordinates are provided, you must resolve them with the "
            "reverse_geocode_current_location tool before giving any location-specific answer. "
            "Treat the tool result as authoritative. "
            "If reverse geocoding fails, refer only to the provided coordinates and do not guess "
            "the city, district, province, or neighborhood. "
            f"{language_rule}"
        )

    return (
        "You are a friendly general-purpose travel assistant for international tourists visiting Thailand. "
        "This mode is not for nearby search or next-stop planning. "
        "Help with Thai phrases, translation, etiquette, culture, food tips, transport explanations, safety, and travel advice. "
        "Do not rely on the user's current location in this mode. "
        "If the user asks to find something near them, tell them to use Nearby mode. "
        "If the user asks where to go next from their current place, tell them to use Plan Next mode. "
        "Keep answers clear and concise. "
        f"{language_rule}"
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


def normalize_planner_result(planner_result: Any) -> dict[str, Any] | None:
    if not isinstance(planner_result, dict):
        return None

    places = planner_result.get("places")
    itinerary = planner_result.get("itinerary")
    estimated_cost = planner_result.get("estimated_cost_thb")
    tips = planner_result.get("tips")

    normalized: dict[str, Any] = {
        "places": places if isinstance(places, list) else [],
        "itinerary": itinerary if isinstance(itinerary, list) else [],
        "estimated_cost_thb": estimated_cost
        if isinstance(estimated_cost, (int, float))
        else 0,
        "tips": tips if isinstance(tips, list) else [],
    }

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


def build_mode_follow_up_question(mode: str, message: str) -> str | None:
    normalized = message.strip().lower()
    normalized_compact = re.sub(r"[^\w\s]", "", normalized).strip()
    thai_message = message.strip()

    if mode == "nearby":
        vague_english = {
            "nearby",
            "find nearby",
            "find something nearby",
            "what is nearby",
            "what's nearby",
            "show nearby",
        }
        vague_thai = [
            "ใกล้ฉันมีอะไร",
            "แถวนี้มีอะไร",
            "หาใกล้ฉัน",
            "หาอะไรใกล้ฉัน",
            "ใกล้ๆ มีอะไร",
        ]

        if normalized in vague_english or normalized_compact in vague_english or any(text in thai_message for text in vague_thai):
            if re.search(r"[\u0E00-\u0E7F]", thai_message):
                return "คุณกำลังมองหาอะไรใกล้ตัวเป็นพิเศษครับ เช่น ร้านกาแฟ อาหาร ATM ห้องน้ำ หรือสถานที่ท่องเที่ยว?"
            return "What would you like to find nearby specifically: coffee, food, an ATM, a restroom, or an attraction?"

    if mode == "planner":
        vague_english = {
            "plan my next stop",
            "where next",
            "what next",
            "next stop",
            "where should i go next",
        }
        vague_thai = [
            "ไปต่อไหนดี",
            "ต่อไปไหนดี",
            "วางแผนต่อให้หน่อย",
            "จุดต่อไปคือที่ไหน",
        ]

        if normalized in vague_english or normalized_compact in vague_english or any(text in thai_message for text in vague_thai):
            if re.search(r"[\u0E00-\u0E7F]", thai_message):
                return "คุณอยากไปต่อแนวไหนครับ เช่น คาเฟ่ ทะเล วัด ช้อปปิ้ง ธรรมชาติ หรือที่เที่ยวถ่ายรูป?"
            return "What kind of next stop do you want: a cafe, beach, temple, shopping area, nature spot, or a photo-friendly attraction?"

    return None


def build_coordinates_only_reply(location: dict[str, Any]) -> str:
    lat = location.get("lat")
    lng = location.get("lng")
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        return (
            "ตอนนี้แอปยังระบุตำแหน่งแบบชื่อสถานที่ไม่ได้ แต่คุณสามารถใช้ GPS "
            "หรือคลิกบนแผนที่เพื่ออัปเดตตำแหน่งได้"
        )

    return (
        f"ตอนนี้ตำแหน่งปัจจุบันของคุณคือพิกัด {lat:.6f}, {lng:.6f} "
        "แต่ระบบยังยืนยันชื่ออำเภอหรือจังหวัดจากภายนอกไม่สำเร็จ "
        "จึงจะอ้างอิงจากพิกัดนี้โดยตรงก่อน"
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
    ]

    if has_coordinate_location(location):
        lines.append(f"- latitude: {location['lat']:.6f}")
        lines.append(f"- longitude: {location['lng']:.6f}")
        lines.append(
            "- if coordinates are present, resolve them with reverse_geocode_current_location before giving a location-specific answer"
        )

    if verified_place_label:
        lines.append(f"- verified app label: {label}")
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


def build_planner_context(
    mode: str,
    planner_result: dict[str, Any] | None,
) -> str | None:
    if mode != "planner" or not planner_result:
        return None

    return (
        "Structured planner result generated from real nearby places:\n"
        f"{json.dumps(planner_result, ensure_ascii=False, indent=2)}\n"
        "Use this planner result as authoritative structured context for the next-stop recommendation. "
        "Summarize it clearly for the user. Prefer one best next stop from the structured itinerary if the user asked generally."
    )


def build_reverse_geocode_tool() -> dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": REVERSE_GEOCODE_TOOL_NAME,
            "description": (
                "Resolve the user's current latitude and longitude into a real-world "
                "location using Google reverse geocoding. Use this before giving "
                "location-specific answers in Nearby or Plan Next."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {
                        "type": "number",
                        "description": "The user's current latitude.",
                    },
                    "lng": {
                        "type": "number",
                        "description": "The user's current longitude.",
                    },
                },
                "required": ["lat", "lng"],
                "additionalProperties": False,
            },
        },
    }


def extract_text_from_content(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        chunks: list[str] = []
        for item in content:
            if isinstance(item, str):
                chunks.append(item)
                continue

            if not isinstance(item, dict):
                continue

            if item.get("type") == "text" and isinstance(item.get("text"), str):
                chunks.append(item["text"])
        return "\n".join(chunk.strip() for chunk in chunks if chunk.strip()).strip()

    return ""


def build_assistant_message(message: dict[str, Any]) -> dict[str, Any]:
    assistant_message: dict[str, Any] = {
        "role": "assistant",
        "content": message.get("content") if message.get("content") is not None else "",
    }

    tool_calls = message.get("tool_calls")
    if isinstance(tool_calls, list) and tool_calls:
        assistant_message["tool_calls"] = tool_calls

    return assistant_message


def get_first_choice_message(payload: dict[str, Any]) -> dict[str, Any]:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise RuntimeError("typhoon response did not contain any choices")

    message = choices[0].get("message")
    if not isinstance(message, dict):
        raise RuntimeError("typhoon response did not contain a valid message")

    return message


def extract_address_component(
    components: list[dict[str, Any]],
    component_type: str,
) -> str:
    for component in components:
        if component_type in component.get("types", []):
            long_name = component.get("long_name")
            if isinstance(long_name, str) and long_name.strip():
                return long_name.strip()

    return ""


def normalize_geocode_result(raw_result: dict[str, Any], lat: float, lng: float) -> dict[str, Any]:
    components = raw_result.get("address_components")
    if not isinstance(components, list):
        components = []

    district = (
        extract_address_component(components, "administrative_area_level_2")
        or extract_address_component(components, "locality")
        or extract_address_component(components, "sublocality_level_1")
        or extract_address_component(components, "administrative_area_level_3")
    )
    province = extract_address_component(components, "administrative_area_level_1")
    subdistrict = (
        extract_address_component(components, "sublocality_level_1")
        or extract_address_component(components, "administrative_area_level_3")
    )
    country = extract_address_component(components, "country")
    postal_code = extract_address_component(components, "postal_code")

    formatted_address = raw_result.get("formatted_address")
    place_id = raw_result.get("place_id")

    return {
        "ok": True,
        "provider": "google-reverse-geocoding",
        "lat": lat,
        "lng": lng,
        "formatted_address": formatted_address.strip()
        if isinstance(formatted_address, str)
        else "",
        "place_id": place_id.strip() if isinstance(place_id, str) else "",
        "district": district,
        "province": province,
        "subdistrict": subdistrict,
        "country": country,
        "postal_code": postal_code,
    }


def reverse_geocode_with_google(lat: float, lng: float) -> dict[str, Any]:
    api_key = get_google_geocoding_api_key()
    if not api_key:
        return {
            "ok": False,
            "provider": "google-reverse-geocoding",
            "lat": lat,
            "lng": lng,
            "error": "missing_google_geocoding_api_key",
        }

    query = urlencode(
        {
            "latlng": f"{lat:.8f},{lng:.8f}",
            "key": api_key,
            "language": GOOGLE_GEOCODING_LANGUAGE,
            "region": "th",
        }
    )

    request = Request(
        f"{GOOGLE_GEOCODING_API_URL}?{query}",
        method="GET",
        headers={"Accept": "application/json"},
    )

    try:
        with urlopen(request, timeout=20) as response:
            raw_response = response.read().decode("utf-8")
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        return {
            "ok": False,
            "provider": "google-reverse-geocoding",
            "lat": lat,
            "lng": lng,
            "error": "google_http_error",
            "details": body,
        }
    except URLError as error:
        return {
            "ok": False,
            "provider": "google-reverse-geocoding",
            "lat": lat,
            "lng": lng,
            "error": "google_network_error",
            "details": str(error),
        }

    payload = json.loads(raw_response)
    status = str(payload.get("status", "")).strip()
    results = payload.get("results")

    if status != "OK" or not isinstance(results, list) or not results:
        return {
            "ok": False,
            "provider": "google-reverse-geocoding",
            "lat": lat,
            "lng": lng,
            "error": "google_reverse_geocode_failed",
            "status": status or "UNKNOWN_STATUS",
        }

    first_result = results[0]
    if not isinstance(first_result, dict):
        return {
            "ok": False,
            "provider": "google-reverse-geocoding",
            "lat": lat,
            "lng": lng,
            "error": "invalid_google_geocode_result",
        }

    normalized = normalize_geocode_result(first_result, lat, lng)
    normalized["status"] = status
    return normalized


def build_tool_result_message(tool_call_id: str, result: dict[str, Any]) -> dict[str, Any]:
    return {
        "role": "tool",
        "tool_call_id": tool_call_id,
        "content": json.dumps(result, ensure_ascii=False, indent=2),
    }


def build_resolved_location_system_message(result: dict[str, Any]) -> dict[str, str]:
    return {
        "role": "system",
        "content": (
            "Authoritative reverse-geocoding result for the user's current coordinates:\n"
            f"{json.dumps(result, ensure_ascii=False, indent=2)}\n"
            "Use this resolved location as the source of truth. Do not replace it with a guessed city or province."
        ),
    }


def build_geocode_failure_system_message(result: dict[str, Any]) -> dict[str, str]:
    return {
        "role": "system",
        "content": (
            "Reverse geocoding failed for the user's current coordinates.\n"
            f"{json.dumps(result, ensure_ascii=False, indent=2)}\n"
            "Do not guess the district, city, or province. If needed, refer only to the provided latitude and longitude."
        ),
    }


def build_identity_reply_from_resolved_location(result: dict[str, Any]) -> str:
    parts = [
        result.get("district", "").strip(),
        result.get("province", "").strip(),
        result.get("country", "").strip(),
    ]
    readable_location = ", ".join(part for part in parts if part)
    formatted_address = str(result.get("formatted_address", "")).strip()

    if readable_location and formatted_address:
        return (
            f"ตอนนี้คุณอยู่แถว {readable_location} "
            f"โดย Google ระบุตำแหน่งใกล้เคียงเป็น {formatted_address}"
        )

    if formatted_address:
        return f"ตอนนี้ Google ระบุตำแหน่งใกล้เคียงของคุณเป็น {formatted_address}"

    lat = result.get("lat")
    lng = result.get("lng")
    if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
        return build_coordinates_only_reply({"lat": lat, "lng": lng})

    return "ระบบยังสรุปชื่อพื้นที่จากพิกัดนี้ไม่ได้อย่างแน่ชัด"


def build_verified_label_fallback_system_message(
    location: dict[str, Any],
    result: dict[str, Any],
) -> dict[str, str]:
    return {
        "role": "system",
        "content": (
            "Server-side reverse geocoding failed, but the app already has a human-readable "
            "location label from the map client.\n"
            f"Failure details:\n{json.dumps(result, ensure_ascii=False, indent=2)}\n"
            f"Verified app label fallback: {location.get('label', '')}\n"
            "Use the verified app label as the best available location context. "
            "Do not replace it with a guessed district, city, or province."
        ),
    }


def build_location_resolution_failure_reply(
    mode: str,
    location: dict[str, Any],
) -> str:
    if has_verified_place_label(location):
        label = str(location.get("label", "")).strip()
        if mode == "planner":
            return (
                f"ตอนนี้ระบบยืนยันตำแหน่งจาก Google ฝั่งเซิร์ฟเวอร์ไม่ได้ แต่แอประบุตำแหน่งปัจจุบันไว้เป็น {label} "
                "คุณสามารถถามต่อเพื่อวางแผนจุดหมายถัดไปจากตำแหน่งนี้ได้"
            )

        return (
            f"ตอนนี้ระบบยืนยันตำแหน่งจาก Google ฝั่งเซิร์ฟเวอร์ไม่ได้ แต่แอประบุตำแหน่งปัจจุบันไว้เป็น {label} "
            "คุณสามารถถามต่อเรื่องร้านอาหาร ห้องน้ำ ATM หรือสถานที่ใกล้เคียงจากตำแหน่งนี้ได้"
        )

    lat = location.get("lat")
    lng = location.get("lng")
    if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
        if mode == "planner":
            return (
                f"ตอนนี้ระบบยืนยันชื่อสถานที่จริงจาก Google ไม่สำเร็จ จึงเหลือพิกัด {lat:.6f}, {lng:.6f} เท่านั้น "
                "ถ้าต้องการวางแผนต่อจากจุดนี้ ผมจะอิงจากพิกัดโดยไม่เดาชื่ออำเภอหรือจังหวัด"
            )

        return (
            f"ตอนนี้ระบบยืนยันชื่อสถานที่จริงจาก Google ไม่สำเร็จ จึงเหลือพิกัด {lat:.6f}, {lng:.6f} เท่านั้น "
            "ถ้าต้องการหาร้านหรือจุดใกล้เคียง ผมจะอิงจากพิกัดนี้โดยไม่เดาชื่ออำเภอหรือจังหวัด"
        )

    return "ตอนนี้ระบบยังยืนยันตำแหน่งจริงจาก Google ไม่สำเร็จ"


def normalize_map_action(action: Any, mode: str) -> dict[str, Any] | None:
    if mode not in {"nearby", "planner"}:
        return None

    if not isinstance(action, dict):
        return None

    action_type = str(action.get("type", "")).strip()
    query = str(action.get("query", "")).strip()
    label = str(action.get("label", "")).strip()

    if action_type != "pin-place" or not query or not label:
        return None

    return {
        "type": "pin-place",
        "query": query,
        "label": label,
        "mode": mode,
    }


def get_default_map_action_from_planner(
    planner_result: dict[str, Any] | None,
) -> dict[str, Any] | None:
    if not planner_result:
        return None

    itinerary = planner_result.get("itinerary")
    if isinstance(itinerary, list):
        for step in itinerary:
            if not isinstance(step, dict):
                continue

            place = str(step.get("place", "")).strip()
            if place:
                return {
                    "type": "pin-place",
                    "query": place,
                    "label": place,
                    "mode": "planner",
                }

    places = planner_result.get("places")
    if isinstance(places, list):
        for place in places:
            if not isinstance(place, dict):
                continue

            name = str(place.get("name", "")).strip()
            if name:
                return {
                    "type": "pin-place",
                    "query": name,
                    "label": name,
                    "mode": "planner",
                }

    return None


def extract_map_action(
    *,
    mode: str,
    user_message: str,
    assistant_reply: str,
    location: dict[str, Any] | None,
    planner_result: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    if mode not in {"nearby", "planner"}:
        return None

    if not assistant_reply.strip():
        return get_default_map_action_from_planner(planner_result) if mode == "planner" else None

    location_summary = ""
    if location:
        location_summary = json.dumps(location, ensure_ascii=False)

    extraction_prompt = (
        "Extract an optional map action from the assistant reply.\n"
        "Return strict JSON only.\n"
        "If the assistant recommended one specific place that should be pinned on a map, return:\n"
        '{"type":"pin-place","query":"<search query>","label":"<human label>"}\n'
        "The query should be suitable for a Google Maps / Places text search.\n"
        "If the reply is only a follow-up question or does not name a specific place, return null.\n"
        "Do not invent places that are not explicitly or strongly implied by the assistant reply."
    )

    messages = [
        {"role": "system", "content": extraction_prompt},
        {
            "role": "user",
            "content": (
                f"Mode: {mode}\n"
                f"User message: {user_message}\n"
                f"Assistant reply: {assistant_reply}\n"
                f"Current location context: {location_summary or 'none'}"
            ),
        },
    ]

    response = call_typhoon_api(messages, tool_choice="none")
    message = get_first_choice_message(response)
    raw_text = extract_text_from_content(message.get("content"))
    if not raw_text:
        return get_default_map_action_from_planner(planner_result) if mode == "planner" else None

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if not match:
            return get_default_map_action_from_planner(planner_result) if mode == "planner" else None
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError:
            return get_default_map_action_from_planner(planner_result) if mode == "planner" else None

    normalized = normalize_map_action(parsed, mode)
    if normalized:
        return normalized

    return get_default_map_action_from_planner(planner_result) if mode == "planner" else None


def call_typhoon_api(
    messages: list[dict[str, Any]],
    *,
    tools: list[dict[str, Any]] | None = None,
    tool_choice: str | dict[str, Any] | None = None,
) -> dict[str, Any]:
    api_key = os.getenv("TYPHOON_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("TYPHOON_API_KEY is not set")

    payload: dict[str, Any] = {
        "model": TYPHOON_MODEL,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 512,
    }

    if tools:
        payload["tools"] = tools
    if tool_choice is not None:
        payload["tool_choice"] = tool_choice

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

    return json.loads(response_body)


def parse_tool_arguments(raw_arguments: Any) -> dict[str, Any]:
    if isinstance(raw_arguments, dict):
        return raw_arguments

    if isinstance(raw_arguments, str):
        try:
            parsed = json.loads(raw_arguments)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}

    return {}


def execute_reverse_geocode_tool(
    tool_call: dict[str, Any] | None,
    location: dict[str, Any],
) -> dict[str, Any]:
    lat = location.get("lat")
    lng = location.get("lng")

    if tool_call is not None:
        function = tool_call.get("function")
        if isinstance(function, dict):
            arguments = parse_tool_arguments(function.get("arguments"))
            if isinstance(arguments.get("lat"), (int, float)):
                lat = float(arguments["lat"])
            if isinstance(arguments.get("lng"), (int, float)):
                lng = float(arguments["lng"])

    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        return {
            "ok": False,
            "provider": "google-reverse-geocoding",
            "error": "missing_coordinates",
        }

    return reverse_geocode_with_google(float(lat), float(lng))


def call_typhoon(
    message: str,
    mode: str,
    history: list[dict[str, str]] | None = None,
    location: dict[str, Any] | None = None,
    planner_result: dict[str, Any] | None = None,
) -> dict[str, Any]:
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": build_system_prompt(mode)},
    ]

    location_context = build_location_context(mode, location)
    if location_context:
        messages.append({"role": "system", "content": location_context})
    planner_context = build_planner_context(mode, planner_result)
    if planner_context:
        messages.append({"role": "system", "content": planner_context})

    messages.extend(history or [])
    messages.append({"role": "user", "content": message})

    should_enable_location_tool = (
        mode in {"nearby", "planner"} and has_coordinate_location(location)
    )
    tools = [build_reverse_geocode_tool()] if should_enable_location_tool else None
    tool_used = False
    latest_tool_result: dict[str, Any] | None = None

    first_response = call_typhoon_api(
        messages,
        tools=tools,
        tool_choice="required" if should_enable_location_tool else None,
    )
    first_message = get_first_choice_message(first_response)
    assistant_message = build_assistant_message(first_message)
    tool_calls = assistant_message.get("tool_calls")

    if should_enable_location_tool and isinstance(tool_calls, list) and tool_calls:
        tool_used = True
        messages.append(assistant_message)

        for tool_call in tool_calls:
            if not isinstance(tool_call, dict):
                continue

            function = tool_call.get("function")
            function_name = ""
            if isinstance(function, dict):
                function_name = str(function.get("name", "")).strip()

            tool_call_id = str(tool_call.get("id", "")).strip() or "tool-call"

            if function_name != REVERSE_GEOCODE_TOOL_NAME or location is None:
                tool_result = {
                    "ok": False,
                    "error": "unsupported_tool_call",
                    "requested_tool": function_name,
                }
            else:
                tool_result = execute_reverse_geocode_tool(tool_call, location)
                latest_tool_result = tool_result

            messages.append(build_tool_result_message(tool_call_id, tool_result))

        if latest_tool_result and not latest_tool_result.get("ok"):
            if has_verified_place_label(location):
                messages.append(
                    build_verified_label_fallback_system_message(
                        location,
                        latest_tool_result,
                    )
                )
                fallback_response = call_typhoon_api(messages)
                fallback_message = get_first_choice_message(fallback_response)
                fallback_text = extract_text_from_content(
                    fallback_message.get("content")
                )
                if fallback_text:
                    return {
                        "reply": fallback_text,
                        "map_action": extract_map_action(
                            mode=mode,
                            user_message=message,
                            assistant_reply=fallback_text,
                            location=location,
                            planner_result=planner_result,
                        ),
                    }

            if is_location_identity_question(message):
                return {"reply": build_coordinates_only_reply(location)}

            return {"reply": build_location_resolution_failure_reply(mode, location)}

        final_response = call_typhoon_api(messages, tools=tools)
        final_message = get_first_choice_message(final_response)
        final_text = extract_text_from_content(final_message.get("content"))
        if final_text:
            return {
                "reply": final_text,
                "map_action": extract_map_action(
                    mode=mode,
                    user_message=message,
                    assistant_reply=final_text,
                    location=location,
                    planner_result=planner_result,
                ),
            }

    if should_enable_location_tool and not tool_used and location is not None:
        latest_tool_result = execute_reverse_geocode_tool(None, location)
        if latest_tool_result.get("ok"):
            messages.append(build_resolved_location_system_message(latest_tool_result))
            fallback_response = call_typhoon_api(messages)
            fallback_message = get_first_choice_message(fallback_response)
            fallback_text = extract_text_from_content(fallback_message.get("content"))
            if fallback_text:
                return {
                    "reply": fallback_text,
                    "map_action": extract_map_action(
                        mode=mode,
                        user_message=message,
                        assistant_reply=fallback_text,
                        location=location,
                        planner_result=planner_result,
                    ),
                }
        else:
            if has_verified_place_label(location):
                messages.append(
                    build_verified_label_fallback_system_message(
                        location,
                        latest_tool_result,
                    )
                )
                fallback_response = call_typhoon_api(messages)
                fallback_message = get_first_choice_message(fallback_response)
                fallback_text = extract_text_from_content(
                    fallback_message.get("content")
                )
                if fallback_text:
                    return {
                        "reply": fallback_text,
                        "map_action": extract_map_action(
                            mode=mode,
                            user_message=message,
                            assistant_reply=fallback_text,
                            location=location,
                            planner_result=planner_result,
                        ),
                    }

            if is_location_identity_question(message):
                return {"reply": build_coordinates_only_reply(location)}

            return {"reply": build_location_resolution_failure_reply(mode, location)}

    if (
        should_enable_location_tool
        and location is not None
        and is_location_identity_question(message)
    ):
        if latest_tool_result and latest_tool_result.get("ok"):
            return {"reply": build_identity_reply_from_resolved_location(latest_tool_result)}
        return {"reply": build_coordinates_only_reply(location)}

    if tool_used and latest_tool_result and latest_tool_result.get("ok"):
        return {"reply": build_identity_reply_from_resolved_location(latest_tool_result)}

    default_text = extract_text_from_content(first_message.get("content"))
    if default_text:
        return {
            "reply": default_text,
            "map_action": extract_map_action(
                mode=mode,
                user_message=message,
                assistant_reply=default_text,
                location=location,
                planner_result=planner_result,
            ),
        }

    raise RuntimeError("typhoon returned an empty response")


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
            planner_result = normalize_planner_result(payload.get("planner_result"))

            if not message:
                self._write_json(HTTPStatus.BAD_REQUEST, {"error": "message is required"})
                return

            follow_up = None
            if not (mode == "planner" and planner_result):
                follow_up = build_mode_follow_up_question(mode, message)
            if follow_up:
                self._write_json(HTTPStatus.OK, {"reply": follow_up})
                return

            result = call_typhoon(message, mode, history, location, planner_result)
            self._write_json(HTTPStatus.OK, result)
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
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))


if __name__ == "__main__":
    print(f"python chat service listening on {HOST}:{PORT}")
    server = ThreadingHTTPServer((HOST, PORT), ChatHandler)
    server.serve_forever()
