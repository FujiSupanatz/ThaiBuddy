export async function GET() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey) {
    return Response.json(
      {
        error: "google maps api key is not configured",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return Response.json(
    {
      apiKey,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
