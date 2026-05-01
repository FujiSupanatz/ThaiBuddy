import CurrencyTool from "./currency-tool";
import SignageTool from "./signage-tool";
import VisionTabs from "./vision-tabs";
import type { CurrencyCode, VisionTab } from "../types";

interface VisionControlsProps {
  visionTab: VisionTab;
  thbAmount: string;
  targetCurrency: CurrencyCode;
  onVisionTabChange: (tab: VisionTab) => void;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: CurrencyCode) => void;
}

export default function VisionControls({
  visionTab,
  thbAmount,
  targetCurrency,
  onVisionTabChange,
  onAmountChange,
  onCurrencyChange,
}: VisionControlsProps) {
  return (
    // แผงควบคุมด้านล่างของ vision overlay
    // เป็นตัวตัดสินใจว่าจะ render currency tool หรือ signage tool
    <div className="z-50 rounded-t-3xl bg-gray-900 px-4 pb-8 pt-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <VisionTabs visionTab={visionTab} onChange={onVisionTabChange} />

      {visionTab === "currency" && (
        <CurrencyTool
          thbAmount={thbAmount}
          targetCurrency={targetCurrency}
          onAmountChange={onAmountChange}
          onCurrencyChange={onCurrencyChange}
        />
      )}

      {visionTab === "signage" && <SignageTool />}
    </div>
  );
}
