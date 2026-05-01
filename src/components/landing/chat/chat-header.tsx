import { IconClose } from "../icons";

interface ChatHeaderProps {
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onHandleTouchStart: (clientY: number) => void;
  onHandleTouchEnd: (clientY: number) => void;
}

export default function ChatHeader({
  onClose,
  isCollapsed,
  onToggleCollapse,
  onHandleTouchStart,
  onHandleTouchEnd,
}: ChatHeaderProps) {
  return (
    <div className="relative flex flex-shrink-0 items-center justify-between border-b px-4 pb-4 pt-8">
      <div
        className="absolute left-1/2 top-0 flex h-12 w-40 -translate-x-1/2 cursor-pointer items-center justify-center"
        onClick={onToggleCollapse}
        onTouchStart={(event) => onHandleTouchStart(event.changedTouches[0]?.clientY ?? 0)}
        onTouchEnd={(event) => onHandleTouchEnd(event.changedTouches[0]?.clientY ?? 0)}
      >
        <div
          className={`h-2.5 w-28 rounded-full transition-colors ${
            isCollapsed ? "bg-blue-300" : "bg-gray-300"
          }`}
        />
      </div>
      <h2 className="mt-2 text-lg font-bold text-gray-800">AI Companion</h2>
      <button onClick={onClose} className="mt-2 p-1 text-gray-400 hover:text-gray-600">
        <IconClose />
      </button>
    </div>
  );
}
