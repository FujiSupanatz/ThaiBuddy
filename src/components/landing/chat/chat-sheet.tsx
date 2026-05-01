import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./chat-header";
import ChatInput from "./chat-input";
import ChatMessages from "./chat-messages";
import ChatTabs from "./chat-tabs";
import PlannerPanel from "./planner-panel";
import type { ChatTab, MapAction, Message, PlannerResult } from "../types";

interface ChatSheetProps {
  chatOpen: boolean;
  chatTab: ChatTab;
  messages: Message[];
  inputText: string;
  isSending: boolean;
  locationNotice?: string | null;
  plannerResult?: PlannerResult | null;
  onClose: () => void;
  onTabChange: (tab: ChatTab) => void;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPlannerPlaceSelect: (action: MapAction) => void;
}

type MobileSheetState = "expanded" | "collapsed";

const SWIPE_THRESHOLD = 48;

export default function ChatSheet({
  chatOpen,
  chatTab,
  messages,
  inputText,
  isSending,
  locationNotice,
  plannerResult,
  onClose,
  onTabChange,
  onInputChange,
  onSubmit,
  onPlannerPlaceSelect,
}: ChatSheetProps) {
  const [mobileSheetState, setMobileSheetState] =
    useState<MobileSheetState>("expanded");
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (chatOpen) {
      setMobileSheetState("expanded");
    }
  }, [chatOpen]);

  const handleToggleCollapse = () => {
    setMobileSheetState((current) =>
      current === "expanded" ? "collapsed" : "expanded",
    );
  };

  const handleTouchStart = (clientY: number) => {
    touchStartYRef.current = clientY;
  };

  const handleTouchEnd = (clientY: number) => {
    if (touchStartYRef.current === null) {
      return;
    }

    const deltaY = clientY - touchStartYRef.current;
    touchStartYRef.current = null;

    if (deltaY > SWIPE_THRESHOLD) {
      setMobileSheetState("collapsed");
      return;
    }

    if (deltaY < -SWIPE_THRESHOLD) {
      setMobileSheetState("expanded");
    }
  };

  const isCollapsed = mobileSheetState === "collapsed";

  return (
    <div
      className={`safe-bottom absolute bottom-0 z-30 flex w-full flex-col rounded-t-3xl bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-[height,transform] duration-300 ease-in-out lg:bottom-4 lg:right-4 lg:left-auto lg:h-[75vh] lg:max-h-[700px] lg:w-[440px] lg:rounded-3xl ${
        chatOpen ? "translate-y-0" : "translate-y-full lg:translate-y-[120%]"
      } ${isCollapsed ? "h-[11.5rem]" : "h-[85dvh]"}`}
    >
      <ChatHeader
        onClose={onClose}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onHandleTouchStart={handleTouchStart}
        onHandleTouchEnd={handleTouchEnd}
      />
      <ChatTabs activeTab={chatTab} onChange={onTabChange} />
      <div
        className={`min-h-0 flex-1 flex-col overflow-hidden ${
          isCollapsed ? "hidden lg:flex" : "flex"
        }`}
      >
        <ChatMessages messages={messages} isSending={isSending} />
        {chatTab === "planner" && plannerResult ? (
          <PlannerPanel
            plannerResult={plannerResult}
            onPinPlace={onPlannerPlaceSelect}
          />
        ) : null}
        <ChatInput
          value={inputText}
          isSending={isSending}
          locationNotice={locationNotice}
          onChange={onInputChange}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}
