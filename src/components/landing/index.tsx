"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import ChatSheet from "./chat/chat-sheet";
import ChatTrigger from "./chat/chat-trigger";
import {
  getBotReply,
  getChatIntro,
  INITIAL_MESSAGES,
} from "./constants";
import FloatingActions from "./map/floating-actions";
import MapExperience from "./map/map-experience";
import type {
  ChatTab,
  CurrencyCode,
  MapAction,
  Message,
  PlannerResult,
  UserLocation,
  ViewMode,
  VisionTab,
} from "./types";
import VisionOverlay from "./vision/vision-overlay";

function getApiErrorMessage(errorText: string) {
  const normalized = errorText.toLowerCase();

  if (normalized.includes("429") || normalized.includes("rate limit")) {
    return "Rate limit reached. Please wait a moment and try again.";
  }

  if (normalized.includes("api key")) {
    return "Backend configuration error: API key is missing or invalid.";
  }

  if (normalized.includes("network")) {
    return "Network error while connecting to the AI service.";
  }

  return "Error: unable to get a reply from the chatbot service.";
}

const CHAT_SESSION_STORAGE_KEY = "thatbuddy-chat-session-id";
const USER_LOCATION_STORAGE_KEY = "thatbuddy-user-location";
const USER_LOCATION_DRAFT_STORAGE_KEY = "thatbuddy-user-location-draft";

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getOrCreateChatSessionId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existingSessionId = window.sessionStorage.getItem(CHAT_SESSION_STORAGE_KEY);
  if (existingSessionId) {
    return existingSessionId;
  }

  const newSessionId = createSessionId();
  window.sessionStorage.setItem(CHAT_SESSION_STORAGE_KEY, newSessionId);
  return newSessionId;
}

function loadStoredLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawLocation = window.sessionStorage.getItem(USER_LOCATION_STORAGE_KEY);
  if (!rawLocation) {
    return null;
  }

  try {
    const parsedLocation = JSON.parse(rawLocation) as UserLocation;
    if (parsedLocation?.lat === null || parsedLocation?.lng === null) {
      return null;
    }
    return parsedLocation;
  } catch {
    return null;
  }
}

function loadStoredLocationDraft() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(USER_LOCATION_DRAFT_STORAGE_KEY) ?? "";
}

export default function LandingPage() {
  // ให้ browser คุยกับ Next route handler บน origin เดียวกันเสมอ
  // แล้วค่อยให้ Next proxy ไปหา Go backend ข้างหลัง เพื่อลดปัญหา CORS
  // และไม่ต้องเปิด backend tunnel ให้ client เครื่องอื่นยิงตรง
  const chatApiUrl = "/api/v1/chat";

  // Root state ของหน้าจอ landing ทั้งหมด:
  // - view คุมว่าผู้ใช้กำลังดู map ปกติ หรือ vision overlay
  // - chatOpen คุม bottom sheet ของ chatbot
  // - chatTab / visionTab คุม tab ย่อยของแต่ละ feature
  const [view, setView] = useState<ViewMode>("map");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTab, setChatTab] = useState<ChatTab>("general");
  const [visionTab, setVisionTab] = useState<VisionTab>("currency");

  // messages และ inputText ใช้กับ feature chat โดยตรง
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatSessionId, setChatSessionId] = useState("");
  const [currentLocation, setCurrentLocation] = useState<UserLocation | null>(null);
  const [locationDraftLabel, setLocationDraftLabel] = useState("");
  const [latestMapAction, setLatestMapAction] = useState<MapAction | null>(null);
  const [plannerResult, setPlannerResult] = useState<PlannerResult | null>(null);

  // state ชุดนี้เป็นของ vision > currency tool
  // เก็บจำนวนเงินบาท, สกุลเงินปลายทาง, และสถานะว่า scanner animation ควรทำงานหรือไม่
  const [thbAmount, setThbAmount] = useState("");
  const [targetCurrency, setTargetCurrency] = useState<CurrencyCode>("USD");
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    // Browser tab butละอันจะได้ session ของตัวเอง เพื่อให้ backend
    // แยกประวัติแชทและจัดคิว request ไม่ให้ชนกันใน session เดียว
    setChatSessionId(getOrCreateChatSessionId());
    setCurrentLocation(loadStoredLocation());
    setLocationDraftLabel(loadStoredLocationDraft());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (currentLocation) {
      window.sessionStorage.setItem(
        USER_LOCATION_STORAGE_KEY,
        JSON.stringify(currentLocation),
      );
    } else {
      window.sessionStorage.removeItem(USER_LOCATION_STORAGE_KEY);
    }
  }, [currentLocation]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (locationDraftLabel.trim()) {
      window.sessionStorage.setItem(
        USER_LOCATION_DRAFT_STORAGE_KEY,
        locationDraftLabel,
      );
    } else {
      window.sessionStorage.removeItem(USER_LOCATION_DRAFT_STORAGE_KEY);
    }
  }, [locationDraftLabel]);

  const shouldAttachLocation = chatTab === "nearby" || chatTab === "planner";
  const hasCoordinateLocation =
    currentLocation?.lat !== null && currentLocation?.lng !== null;
  const fallbackLocationLabel = locationDraftLabel.trim();
  const effectiveChatLocation =
    hasCoordinateLocation && currentLocation
      ? currentLocation
      : fallbackLocationLabel
        ? {
            lat: null,
            lng: null,
            label: fallbackLocationLabel,
            source: "manual-text" as const,
            updatedAt: Date.now(),
          }
        : null;
  const chatLocationPayload =
    shouldAttachLocation && effectiveChatLocation
      ? {
          lat: effectiveChatLocation.lat,
          lng: effectiveChatLocation.lng,
          label: effectiveChatLocation.label,
          source: effectiveChatLocation.source,
          updated_at: effectiveChatLocation.updatedAt,
        }
      : undefined;
  const locationNotice = shouldAttachLocation
    ? hasCoordinateLocation
      ? `Using current location: ${currentLocation?.label || `${currentLocation?.lat?.toFixed(4)}, ${currentLocation?.lng?.toFixed(4)}`} (${currentLocation?.lat?.toFixed(4)}, ${currentLocation?.lng?.toFixed(4)})`
      : fallbackLocationLabel
        ? `Using current location: ${fallbackLocationLabel}`
        : "Location unavailable. Use GPS, click the map, or search a place first."
    : null;

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputText.trim()) {
      return;
    }

    const text = inputText;
    const newMessage: Message = {
      id: Date.now(),
      sender: "user",
      text,
    };

    // เพิ่มข้อความของ user เข้า chat ทันทีเพื่อให้ UI ตอบสนองก่อน
    setMessages((current) => [...current, newMessage]);
    setInputText("");
    setIsSending(true);

    try {
      // เรียก Go backend กลาง ซึ่งจะไปคุยต่อกับ Python AI service
      const response = await fetch(chatApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          mode: chatTab,
          session_id: chatSessionId || getOrCreateChatSessionId(),
          ...(chatLocationPayload ? { location: chatLocationPayload } : {}),
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { error?: string; details?: string }
          | null;

        const errorText = [
          `status ${response.status}`,
          errorPayload?.error ?? "",
          errorPayload?.details ?? "",
        ]
          .filter(Boolean)
          .join(" | ");

        throw new Error(errorText);
      }

      const payload = (await response.json()) as {
        reply?: string;
        map_action?: MapAction | null;
        planner_result?: PlannerResult | null;
      };

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: payload.reply ?? getBotReply(chatTab),
        },
      ]);
      setLatestMapAction(payload.map_action ?? null);
      setPlannerResult(payload.planner_result ?? null);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? getApiErrorMessage(error.message)
          : "Error: unable to get a reply from the chatbot service.";

      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, sender: "bot", text: errorMessage },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleTabChange = (tab: ChatTab) => {
    setChatTab(tab);

    // เมื่อสลับ tab จะล้างประวัติแชทเดิม เพื่อให้แต่ละ mode เริ่มต้นใหม่ชัดเจน
    setMessages([]);
    if (tab !== "planner") {
      setPlannerResult(null);
    }

    // ใส่ข้อความ intro ของ mode นั้นกลับเข้ามาหลังสลับ tab
    window.setTimeout(() => {
      setMessages([{ id: Date.now(), sender: "bot", text: getChatIntro(tab) }]);
    }, 300);
  };

  return (
    <div className="h-screen-safe relative mx-auto w-full overflow-hidden bg-gray-100 font-sans">
      {/* แทนที่แผนที่ placeholder เดิมด้วย Google Maps experience จริง
          และย้าย feature map/filter/result จากไฟล์ Mapping\\index.html เข้ามาอยู่ในแอปนี้ */}
      <MapExperience
        initialLocation={currentLocation}
        initialLocationDraft={locationDraftLabel}
        mapAction={latestMapAction}
        onLocationChange={setCurrentLocation}
        onLocationDraftChange={setLocationDraftLabel}
      />

      {view === "map" && (
        <FloatingActions
          onOpenVision={() => {
            // เปิด vision overlay แล้วปิด chat ไปพร้อมกันเพื่อไม่ให้ UI ซ้อนกัน
            setView("vision");
            setChatOpen(false);
          }}
        />
      )}

      {view === "map" && !chatOpen && (
        // trigger นี้จะแสดงเฉพาะตอนอยู่หน้า map และยังไม่ได้เปิด chat
        <ChatTrigger onOpen={() => setChatOpen(true)} />
      )}

      {/* ChatSheet รับ state และ callback ทั้งหมดจาก parent ตัวนี้
          เพื่อให้ทุก child ในโฟลเดอร์ chat เป็น presentational component มากขึ้น */}
      <ChatSheet
        chatOpen={chatOpen}
        chatTab={chatTab}
        messages={messages}
        inputText={inputText}
        isSending={isSending}
        locationNotice={locationNotice}
        plannerResult={plannerResult}
        onClose={() => setChatOpen(false)}
        onTabChange={handleTabChange}
        onInputChange={setInputText}
        onSubmit={handleSendMessage}
        onPlannerPlaceSelect={setLatestMapAction}
      />

      {/* VisionOverlay แยก feature OCR / camera ออกมาจาก chat อย่างชัดเจน
          แต่ยังใช้ state กลางจาก landing page เพื่อควบคุมการเปิดปิดและค่า input */}
      <VisionOverlay
        view={view}
        visionTab={visionTab}
        thbAmount={thbAmount}
        targetCurrency={targetCurrency}
        isScanning={isScanning}
        onClose={() => setView("map")}
        onVisionTabChange={setVisionTab}
        onAmountChange={(value) => {
          setThbAmount(value);
          setIsScanning(value === "");
        }}
        onCurrencyChange={setTargetCurrency}
      />

      {/* style block นี้เก็บ animation ของ scanner และ utility scrollbar
          ไว้ใกล้ component เพราะใช้เฉพาะ landing UI ชุดนี้ */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
}
