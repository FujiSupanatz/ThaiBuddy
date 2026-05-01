import type { ChatTab, CurrencyCode, Message } from "./types";

// Initial chat copy for the landing page before the user switches modes.
export const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    sender: "bot",
    text: "Sawasdee! I can help with Thai phrases, travel tips, and general Thailand questions.",
  },
];

// Mock exchange rates for the currency demo UI.
export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 0.027,
  EUR: 0.025,
  JPY: 4.15,
};

// Shared chat tab order for UI and chat logic.
export const CHAT_TABS: ChatTab[] = ["general", "nearby", "planner"];

export function getBotReply(chatTab: ChatTab) {
  if (chatTab === "general") {
    return "I can help with Thai phrases, culture, transport, safety, and general travel tips in Thailand.";
  }

  if (chatTab === "nearby") {
    return "Tell me what you want near you right now, such as coffee, food, ATM, restroom, or an attraction.";
  }

  return "Tell me what kind of next stop you want, and I will suggest one strong next destination from your current area.";
}

export function getChatIntro(tab: ChatTab) {
  if (tab === "general") {
    return "💬 Ask general questions about Thailand: phrases, culture, transport, safety, or translation.";
  }

  if (tab === "nearby") {
    return "📍 Using your current area... What do you want near you right now? (Coffee, Food, ATM, Toilet, Attraction)";
  }

  return "🗺️ Let’s plan your next stop. What kind of place do you want to go to next?";
}
