import { generateItinerary } from "./itinerary";
import { fetchPlaces } from "./places";
import type { ItineraryResult, LatLng, PlanInput } from "./types";

const cache = new Map<string, { data: ItineraryResult; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

function toCacheKey(lat: number, lng: number) {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export async function handlePlan({
  cityName,
  lat,
  lng,
}: PlanInput): Promise<ItineraryResult> {
  if (!cityName || typeof lat !== "number" || typeof lng !== "number") {
    throw Object.assign(new Error("cityName, lat, and lng are required"), {
      status: 400,
    });
  }

  cleanExpiredCache();

  const cacheKey = toCacheKey(lat, lng);
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached.data;
  }

  const places = await fetchPlaces(lat, lng);
  const result = await generateItinerary(cityName, lat, lng, places);

  cache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return result;
}

export async function handleGetPlan({
  lat,
  lng,
}: LatLng): Promise<ItineraryResult> {
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw Object.assign(new Error("lat and lng are required"), {
      status: 400,
    });
  }

  cleanExpiredCache();

  const cached = cache.get(toCacheKey(lat, lng));
  if (!cached || cached.expiresAt <= Date.now()) {
    throw Object.assign(new Error("Plan not found"), {
      status: 404,
    });
  }

  return cached.data;
}

export async function handleUpdatePlan({
  cityName,
  lat,
  lng,
}: PlanInput): Promise<ItineraryResult> {
  if (!cityName || typeof lat !== "number" || typeof lng !== "number") {
    throw Object.assign(new Error("cityName, lat, and lng are required"), {
      status: 400,
    });
  }

  const cacheKey = toCacheKey(lat, lng);
  if (!cache.has(cacheKey)) {
    throw Object.assign(new Error("Plan not found"), {
      status: 404,
    });
  }

  const places = await fetchPlaces(lat, lng);
  const result = await generateItinerary(cityName, lat, lng, places);
  cache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return result;
}

export async function handleDeletePlan({
  lat,
  lng,
}: LatLng): Promise<{ message: string }> {
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw Object.assign(new Error("lat and lng are required"), {
      status: 400,
    });
  }

  const cacheKey = toCacheKey(lat, lng);
  if (!cache.has(cacheKey)) {
    throw Object.assign(new Error("Plan not found"), {
      status: 404,
    });
  }

  cache.delete(cacheKey);
  return { message: "Plan deleted" };
}
