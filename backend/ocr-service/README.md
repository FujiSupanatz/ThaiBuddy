# Tourism OCR

The main entry point is `ocr.ThaiOCRPipeline`.

Two modes are supported:

- `general`: returns cleaned Thai text and an English translation
- `menu`: returns structured menu items with prices and translated names

The pipeline does the following:

1. preprocesses the image with OpenCV
2. sends the processed image to Typhoon OCR
3. saves raw OCR text to `ocr/cache/text/` when enabled
4. parses the OCR text with a Typhoon text model
5. returns either parsed text or a `pandas.DataFrame`

## Requirements
- in `requirements.txt`
## Environment Variables

Set these before running the pipeline:

- `TYPHOON_API_KEY`: required for both OCR and text parsing
- `OPENROUTER_API_KEY`: loaded by `ocr/config.py`, currently not used by this pipeline

Example:

```bash
export TYPHOON_API_KEY="your_key_here"
```

## Install

Using `uv`:

```bash
uv sync
```

## Usage

### General OCR

Use this mode for documents, signs, or any non-menu text.

```python
from ocr import ThaiOCRPipeline

pipeline = ThaiOCRPipeline(mode="general")
thai_text, english_text = pipeline.run(
    image_path="images/rules.jpg",
    scale=2.0,
    denoise=True,
    threshold=False,
)

print(thai_text)
print(english_text)
```

Return value:

- a 2-tuple: `(text, translate_text)`

### Menu OCR

Use this mode for restaurant menus or price lists.

```python
from ocr import ThaiOCRPipeline

pipeline = ThaiOCRPipeline(mode="menu")
df = pipeline.run(
    image_path="images/thai_menu.jpg",
    currency="USD",
    scale=2.0,
    denoise=True,
    threshold=False,
)

print(df)
```

Return value:

- a `pandas.DataFrame`
- columns include:
  - `thai_name`
  - `english_name`
  - `price_thb`
  - `confidence`
  - `price_<currency>` such as `price_usd`

If no menu items are detected, the pipeline returns an empty `DataFrame`.

## Example Script

`run_ocr.py` shows a simple local example using `images/rules.jpg`.

Run it with:

```bash
python run_ocr.py
```

## Cache Output

The pipeline writes intermediate files under `ocr/cache/`:

- `ocr/cache/preprocess/`: preprocessed images
- `ocr/cache/text/`: OCR text outputs
- `ocr/cache/output/`: intended for downstream CSV output

These cached files are useful for debugging OCR quality in production.

## Package Layout

- `ocr/pipeline.py`: pipeline orchestration
- `ocr/preprocess.py`: image preprocessing
- `ocr/ocr_backends.py`: Typhoon OCR client
- `ocr/parser_backends.py`: Typhoon JSON parsers
- `ocr/currency.py`: currency conversion helper
- `ocr/schemas.py`: Pydantic response models
- `ocr/paths.py`: cache directory helpers
