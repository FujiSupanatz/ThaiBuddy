import type { Place } from "./types";

const OVERPASS_API_URL =
  process.env.OVERPASS_API_URL ??
  "https://overpass.kumi.systems/api/interpreter";
const OVERPASS_RADIUS_METERS = Number(
  process.env.OVERPASS_RADIUS_METERS ?? "5000",
);
const OVERPASS_USER_AGENT =
  process.env.OVERPASS_USER_AGENT ?? "ThatBuddy/1.0 (planner-engine)";

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

export async function fetchPlaces(lat: number, lng: number): Promise<Place[]> {
  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["tourism"~"attraction|museum|viewpoint|artwork|theme_park|zoo|aquarium|gallery"](around:${OVERPASS_RADIUS_METERS},${lat},${lng});
      way["tourism"~"attraction|museum|viewpoint|artwork|theme_park|zoo|aquarium|gallery"](around:${OVERPASS_RADIUS_METERS},${lat},${lng});
    );
    out center 10;
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
  const elements = payload.elements ?? [];

  if (elements.length === 0) {
    throw Object.assign(new Error("No tourist places found nearby"), {
      status: 404,
    });
  }

  return elements
    .slice(0, 10)
    .map((element): Place | null => {
      const name = element.tags?.["name:en"] || element.tags?.name;
      if (!name) {
        return null;
      }

      const placeLat: number | undefined = element.lat ?? element.center?.lat;
      const placeLng: number | undefined = element.lon ?? element.center?.lon;

      return {
        name,
        type: element.tags?.tourism ?? "attraction",
        distance_km:
          typeof placeLat === "number" && typeof placeLng === "number"
            ? approximateDistanceKm(lat, lng, placeLat, placeLng)
            : null,
        opening_hours: element.tags?.opening_hours ?? null,
      };
    })
    .filter((place): place is Place => place !== null);
}
