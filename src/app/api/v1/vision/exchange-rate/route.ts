import { proxyVisionGet } from "@/server/vision/proxy";
import {
  createCountryBlockedResponse,
  enforceRateLimit,
  isThailandAllowed,
} from "@/server/security/request-guard";

export async function GET(request: Request) {
  if (!isThailandAllowed(request)) {
    return createCountryBlockedResponse(request);
  }

  const rateLimitResponse = enforceRateLimit(request, {
    scope: "vision-rate",
    maxRequests: Number(process.env.VISION_RATE_QUERY_LIMIT_MAX ?? 20),
    windowMs: Number(process.env.VISION_RATE_QUERY_LIMIT_WINDOW_MS ?? 60_000),
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    return await proxyVisionGet(request.url, "/exchange-rate");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to contact OCR service";

    return Response.json(
      { error: "vision proxy error", details: message },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
