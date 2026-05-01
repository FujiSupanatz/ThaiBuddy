from pydantic import BaseModel, Field


class MenuItem(BaseModel):
    thai_name: str
    english_name: str | None = None
    price_thb: float | None = None
    confidence: float = Field(ge=0, le=1)


class OCRResponse(BaseModel):
    items: list[MenuItem]
    uncertain_text: list[str] = []


class OCRTextBlock(BaseModel):
    text: str
    confidence: float = Field(ge=0, le=1)


class GeneralOCRResponse(BaseModel):
    text: str
    translate_text: str
