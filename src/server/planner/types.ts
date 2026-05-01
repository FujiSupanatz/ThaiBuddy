export type Place = {
  name: string;
  type: string;
  distance_km: number | null;
  opening_hours: string | null;
};

export type ItineraryPlace = {
  name: string;
  type: string;
  distance_km: number;
  description: string;
  opening_hours: string;
  entrance_fee_thb: number;
};

export type ItineraryStep = {
  time: string;
  activity: string;
  place: string;
  transport: string;
  transport_cost_thb: number;
  activity_cost_thb: number;
};

export type ItineraryResult = {
  places: ItineraryPlace[];
  itinerary: ItineraryStep[];
  estimated_cost_thb: number;
  tips: string[];
};

export type PlanInput = {
  cityName: string;
  lat: number;
  lng: number;
};

export type LatLng = {
  lat: number;
  lng: number;
};
