from pathlib import Path

import cv2

from .paths import PREPROCESS_DIR


def preprocess_for_ocr(
    image_path: str | Path,
    output_path: str | Path | None = None,
    scale: float = 2.0,
    denoise: bool = True,
    threshold: bool = False,
) -> str:
    image_path = Path(image_path)

    if output_path is None:
        PREPROCESS_DIR.mkdir(parents=True, exist_ok=True)
        output_path = PREPROCESS_DIR / f"{image_path.stem}_ocr{image_path.suffix}"
    else:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

    img = cv2.imread(str(image_path))
    if img is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")

    if scale != 1.0:
        img = cv2.resize(
            img,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_CUBIC,
        )

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(4, 4),
    )
    gray = clahe.apply(gray)

    if denoise:
        gray = cv2.fastNlMeansDenoising(
            gray,
            None,
            h=10,
            templateWindowSize=7,
            searchWindowSize=21,
        )

    blur = cv2.GaussianBlur(gray, (0, 0), sigmaX=1.0)
    sharp = cv2.addWeighted(gray, 1.5, blur, -0.5, 0)

    if threshold:
        sharp = cv2.adaptiveThreshold(
            sharp,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=31,
            C=11,
        )

    cv2.imwrite(str(output_path), sharp)
    return str(output_path)
