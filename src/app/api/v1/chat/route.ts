import { handlePlan } from "@/server/planner/plan";
import type { ItineraryResult } from "@/server/planner/types";

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

  const forwardPayload = plannerResult
    ? { ...payload, planner_result: plannerResult }
    : payload;

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
