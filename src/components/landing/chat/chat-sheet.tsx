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
  locationNotice?: string | null;
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
  locationNotice,
  onClose,
  onTabChange,
  onInputChange,
  onSubmit,
}: ChatSheetProps) {
  return (
    // bottom sheet หลักของ feature chat
    // แยกย่อยเป็น header, tabs, messages, input เพื่อให้อ่านและแก้ง่าย
    <div
      className={`safe-bottom absolute bottom-0 z-30 flex h-[80vh] w-full flex-col rounded-t-3xl bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out lg:bottom-4 lg:right-4 lg:left-auto lg:h-[75vh] lg:max-h-[700px] lg:w-[440px] lg:rounded-3xl ${
        chatOpen ? "translate-y-0" : "translate-y-full lg:translate-y-[120%]"
      }`}
    >
      <ChatHeader onClose={onClose} />
      <ChatTabs activeTab={chatTab} onChange={onTabChange} />
      <ChatMessages messages={messages} />
      <ChatInput
        value={inputText}
        isSending={isSending}
        locationNotice={locationNotice}
        onChange={onInputChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}
