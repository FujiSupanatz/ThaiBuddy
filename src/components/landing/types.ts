export type ViewMode = "map" | "vision";
export type ChatTab = "general" | "nearby" | "planner";
export type VisionTab = "currency" | "signage";
export type CurrencyCode = "USD" | "EUR" | "JPY";
export type LocationSource =
  | "gps"
  | "map-click"
  | "search"
  | "manual-text"
  | "session-restore";

export type Message = {
  id: number;
  sender: "bot" | "user";
  text: string;
};

export type UserLocation = {
  lat: number | null;
  lng: number | null;
  label: string;
  source: LocationSource;
  updatedAt: number;
};
