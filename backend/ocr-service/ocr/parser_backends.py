import json
import re
from abc import ABC, abstractmethod

from openai import OpenAI

from .config import (
    TYPHOON_API_KEY,
    TYPHOON_TEXT_MAX_TOKENS,
    TYPHOON_TEXT_TEMP,
    TYPHOON_TEXT_TOP_P,
)
from .schemas import GeneralOCRResponse, OCRResponse

MENU_SYSTEM_PROMPT = """
You are a Thai menu parser.

Extract menu items and prices from OCR markdown. Then, translate Thai to English.

Return raw JSON only. Do not use markdown.

Schema:
{
  "items": [
    {
      "thai_name": "string",
      "english_name": "string or null",
      "price_thb": "float or null",
      "confidence": "range between 0 to 1"
    }
  ],
  "uncertain_text": ["string"]
}

Rules:
- Ignore headings.
- Extract each menu row or bullet as one item.
- Each item should include menu name, options if present, and price.
- Correct garbled or misspelled Thai OCR text.
- Translate Thai to English if English is missing.
- If price is unclear, use null.
- Return JSON only.
"""

GENERAL_SYSTEM_PROMPT = """
You are a general-purpose OCR text parser and professional translator.

Your task is to convert raw OCR markdown into clean, structured JSON. You must fix Thai spelling errors caused by OCR artifacts (e.g., tone mark misplacements or character confusion) and provide a English translation.

**Rules:**
1. **Fix OCR Errors:** Correct obvious Thai spelling mistakes before translating.
2. **Professional Translation:** Do not translate word-for-word. Use native English grammar.
3. **Preserve Structure:** Maintain the original numbering and line sequence.
4. **Output Format:** Return raw JSON only. 

**Schema:**
{
  "text": "Cleaned Thai text with corrected spelling",
  "translate_text": "Professional English translation"
}
"""


def clean_json(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


class ParserBackend(ABC):
    @abstractmethod
    def parse(self, text: str):
        pass


class TyphoonMenuParser(ParserBackend):
    def __init__(
        self,
        api_key: str | None = None,
        model: str = "typhoon-v2.5-30b-a3b-instruct",
    ):
        self.api_key = api_key or TYPHOON_API_KEY
        self.model = model

        if not self.api_key:
            raise ValueError("Missing TYPHOON_API_KEY")

        self.client = OpenAI(
            base_url="https://api.opentyphoon.ai/v1",
            api_key=self.api_key,
        )

    def parse(self, text: str) -> OCRResponse:
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": MENU_SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=TYPHOON_TEXT_TEMP,
            top_p=TYPHOON_TEXT_TOP_P,
            max_completion_tokens=TYPHOON_TEXT_MAX_TOKENS,
        )

        raw = resp.choices[0].message.content or ""
        data = json.loads(clean_json(raw))

        return OCRResponse.model_validate(data)


class TyphoonGeneralParser(ParserBackend):
    def __init__(
        self,
        api_key: str | None = None,
        model: str = "typhoon-v2.5-30b-a3b-instruct",
    ):
        self.api_key = api_key or TYPHOON_API_KEY
        self.model = model

        if not self.api_key:
            raise ValueError("Missing TYPHOON_API_KEY")

        self.client = OpenAI(
            base_url="https://api.opentyphoon.ai/v1",
            api_key=self.api_key,
        )

    def parse(self, text: str) -> GeneralOCRResponse:
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=TYPHOON_TEXT_TEMP,
            top_p=TYPHOON_TEXT_TOP_P,
            max_completion_tokens=TYPHOON_TEXT_MAX_TOKENS,
        )

        raw = resp.choices[0].message.content or ""
        data = json.loads(clean_json(raw))

        return GeneralOCRResponse.model_validate(data)
