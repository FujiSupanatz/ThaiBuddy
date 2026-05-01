import { IconScan } from "../icons";

export default function SignageTool() {
  return (
    // content ของ tab signage
    // ตอนนี้ยังเป็น mock UI สำหรับ flow การแปลป้ายจากภาพ/กล้อง
    <div className="animate-in slide-in-from-bottom-4 fade-in py-4 text-center duration-300">
      <div className="mb-3 inline-block rounded-full bg-white/10 p-4">
        <IconScan className="h-8 w-8 text-indigo-400" />
      </div>
      <p className="font-medium text-white">Auto-Detecting Thai Text...</p>
      <p className="mt-1 text-sm text-gray-400">
        Hold camera steady over street signs or menus.
      </p>
      <button className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-xs text-white hover:bg-indigo-700">
        Simulate Translation Overlay
      </button>
    </div>
  );
}
