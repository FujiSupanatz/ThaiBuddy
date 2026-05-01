import type { VisionTab } from "../types";

interface VisionTabsProps {
  visionTab: VisionTab;
  onChange: (tab: VisionTab) => void;
}

export default function VisionTabs({ visionTab, onChange }: VisionTabsProps) {
  return (
    // tabs ของ vision แยก 2 feature เดิม:
    // - currency reader
    // - translate sign
    <div className="relative mb-6 flex rounded-full bg-gray-800 p-1">
      <button
        onClick={() => onChange("currency")}
        className={`z-10 flex-1 rounded-full py-2.5 text-sm font-medium transition-colors ${
          visionTab === "currency" ? "text-white" : "text-gray-400"
        }`}
      >
        💵 Currency
      </button>
      <button
        onClick={() => onChange("signage")}
        className={`z-10 flex-1 rounded-full py-2.5 text-sm font-medium transition-colors ${
          visionTab === "signage" ? "text-white" : "text-gray-400"
        }`}
      >
        🪧 Translate Sign
      </button>
      <div
        className={`absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-indigo-600 transition-all duration-300 ease-out ${
          visionTab === "currency" ? "left-1" : "left-[calc(50%+2px)]"
        }`}
      />
    </div>
  );
}
