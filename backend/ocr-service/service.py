import os
import sys
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

CURRENT_DIR = Path(__file__).resolve().parent
PARENT_DIR = CURRENT_DIR.parent

if str(PARENT_DIR) not in sys.path:
    sys.path.insert(0, str(PARENT_DIR))

load_dotenv(CURRENT_DIR / ".env", override=False)

from ocr import ThaiOCRPipeline  # noqa: E402
from ocr.currency import get_exchange_rate  # noqa: E402

app = FastAPI(title="ThatBuddy OCR Service")


def serialize_menu_frame(frame, currency: str):
    items = frame.where(frame.notna(), None).to_dict(orient="records")
    return {
        "items": items,
        "currency": currency.upper(),
        "count": len(items),
    }


def save_upload_to_temp(upload: UploadFile) -> Path:
    suffix = Path(upload.filename or "upload.jpg").suffix or ".jpg"
    upload.file.seek(0)
    content = upload.file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        temp_file.write(content)
        temp_file.flush()
    finally:
        temp_file.close()
        upload.file.close()
    return Path(temp_file.name)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ocr-service",
        "has_typhoon_key": bool(os.getenv("TYPHOON_API_KEY")),
    }


@app.get("/exchange-rate")
def exchange_rate(from_currency: str = "THB", to_currency: str = "USD"):
    try:
        rate = get_exchange_rate(from_currency, to_currency)
    except Exception as error:  # pragma: no cover - network/provider errors
        raise HTTPException(status_code=502, detail=str(error)) from error

    return {
        "from_currency": from_currency.upper(),
        "to_currency": to_currency.upper(),
        "rate": rate,
    }


@app.post("/ocr/general")
def ocr_general(
    file: UploadFile = File(...),
    scale: float = Form(2.0),
    denoise: bool = Form(True),
    threshold: bool = Form(False),
):
    image_path = save_upload_to_temp(file)

    try:
        pipeline = ThaiOCRPipeline(mode="general")
        thai_text, english_text = pipeline.run(
            image_path=image_path,
            scale=scale,
            denoise=denoise,
            threshold=threshold,
        )
    except Exception as error:  # pragma: no cover - runtime/provider errors
        raise HTTPException(status_code=502, detail=str(error)) from error
    finally:
        image_path.unlink(missing_ok=True)

    return {
        "text": thai_text,
        "translate_text": english_text,
    }


@app.post("/ocr/menu")
def ocr_menu(
    file: UploadFile = File(...),
    currency: str = Form("USD"),
    scale: float = Form(2.0),
    denoise: bool = Form(True),
    threshold: bool = Form(False),
):
    image_path = save_upload_to_temp(file)

    try:
        pipeline = ThaiOCRPipeline(mode="menu")
        frame = pipeline.run(
            image_path=image_path,
            currency=currency,
            scale=scale,
            denoise=denoise,
            threshold=threshold,
        )
    except Exception as error:  # pragma: no cover - runtime/provider errors
        raise HTTPException(status_code=502, detail=str(error)) from error
    finally:
        image_path.unlink(missing_ok=True)

    return JSONResponse(serialize_menu_frame(frame, currency))
