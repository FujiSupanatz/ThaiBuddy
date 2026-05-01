import { IconCamera, IconMapPin } from "../icons";

interface FloatingActionsProps {
  onOpenVision: () => void;
}

export default function FloatingActions({ onOpenVision }: FloatingActionsProps) {
  return (
    // ปุ่มลอยฝั่งขวาใช้รวม action หลักของหน้า map:
    // - location shortcut
    // - camera / AI vision
    <div className="absolute bottom-6 right-4 z-20 flex flex-col gap-4 transition-all duration-300">
      <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-lg hover:bg-gray-50 active:scale-95">
        <IconMapPin />
      </button>

      <button
        onClick={onOpenVision}
        // ปุ่มนี้ส่งการควบคุมขึ้นไปที่ parent เพื่อสลับ view จาก map -> vision
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/40 transition-transform hover:scale-105 active:scale-95"
      >
        <IconCamera />
      </button>
    </div>
  );
}
