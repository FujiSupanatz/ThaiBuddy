export type NearbyIntentType =
  | "food"
  | "coffee"
  | "atm"
  | "restroom"
  | "transport"
  | "attraction";

export type NearbyIntent = {
  type: NearbyIntentType;
  label: string;
  overpassFilter: string;
};

export type NearbyPlace = {
  name: string;
  type: string;
  distance_km: number | null;
  address: string | null;
  opening_hours: string | null;
};

export type NearbyResult = {
  intent: NearbyIntentType;
  label: string;
  places: NearbyPlace[];
};
