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

export type PlannerPlace = {
  name: string;
  type: string;
  distance_km: number;
  description: string;
  opening_hours: string;
  entrance_fee_thb: number;
};

export type PlannerStep = {
  time: string;
  activity: string;
  place: string;
  transport: string;
  transport_cost_thb: number;
  activity_cost_thb: number;
};

export type PlannerResult = {
  places: PlannerPlace[];
  itinerary: PlannerStep[];
  estimated_cost_thb: number;
  tips: string[];
};

export type MapAction = {
  type: "pin-place";
  query: string;
  label: string;
  mode: "nearby" | "planner";
};

export type UserLocation = {
  lat: number | null;
  lng: number | null;
  label: string;
  source: LocationSource;
  updatedAt: number;
};
