"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import ChatSheet from "./chat/chat-sheet";
import ChatTrigger from "./chat/chat-trigger";
import {
  getBotReply,
  getChatIntro,
  INITIAL_MESSAGES,
} from "./constants";
import FloatingActions from "./map/floating-actions";
import MapBackground from "./map/map-background";
import TopBar from "./map/top-bar";
import type { ChatTab, CurrencyCode, Message, ViewMode, VisionTab } from "./types";
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

export default function LandingPage() {
  // ปลายทางของ chatbot สำหรับ frontend
  // ค่า default ชี้ไปที่ Go API ที่จะเป็น backend กลาง
  const chatApiUrl =
    process.env.NEXT_PUBLIC_CHAT_API_URL ?? "http://localhost:8080/api/v1/chat";

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

  // state ชุดนี้เป็นของ vision > currency tool
  // เก็บจำนวนเงินบาท, สกุลเงินปลายทาง, และสถานะว่า scanner animation ควรทำงานหรือไม่
  const [thbAmount, setThbAmount] = useState("");
  const [targetCurrency, setTargetCurrency] = useState<CurrencyCode>("USD");
  const [isScanning, setIsScanning] = useState(true);

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

      const payload = (await response.json()) as { reply?: string };

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: payload.reply ?? getBotReply(chatTab),
        },
      ]);
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

    // ใส่ข้อความ intro ของ mode นั้นกลับเข้ามาหลังสลับ tab
    window.setTimeout(() => {
      setMessages([{ id: Date.now(), sender: "bot", text: getChatIntro(tab) }]);
    }, 300);
  };

  return (
    <div className="relative mx-auto h-screen w-full max-w-md overflow-hidden border-x border-gray-200 bg-gray-100 font-sans shadow-2xl">
      {/* ชั้นพื้นหลัง: แผนที่ถูก render ตลอดเวลาเป็น base layer ของหน้า */}
      <MapBackground />

      {/* ชั้นบนสุดของหน้า map: logo และตัวเลือกภาษา */}
      <TopBar />

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
        onClose={() => setChatOpen(false)}
        onTabChange={handleTabChange}
        onInputChange={setInputText}
        onSubmit={handleSendMessage}
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
