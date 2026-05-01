import { searchNearbyPlaces } from "@/server/nearby/search";

type NearbyRequestPayload = {
  message?: string;
  lat?: number;
  lng?: number;
};

export async function POST(request: Request) {
  let payload: NearbyRequestPayload;

  try {
    payload = (await request.json()) as NearbyRequestPayload;
  } catch {
    return Response.json(
      { error: "invalid json body" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (
    typeof payload.message !== "string" ||
    typeof payload.lat !== "number" ||
    typeof payload.lng !== "number"
  ) {
    return Response.json(
      { error: "message, lat, and lng are required" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await searchNearbyPlaces(
      payload.message,
      payload.lat,
      payload.lng,
    );

    return Response.json(
      { result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "nearby search failed";

    return Response.json(
      { error: message },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
