import type { FormEvent } from "react";

import ChatHeader from "./chat-header";
import ChatInput from "./chat-input";
import ChatMessages from "./chat-messages";
import ChatTabs from "./chat-tabs";
import type { ChatTab, Message } from "../types";

interface ChatSheetProps {
  chatOpen: boolean;
  chatTab: ChatTab;
  messages: Message[];
  inputText: string;
  isSending: boolean;
  onClose: () => void;
  onTabChange: (tab: ChatTab) => void;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function ChatSheet({
  chatOpen,
  chatTab,
  messages,
  inputText,
  isSending,
  onClose,
  onTabChange,
  onInputChange,
  onSubmit,
}: ChatSheetProps) {
  return (
    // bottom sheet หลักของ feature chat
    // แยกย่อยเป็น header, tabs, messages, input เพื่อให้อ่านและแก้ง่าย
    <div
      className={`absolute bottom-0 z-30 flex h-[80vh] w-full flex-col rounded-t-3xl bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out ${
        chatOpen ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <ChatHeader onClose={onClose} />
      <ChatTabs activeTab={chatTab} onChange={onTabChange} />
      <ChatMessages messages={messages} />
      <ChatInput
        value={inputText}
        isSending={isSending}
        onChange={onInputChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}
