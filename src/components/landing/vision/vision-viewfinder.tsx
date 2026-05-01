import { IconScan } from "../icons";
import type { VisionTab } from "../types";

interface VisionViewfinderProps {
  isScanning: boolean;
  visionTab: VisionTab;
  previewUrl: string | null;
  compact: boolean;
}

export default function VisionViewfinder({
  isScanning,
  visionTab,
  previewUrl,
  compact,
}: VisionViewfinderProps) {
  const frameSizeClass = compact
    ? "h-[10.5rem] w-[10.5rem] sm:h-56 sm:w-56"
    : "h-[15rem] w-[15rem] sm:h-64 sm:w-64";

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${
        compact
          ? "flex min-h-[11.5rem] items-center justify-center px-4 pb-3 pt-2 sm:min-h-[16rem]"
          : "flex min-h-[17rem] items-center justify-center px-4 pb-4 pt-3 sm:min-h-[24rem]"
      }`}
    >
      <div className="absolute inset-0 bg-gray-800 opacity-60">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Selected scan preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src="https://images.unsplash.com/photo-1588693959247-c0350d220807?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            alt="Camera background"
            className="h-full w-full object-cover blur-sm opacity-30"
          />
        )}
      </div>

      <div
        className={`relative z-10 overflow-hidden rounded-3xl border-2 border-white/50 shadow-[0_0_0_4000px_rgba(0,0,0,0.6)] ${frameSizeClass}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {isScanning ? (
            <div className="absolute top-0 h-1 w-full animate-[scan_2s_ease-in-out_infinite] bg-green-400 shadow-[0_0_10px_#4ade80]" />
          ) : null}
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Selected image preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <IconScan className="h-16 w-16 text-white/30" />
          )}
        </div>
      </div>

      <p className="absolute bottom-3 z-10 max-w-[calc(100%-2rem)] rounded-full bg-black/50 px-4 py-2 text-center text-xs font-medium text-white/80 backdrop-blur-md sm:bottom-6 sm:text-sm">
        {visionTab === "currency"
          ? "Compare Thai Baht with live exchange rates"
          : "Point at Thai signs, menu boards, or printed menus"}
      </p>
    </div>
  );
}
