import { IconScan } from "../icons";
import type { VisionTab } from "../types";

interface VisionViewfinderProps {
  isScanning: boolean;
  visionTab: VisionTab;
}

export default function VisionViewfinder({
  isScanning,
  visionTab,
}: VisionViewfinderProps) {
  return (
    // viewfinder จำลองหน้ากล้อง
    // animation scan line จะทำงานเฉพาะตอน isScanning เป็น true
    <div className="relative flex flex-1 items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gray-800 opacity-60">
        <img
          src="https://images.unsplash.com/photo-1588693959247-c0350d220807?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
          alt="Camera background"
          className="h-full w-full object-cover blur-sm opacity-30"
        />
      </div>

      <div className="relative z-10 h-64 w-64 overflow-hidden rounded-3xl border-2 border-white/50 shadow-[0_0_0_4000px_rgba(0,0,0,0.6)]">
        <div className="absolute inset-0 flex items-center justify-center">
          {isScanning ? (
            <div className="absolute top-0 h-1 w-full animate-[scan_2s_ease-in-out_infinite] bg-green-400 shadow-[0_0_10px_#4ade80]" />
          ) : null}
          <IconScan className="h-16 w-16 text-white/30" />
        </div>
      </div>

      <p className="absolute bottom-10 z-10 rounded-full bg-black/40 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-md">
        {visionTab === "currency" ? "Point at Thai Banknotes" : "Point at Thai Signage"}
      </p>
    </div>
  );
}
