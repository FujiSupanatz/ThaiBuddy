import { IconCamera, IconScan } from "../icons";
import type {
  CurrencyCode,
  OCRGeneralResult,
  OCRMenuResult,
  OCRMode,
} from "../types";

interface SignageToolProps {
  ocrMode: OCRMode;
  targetCurrency: CurrencyCode;
  selectedImageName: string | null;
  isProcessing: boolean;
  ocrError: string | null;
  generalResult: OCRGeneralResult | null;
  menuResult: OCRMenuResult | null;
  compactResults: boolean;
  onModeChange: (mode: OCRMode) => void;
  onCameraPick: () => void;
  onFilePick: () => void;
  onRunOCR: () => void;
}

export default function SignageTool({
  ocrMode,
  targetCurrency,
  selectedImageName,
  isProcessing,
  ocrError,
  generalResult,
  menuResult,
  compactResults,
  onModeChange,
  onCameraPick,
  onFilePick,
  onRunOCR,
}: SignageToolProps) {
  return (
    <div className="animate-in slide-in-from-bottom-4 fade-in space-y-4 py-1 duration-300">
      <div className="rounded-2xl border border-gray-800 bg-gray-800/60 p-3">
        <div className="mb-3 flex rounded-full bg-gray-800 p-1">
          <button
            onClick={() => onModeChange("general")}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              ocrMode === "general" ? "bg-indigo-600 text-white" : "text-gray-400"
            }`}
          >
            Sign / Text
          </button>
          <button
            onClick={() => onModeChange("menu")}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              ocrMode === "menu" ? "bg-indigo-600 text-white" : "text-gray-400"
            }`}
          >
            Menu OCR
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            onClick={onCameraPick}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:border-indigo-500"
          >
            <IconCamera className="h-4 w-4" />
            Open Camera
          </button>
          <button
            onClick={onFilePick}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:border-indigo-500"
          >
            <IconScan className="h-4 w-4" />
            Upload Image
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-gray-700 bg-black/20 p-3 text-xs text-gray-300">
          {selectedImageName ? (
            <p className="truncate">Selected image: {selectedImageName}</p>
          ) : (
            <p>
              {ocrMode === "general"
                ? "Pick a street sign, menu board, or any Thai text image."
                : `Pick a Thai food menu image. Prices will be converted to ${targetCurrency}.`}
            </p>
          )}
        </div>

        <button
          onClick={onRunOCR}
          disabled={!selectedImageName || isProcessing}
          className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
        >
          {isProcessing
            ? "Processing image..."
            : ocrMode === "general"
              ? "Read And Translate"
              : "Read Menu And Convert Prices"}
        </button>

        {ocrError && (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            {ocrError}
          </p>
        )}
      </div>

      {ocrMode === "general" && generalResult && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-gray-800 bg-gray-800/60 p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-gray-400">
              Detected Thai Text
            </p>
            <div
              className={`text-sm leading-6 text-white ${
                compactResults ? "max-h-[24vh] overflow-y-auto pr-1" : ""
              }`}
            >
              <p className="whitespace-pre-wrap">{generalResult.text}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-600/10 p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-indigo-300">
              Translation
            </p>
            <div
              className={`text-sm leading-6 text-white ${
                compactResults ? "max-h-[24vh] overflow-y-auto pr-1" : ""
              }`}
            >
              <p className="whitespace-pre-wrap">{generalResult.translate_text}</p>
            </div>
          </div>
        </div>
      )}

      {ocrMode === "menu" && menuResult && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-gray-800 bg-gray-800/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                Menu Items
              </p>
              <p className="shrink-0 text-xs text-gray-400">{menuResult.count} items</p>
            </div>

            <div
              className={`space-y-3 ${
                compactResults ? "max-h-[42vh] overflow-y-auto pr-1" : ""
              }`}
            >
              {menuResult.items.length === 0 ? (
                <p className="text-sm text-gray-300">
                  No menu items were detected from this image.
                </p>
              ) : (
                menuResult.items.map((item, index) => {
                  const convertedField =
                    `price_${menuResult.currency.toLowerCase()}` as keyof typeof item;
                  const convertedValue = item[convertedField];

                  return (
                    <div
                      key={`${item.thai_name}-${index}`}
                      className="rounded-xl border border-gray-700 bg-gray-900/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold leading-6 text-white">
                            {item.english_name || item.thai_name}
                          </p>
                          {item.english_name && (
                            <p className="mt-1 break-words text-xs leading-5 text-gray-400">
                              {item.thai_name}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-white">
                            {item.price_thb !== null ? `฿${item.price_thb}` : "No THB price"}
                          </p>
                          {typeof convertedValue === "number" && (
                            <p className="mt-1 text-xs leading-5 text-indigo-300">
                              {convertedValue.toFixed(2)} {menuResult.currency}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
