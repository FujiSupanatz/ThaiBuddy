export type ViewMode = "map" | "vision";
export type ChatTab = "general" | "nearby" | "planner";
export type VisionTab = "currency" | "signage";
export type CurrencyCode = "USD" | "EUR" | "JPY";

export type Message = {
  id: number;
  sender: "bot" | "user";
  text: string;
};
