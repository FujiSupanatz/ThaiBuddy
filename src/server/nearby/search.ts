import type { NearbyIntent, NearbyPlace, NearbyResult } from "./types";

const OVERPASS_API_URL =
  process.env.OVERPASS_API_URL ??
  "https://overpass.kumi.systems/api/interpreter";
const OVERPASS_RADIUS_METERS = Number(
  process.env.OVERPASS_RADIUS_METERS ?? "3000",
);
const OVERPASS_USER_AGENT =
  process.env.OVERPASS_USER_AGENT ?? "ThatBuddy/1.0 (nearby-engine)";

function approximateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  return (
    Math.round(
      Math.sqrt(
        Math.pow((lat2 - lat1) * 111, 2) +
          Math.pow(
            (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180),
            2,
          ),
      ) * 10,
    ) / 10
  );
}

function inferNearbyIntent(message: string): NearbyIntent | null {
  const normalized = message.trim().toLowerCase();
  const hasAny = (terms: string[]) => terms.some((term) => normalized.includes(term));

  if (hasAny(["coffee", "cafe", "กาแฟ", "คาเฟ่"])) {
    return {
      type: "coffee",
      label: "coffee or cafes",
      overpassFilter: `"amenity"~"cafe"`,
    };
  }

  if (
    hasAny([
      "food",
      "restaurant",
      "eat",
      "lunch",
      "dinner",
      "breakfast",
      "rice",
      "noodle",
      "ร้านอาหาร",
      "อาหาร",
      "ข้าว",
      "ก๋วยเตี๋ยว",
      "กินอะไร",
      "กินข้าว",
    ])
  ) {
    return {
      type: "food",
      label: "restaurants or food places",
      overpassFilter: `"amenity"~"restaurant|fast_food|food_court|cafe"`,
    };
  }

  if (hasAny(["atm", "cash", "ถอนเงิน", "ตู้เอทีเอ็ม", "เอทีเอ็ม"])) {
    return {
      type: "atm",
      label: "ATMs",
      overpassFilter: `"amenity"~"atm|bank"`,
    };
  }

  if (hasAny(["toilet", "restroom", "bathroom", "ห้องน้ำ", "ส้วม"])) {
    return {
      type: "restroom",
      label: "restrooms",
      overpassFilter: `"amenity"~"toilets"`,
    };
  }

  if (hasAny(["bus", "train", "station", "taxi", "transport", "รถ", "ขนส่ง", "สถานี"])) {
    return {
      type: "transport",
      label: "transport options",
      overpassFilter: `"amenity"~"bus_station|taxi"`,
    };
  }

  if (
    hasAny([
      "attraction",
      "temple",
      "museum",
      "เที่ยว",
      "วัด",
      "พิพิธภัณฑ์",
      "สถานที่ท่องเที่ยว",
    ])
  ) {
    return {
      type: "attraction",
      label: "attractions",
      overpassFilter: `"tourism"~"attraction|museum|viewpoint|gallery|artwork"`,
    };
  }

  return null;
}

function buildAddress(tags: Record<string, string> | undefined) {
  if (!tags) {
    return null;
  }

  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:subdistrict"],
    tags["addr:district"],
    tags["addr:province"],
  ].filter(Boolean);

  return parts.length ? parts.join(" ") : null;
}

function normalizePlace(
  element: any,
  originLat: number,
  originLng: number,
): NearbyPlace | null {
  const tags = element?.tags as Record<string, string> | undefined;
  const name = tags?.["name:en"] || tags?.name;
  if (!name) {
    return null;
  }

  const placeLat: number | undefined = element.lat ?? element.center?.lat;
  const placeLng: number | undefined = element.lon ?? element.center?.lon;

  return {
    name,
    type:
      tags?.amenity ??
      tags?.tourism ??
      tags?.public_transport ??
      "place",
    distance_km:
      typeof placeLat === "number" && typeof placeLng === "number"
        ? approximateDistanceKm(originLat, originLng, placeLat, placeLng)
        : null,
    address: buildAddress(tags),
    opening_hours: tags?.opening_hours ?? null,
  };
}

export async function searchNearbyPlaces(
  message: string,
  lat: number,
  lng: number,
): Promise<NearbyResult | null> {
  const intent = inferNearbyIntent(message);
  if (!intent) {
    return null;
  }

  const overpassQuery = `
    [out:json][timeout:25];
    (
      node[${intent.overpassFilter}](around:${OVERPASS_RADIUS_METERS},${lat},${lng});
      way[${intent.overpassFilter}](around:${OVERPASS_RADIUS_METERS},${lat},${lng});
    );
    out center 20;
  `;

  const response = await fetch(OVERPASS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": OVERPASS_USER_AGENT,
    },
    body: `data=${encodeURIComponent(overpassQuery)}`,
    cache: "no-store",
  });

  if (!response.ok) {
    throw Object.assign(new Error("Failed to fetch nearby places"), {
      status: 502,
    });
  }

  const payload = (await response.json()) as { elements?: Array<any> };
  const places = (payload.elements ?? [])
    .map((element) => normalizePlace(element, lat, lng))
    .filter((place): place is NearbyPlace => place !== null)
    .sort(
      (left, right) =>
        (left.distance_km ?? Number.MAX_SAFE_INTEGER) -
        (right.distance_km ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 6);

  return {
    intent: intent.type,
    label: intent.label,
    places,
  };
}
