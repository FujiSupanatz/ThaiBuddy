import json
from abc import ABC, abstractmethod
from pathlib import Path

import requests

from .config import (
    TYPHOON_API_KEY,
    TYPHOON_OCR_TEMP,
    TYPHOON_OCR_TOP_P,
)


class OCRBackend(ABC):
    @abstractmethod
    def extract_text(self, image_path: str | Path) -> str:
        pass


class TyphoonOCRBackend(OCRBackend):
    def __init__(
        self,
        api_key: str | None = None,
        model: str = "typhoon-ocr",
        task_type: str = "default",
        max_tokens: int = 16384,
    ):
        self.api_key = api_key or TYPHOON_API_KEY
        self.model = model
        self.task_type = task_type
        self.max_tokens = max_tokens
        self.url = "https://api.opentyphoon.ai/v1/ocr"

        if not self.api_key:
            raise ValueError("Missing TYPHOON_API_KEY")

    def extract_text(self, image_path: str | Path) -> str:
        image_path = Path(image_path)

        with open(image_path, "rb") as file:
            files = {"file": file}
            data = {
                "model": self.model,
                "task_type": self.task_type,
                "max_tokens": str(self.max_tokens),
                "temperature": str(TYPHOON_OCR_TEMP),
                "top_p": str(TYPHOON_OCR_TOP_P),
                "repetition_penalty": "1.2",
            }
            headers = {"Authorization": f"Bearer {self.api_key}"}

            response = requests.post(
                self.url,
                files=files,
                data=data,
                headers=headers,
                timeout=120,
            )
            response.raise_for_status()

        result = response.json()

        texts: list[str] = []

        for page_result in result.get("results", []):
            if not page_result.get("success"):
                continue

            content = page_result["message"]["choices"][0]["message"]["content"]

            try:
                parsed = json.loads(content)
                texts.append(parsed.get("natural_text", content))
            except json.JSONDecodeError:
                texts.append(content)

        return "\n".join(texts)
