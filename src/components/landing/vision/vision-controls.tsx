import CurrencyTool from "./currency-tool";
import SignageTool from "./signage-tool";
import VisionTabs from "./vision-tabs";
import type {
  CurrencyCode,
  OCRGeneralResult,
  OCRMenuResult,
  OCRMode,
  VisionTab,
} from "../types";

interface VisionControlsProps {
  visionTab: VisionTab;
  thbAmount: string;
  targetCurrency: CurrencyCode;
  exchangeRate: number | null;
  isRateLoading: boolean;
  rateError: string | null;
  ocrMode: OCRMode;
  selectedImageName: string | null;
  isProcessingOCR: boolean;
  ocrError: string | null;
  generalResult: OCRGeneralResult | null;
  menuResult: OCRMenuResult | null;
  compactResults: boolean;
  onVisionTabChange: (tab: VisionTab) => void;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: CurrencyCode) => void;
  onOCRModeChange: (mode: OCRMode) => void;
  onCameraPick: () => void;
  onFilePick: () => void;
  onRunOCR: () => void;
}

export default function VisionControls({
  visionTab,
  thbAmount,
  targetCurrency,
  exchangeRate,
  isRateLoading,
  rateError,
  ocrMode,
  selectedImageName,
  isProcessingOCR,
  ocrError,
  generalResult,
  menuResult,
  compactResults,
  onVisionTabChange,
  onAmountChange,
  onCurrencyChange,
  onOCRModeChange,
  onCameraPick,
  onFilePick,
  onRunOCR,
}: VisionControlsProps) {
  return (
    <div className="safe-bottom z-50 min-h-0 flex-1 overflow-y-auto rounded-t-3xl bg-gray-900 px-4 pb-8 pt-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <VisionTabs visionTab={visionTab} onChange={onVisionTabChange} />

      {visionTab === "currency" && (
        <CurrencyTool
          thbAmount={thbAmount}
          targetCurrency={targetCurrency}
          exchangeRate={exchangeRate}
          isRateLoading={isRateLoading}
          rateError={rateError}
          onAmountChange={onAmountChange}
          onCurrencyChange={onCurrencyChange}
        />
      )}

      {visionTab === "signage" && (
        <SignageTool
          ocrMode={ocrMode}
          targetCurrency={targetCurrency}
          selectedImageName={selectedImageName}
          isProcessing={isProcessingOCR}
          ocrError={ocrError}
          generalResult={generalResult}
          menuResult={menuResult}
          compactResults={compactResults}
          onModeChange={onOCRModeChange}
          onCameraPick={onCameraPick}
          onFilePick={onFilePick}
          onRunOCR={onRunOCR}
        />
      )}
    </div>
  );
}
