import { searchNearbyPlaces } from "@/server/nearby/search";
import { handlePlan } from "@/server/planner/plan";
import type { ItineraryResult } from "@/server/planner/types";
import type { NearbyResult } from "@/server/nearby/types";
import {
  createCountryBlockedResponse,
  enforceRateLimit,
  isThailandAllowed,
} from "@/server/security/request-guard";

type ChatLocationPayload = {
  lat?: number | null;
  lng?: number | null;
  label?: string;
  source?: string;
  updated_at?: number;
};

type ChatRequestPayload = {
  message?: string;
  mode?: string;
  session_id?: string;
  location?: ChatLocationPayload;
};

type ChatResponsePayload = {
  reply?: string;
  map_action?: unknown;
  planner_result?: ItineraryResult;
  nearby_result?: NearbyResult;
};

function hasCoordinates(location: ChatLocationPayload | undefined) {
  return (
    typeof location?.lat === "number" &&
    Number.isFinite(location.lat) &&
    typeof location?.lng === "number" &&
    Number.isFinite(location.lng)
  );
}

export async function POST(request: Request) {
  if (!isThailandAllowed(request)) {
    return createCountryBlockedResponse(request);
  }

  const rateLimitResponse = enforceRateLimit(request, {
    scope: "chat",
    maxRequests: Number(process.env.CHAT_RATE_LIMIT_MAX ?? 20),
    windowMs: Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS ?? 60_000),
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const backendUrl =
    process.env.INTERNAL_CHAT_API_URL ?? "http://localhost:8080/api/v1/chat";

  let payload: ChatRequestPayload;

  try {
    payload = (await request.json()) as ChatRequestPayload;
  } catch {
    return Response.json(
      {
        error: "frontend chat proxy error",
        details: "invalid json body",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  let plannerResult: ItineraryResult | null = null;
  let nearbyResult: NearbyResult | null = null;

  if (payload.mode === "planner" && hasCoordinates(payload.location)) {
    try {
      plannerResult = await handlePlan({
        cityName: payload.location?.label?.trim() || "Current location in Thailand",
        lat: payload.location!.lat!,
        lng: payload.location!.lng!,
      });
    } catch {
      plannerResult = null;
    }
  }

  if (payload.mode === "nearby" && hasCoordinates(payload.location) && payload.message) {
    try {
      nearbyResult = await searchNearbyPlaces(
        payload.message,
        payload.location!.lat!,
        payload.location!.lng!,
      );
    } catch {
      nearbyResult = null;
    }
  }

  const forwardPayload = {
    ...payload,
    ...(plannerResult ? { planner_result: plannerResult } : {}),
    ...(nearbyResult ? { nearby_result: nearbyResult } : {}),
  };

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(forwardPayload),
      cache: "no-store",
    });

    const responseText = await response.text();
    let responsePayload: ChatResponsePayload | null = null;

    try {
      responsePayload = JSON.parse(responseText) as ChatResponsePayload;
    } catch {
      responsePayload = null;
    }

    if (responsePayload && plannerResult && !responsePayload.planner_result) {
      responsePayload.planner_result = plannerResult;
    }
    if (responsePayload && nearbyResult && !responsePayload.nearby_result) {
      responsePayload.nearby_result = nearbyResult;
    }

    return new Response(
      responsePayload ? JSON.stringify(responsePayload) : responseText,
      {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "failed to contact internal chat backend";

    return Response.json(
      {
        error: "frontend chat proxy error",
        details: message,
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
