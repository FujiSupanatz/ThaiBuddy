import { IconClose } from "../icons";

interface VisionHeaderProps {
  onClose: () => void;
}

export default function VisionHeader({ onClose }: VisionHeaderProps) {
  return (
    // ส่วนหัวของ vision overlay ใช้ปุ่ม close กลับไปที่หน้า map
    <div className="safe-top z-50 flex items-center justify-between bg-gradient-to-b from-black to-transparent p-4 pt-6 text-white">
      <button onClick={onClose} className="rounded-full bg-white/20 p-2 backdrop-blur-md">
        <IconClose />
      </button>
      <div className="font-semibold tracking-wide">AI Vision Lens</div>
      <div className="w-10" />
    </div>
  );
}
