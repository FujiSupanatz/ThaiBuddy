import { proxyVisionFormData } from "@/server/vision/proxy";

export async function POST(request: Request) {
  try {
    return await proxyVisionFormData(request, "/ocr/menu");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to contact OCR service";

    return Response.json(
      { error: "vision proxy error", details: message },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
