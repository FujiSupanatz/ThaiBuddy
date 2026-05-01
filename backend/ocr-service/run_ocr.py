from ocr import ThaiOCRPipeline
from ocr.paths import PROJECT_ROOT

BASE = PROJECT_ROOT


def main():
    pipeline = ThaiOCRPipeline(mode="general")
    filename = "rules.jpg"
    results = pipeline.run(
        image_path=BASE / "images" / filename,
        currency="USD",
        scale=2.0,
        denoise=True,
        threshold=False,
    )

    for r in results:
        print(r)

    # OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    # df.to_csv(OUTPUT_DIR / f"{filename}.csv", index=False, encoding="utf-8-sig")


if __name__ == "__main__":
    main()
