import type { ItineraryResult, Place } from "./types";

const TYPHOON_BASE_URL =
  process.env.TYPHOON_BASE_URL ?? "https://api.opentyphoon.ai/v1";
const TYPHOON_MODEL =
  process.env.TYPHOON_MODEL ?? "typhoon-v2.5-30b-a3b-instruct";

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {}

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Planner response did not contain a JSON object");
  }

  return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as unknown;
}

function normalizeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeItineraryResult(payload: unknown): ItineraryResult {
  const record = payload as Record<string, unknown>;
  const places = Array.isArray(record.places) ? record.places : [];
  const itinerary = Array.isArray(record.itinerary) ? record.itinerary : [];
  const tips = Array.isArray(record.tips)
    ? record.tips.filter((tip): tip is string => typeof tip === "string")
    : [];

  return {
    places: places.map((place) => {
      const item = place as Record<string, unknown>;
      return {
        name: normalizeString(item.name),
        type: normalizeString(item.type, "attraction"),
        distance_km: normalizeNumber(item.distance_km),
        description: normalizeString(item.description),
        opening_hours: normalizeString(item.opening_hours, "Unknown"),
        entrance_fee_thb: normalizeNumber(item.entrance_fee_thb),
      };
    }),
    itinerary: itinerary.map((step) => {
      const item = step as Record<string, unknown>;
      return {
        time: normalizeString(item.time),
        activity: normalizeString(item.activity),
        place: normalizeString(item.place),
        transport: normalizeString(item.transport),
        transport_cost_thb: normalizeNumber(item.transport_cost_thb),
        activity_cost_thb: normalizeNumber(item.activity_cost_thb),
      };
    }),
    estimated_cost_thb: normalizeNumber(record.estimated_cost_thb),
    tips,
  };
}

export async function generateItinerary(
  cityName: string,
  lat: number,
  lng: number,
  places: Place[],
): Promise<ItineraryResult> {
  const apiKey = process.env.TYPHOON_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error("TYPHOON_API_KEY is not set"), {
      status: 500,
    });
  }

  const prompt = `I am at ${cityName} (lat: ${lat}, lng: ${lng}).
Here are real nearby tourist attractions from OpenStreetMap:
${JSON.stringify(places, null, 2)}

Based on these real places, create a 1-day itinerary and recommendations.
Order the itinerary logically to minimize travel time.
Reply ONLY with a JSON object in this exact structure:
{
  "places": [
    {
      "name": "string",
      "type": "string",
      "distance_km": number,
      "description": "string",
      "opening_hours": "string",
      "entrance_fee_thb": number
    }
  ],
  "itinerary": [
    {
      "time": "string",
      "activity": "string",
      "place": "string",
      "transport": "string",
      "transport_cost_thb": number,
      "activity_cost_thb": number
    }
  ],
  "estimated_cost_thb": number,
  "tips": ["string"]
}`;

  const response = await fetch(`${TYPHOON_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model: TYPHOON_MODEL,
      temperature: 0.2,
      max_tokens: 1400,
      messages: [
        {
          role: "system",
          content:
            "You are a travel planner. Reply in JSON only. Use only the places provided. Follow the exact JSON structure.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw Object.assign(new Error("Planner LLM request failed"), {
      status: 502,
      details,
    });
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw Object.assign(new Error("No response from planner LLM"), {
      status: 503,
    });
  }

  return normalizeItineraryResult(extractJsonObject(content));
}
