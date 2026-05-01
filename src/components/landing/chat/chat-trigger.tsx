import { IconMessage } from "../icons";

interface ChatTriggerProps {
  onOpen: () => void;
}

export default function ChatTrigger({ onOpen }: ChatTriggerProps) {
  return (
    // แถบล่างสำหรับเรียกเปิด chat อย่างรวดเร็วเมื่อยังไม่ได้เปิด bottom sheet
    <div
      onClick={onOpen}
      className="safe-bottom absolute bottom-6 left-4 right-20 z-20 flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-4 shadow-xl transition-all hover:bg-gray-50 active:scale-95 lg:left-auto lg:w-[340px]"
    >
      <div className="rounded-full bg-green-100 p-2 text-green-600">
        <IconMessage />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">Travel Assistant</p>
        <p className="text-xs text-gray-500">Ask, Find Nearby, or Plan</p>
      </div>
    </div>
  );
}
