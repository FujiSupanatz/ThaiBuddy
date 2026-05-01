export async function POST(request: Request) {
  const backendUrl =
    process.env.INTERNAL_CHAT_API_URL ?? "http://localhost:8080/api/v1/chat";

  const bodyText = await request.text();

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: bodyText,
      cache: "no-store",
    });

    const responseText = await response.text();

    return new Response(responseText, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
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
