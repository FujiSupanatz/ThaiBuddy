import VisionControls from "./vision-controls";
import VisionHeader from "./vision-header";
import VisionViewfinder from "./vision-viewfinder";
import type { CurrencyCode, ViewMode, VisionTab } from "../types";

interface VisionOverlayProps {
  view: ViewMode;
  visionTab: VisionTab;
  thbAmount: string;
  targetCurrency: CurrencyCode;
  isScanning: boolean;
  onClose: () => void;
  onVisionTabChange: (tab: VisionTab) => void;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: CurrencyCode) => void;
}

export default function VisionOverlay({
  view,
  visionTab,
  thbAmount,
  targetCurrency,
  isScanning,
  onClose,
  onVisionTabChange,
  onAmountChange,
  onCurrencyChange,
}: VisionOverlayProps) {
  return (
    // overlay เต็มจอสำหรับ feature vision
    // parent คุมการเปิดปิดผ่าน prop "view" เพื่อให้ state หลักอยู่ที่ landing page
    <div
      className={`absolute inset-0 z-40 flex flex-col bg-black transition-opacity duration-300 ${
        view === "vision" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <VisionHeader onClose={onClose} />
      <VisionViewfinder isScanning={isScanning} visionTab={visionTab} />
      <VisionControls
        visionTab={visionTab}
        thbAmount={thbAmount}
        targetCurrency={targetCurrency}
        onVisionTabChange={onVisionTabChange}
        onAmountChange={onAmountChange}
        onCurrencyChange={onCurrencyChange}
      />
    </div>
  );
}
