from pathlib import Path


PACKAGE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_DIR.parent
CACHE_DIR = PACKAGE_DIR / "cache"
PREPROCESS_DIR = CACHE_DIR / "preprocess"
TEXT_DIR = CACHE_DIR / "text"
OUTPUT_DIR = CACHE_DIR / "output"
