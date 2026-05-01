const DEFAULT_OCR_SERVICE_URL = "http://localhost:8002";

function getOCRServiceUrl() {
  return process.env.OCR_SERVICE_URL ?? DEFAULT_OCR_SERVICE_URL;
}

export async function proxyVisionFormData(
  request: Request,
  path: string,
) {
  const upstreamUrl = `${getOCRServiceUrl()}${path}`;
  const formData = await request.formData();

  const response = await fetch(upstreamUrl, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function proxyVisionGet(url: string, path: string) {
  const requestUrl = new URL(url);
  const upstreamUrl = new URL(`${getOCRServiceUrl()}${path}`);

  requestUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const response = await fetch(upstreamUrl, {
    cache: "no-store",
  });
  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
