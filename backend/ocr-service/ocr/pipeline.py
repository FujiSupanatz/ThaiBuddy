from pathlib import Path

import pandas as pd

from .currency import get_exchange_rate
from .ocr_backends import OCRBackend, TyphoonOCRBackend
from .parser_backends import ParserBackend, TyphoonGeneralParser, TyphoonMenuParser
from .paths import TEXT_DIR
from .preprocess import preprocess_for_ocr


class ThaiOCRPipeline:
    def __init__(
        self,
        ocr_backend: OCRBackend | None = None,
        parser_backend: ParserBackend | None = None,
        mode: str = "general",
    ):
        self.ocr_backend = ocr_backend or TyphoonOCRBackend()
        self.mode = mode
        if parser_backend is not None:
            self.parser_backend = parser_backend
        elif mode == "general":
            self.parser_backend = TyphoonGeneralParser()
        else:
            self.parser_backend = TyphoonMenuParser()

    def run(
        self,
        image_path: str | Path,
        currency: str = "USD",
        scale: float = 2.0,
        denoise: bool = True,
        threshold: bool = False,
        save_ocr_text: bool = True,
    ) -> pd.DataFrame:
        image_path = Path(image_path)

        processed_path = preprocess_for_ocr(
            image_path=image_path,
            scale=scale,
            denoise=denoise,
            threshold=threshold,
        )

        text = self.ocr_backend.extract_text(processed_path)

        if save_ocr_text:
            TEXT_DIR.mkdir(parents=True, exist_ok=True)
            text_path = TEXT_DIR / f"{image_path.stem}_ocr.txt"
            text_path.write_text(text, encoding="utf-8")

        parsed = self.parser_backend.parse(text)

        if self.mode == "general":
            return parsed.text, parsed.translate_text

        df = pd.DataFrame([item.model_dump() for item in parsed.items])

        if df.empty:
            return df

        currency = currency.upper()
        rate = get_exchange_rate("THB", currency)

        df[f"price_{currency.lower()}"] = df["price_thb"].apply(
            lambda x: round(x * rate, 2) if pd.notna(x) else None
        )

        return df
