import { proxyVisionGet } from "@/server/vision/proxy";

export async function GET(request: Request) {
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
