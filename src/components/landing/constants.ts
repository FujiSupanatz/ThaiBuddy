import type { ChatTab, CurrencyCode, Message } from "./types";

// ข้อความเริ่มต้นของแชท ใช้ตอนเปิดหน้าครั้งแรก
export const INITIAL_MESSAGES: Message[] = [
  { id: 1, sender: "bot", text: "Sawasdee! How can I help you in Thailand today?" },
];

// mock exchange rates สำหรับ demo UI ของ feature currency
export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 0.027,
  EUR: 0.025,
  JPY: 4.15,
};

// รายการ tab ของ chatbot กลาง เพื่อให้ component tabs และ logic ใช้ชุดข้อมูลเดียวกัน
export const CHAT_TABS: ChatTab[] = ["general", "nearby", "planner"];

export function getBotReply(chatTab: ChatTab) {
  // helper นี้ทำหน้าที่รวมข้อความตอบกลับของ bot ตาม mode ปัจจุบัน
  if (chatTab === "general") {
    return "I can help you with basic Thai phrases or culture tips. What do you need?";
  }
  if (chatTab === "nearby") {
    return "Looking around your current location... Found a highly-rated Pad Thai restaurant 200 meters ahead!";
  }

  return "Since you are at the Grand Palace, the next best stop is Wat Pho (Temple of the Reclining Buddha). Should I map the route?";
}

export function getChatIntro(tab: ChatTab) {
  // intro ใช้ตอนผู้ใช้สลับ tab เพื่อ reset บริบทของแต่ละ feature
  if (tab === "general") {
    return "Sawasdee! Ask me anything about Thailand.";
  }
  if (tab === "nearby") {
    return "📍 Using your GPS... What are you looking for? (Food, Toilet, ATM)";
  }

  return "🗺️ Let's plan your next move. Where are you heading to?";
}
