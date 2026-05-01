import { CHAT_TABS } from "../constants";
import type { ChatTab } from "../types";

interface ChatTabsProps {
  activeTab: ChatTab;
  onChange: (tab: ChatTab) => void;
}

export default function ChatTabs({ activeTab, onChange }: ChatTabsProps) {
  return (
    // tabs แยก chatbot ออกเป็น 3 mode ตาม feature เดิม
    <div className="no-scrollbar flex flex-shrink-0 gap-2 overflow-x-auto bg-gray-50 p-2">
      {CHAT_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === tab
              ? "bg-blue-600 text-white shadow-md"
              : "border border-gray-200 bg-white text-gray-600"
          }`}
        >
          {tab === "general" && "💬 General"}
          {tab === "nearby" && "📍 Nearby"}
          {tab === "planner" && "🗺️ Plan Next"}
        </button>
      ))}
    </div>
  );
}
