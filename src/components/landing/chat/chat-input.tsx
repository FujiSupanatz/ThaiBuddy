import type { FormEvent } from "react";

import { IconSend } from "../icons";

interface ChatInputProps {
  value: string;
  isSending: boolean;
  locationNotice?: string | null;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function ChatInput({
  value,
  isSending,
  locationNotice,
  onChange,
  onSubmit,
}: ChatInputProps) {
  return (
    // input form นี้ไม่เก็บ state เอง
    // รับค่าจาก parent เพื่อให้ state management อยู่จุดเดียว
    <div className="flex-shrink-0 border-t bg-white p-4">
      {locationNotice ? (
        <div className="mb-3 rounded-xl bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
          {locationNotice}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="relative flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={isSending ? "Sending..." : "Ask me anything..."}
          disabled={isSending}
          className="flex-1 rounded-full bg-gray-100 py-3 pl-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isSending}
          className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
        >
          <IconSend />
        </button>
      </form>
    </div>
  );
}
