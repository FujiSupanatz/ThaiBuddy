import { IconCamera } from "../icons";

interface FloatingActionsProps {
  onOpenVision: () => void;
}

export default function FloatingActions({ onOpenVision }: FloatingActionsProps) {
  return (
    <div className="absolute bottom-6 right-4 z-20 flex flex-col gap-4 transition-all duration-300">
      <button
        onClick={onOpenVision}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/40 transition-transform hover:scale-105 active:scale-95"
      >
        <IconCamera />
      </button>
    </div>
  );
}
