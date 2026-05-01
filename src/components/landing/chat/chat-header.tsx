import { IconClose } from "../icons";

interface ChatHeaderProps {
  onClose: () => void;
}

export default function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    // header ของ bottom sheet มีทั้ง drag-handle จำลองและปุ่มปิด
    <div className="relative flex flex-shrink-0 items-center justify-between border-b p-4">
      <div
        className="absolute left-1/2 top-2 h-1.5 w-12 -translate-x-1/2 cursor-pointer rounded-full bg-gray-300"
        onClick={onClose}
      />
      <h2 className="mt-2 text-lg font-bold text-gray-800">AI Companion</h2>
      <button onClick={onClose} className="mt-2 p-1 text-gray-400 hover:text-gray-600">
        <IconClose />
      </button>
    </div>
  );
}
