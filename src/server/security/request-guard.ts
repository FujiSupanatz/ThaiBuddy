type RateLimitConfig = {
  scope: string;
  maxRequests: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const LOCAL_IP_PREFIXES = [
  "127.",
  "::1",
  "::ffff:127.",
  "10.",
  "192.168.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.2",
  "172.30.",
  "172.31.",
];

function cleanupExpiredEntries(now: number) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) {
    return cfIp;
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.trim();
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function isLocalRequest(request: Request) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const clientIp = getClientIp(request).toLowerCase();

  if (
    host.includes("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]")
  ) {
    return true;
  }

  return LOCAL_IP_PREFIXES.some((prefix) => clientIp.startsWith(prefix));
}

export function getRequestCountry(request: Request) {
  return request.headers.get("cf-ipcountry")?.trim().toUpperCase() ?? "";
}

export function isThailandAllowed(request: Request) {
  if (isLocalRequest(request)) {
    return true;
  }

  const restrictionEnabled =
    (process.env.ENABLE_TH_COUNTRY_RESTRICTION ?? "true").toLowerCase() !==
    "false";

  if (!restrictionEnabled) {
    return true;
  }

  return getRequestCountry(request) === "TH";
}

export function createCountryBlockedResponse(request: Request) {
  if (request.url.includes("/api/")) {
    return Response.json(
      {
        error: "forbidden",
        details: "This demo is available only in Thailand.",
      },
      {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return new Response("This demo is available only in Thailand.", {
    status: 403,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function enforceRateLimit(
  request: Request,
  config: RateLimitConfig,
): Response | null {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const clientIp = getClientIp(request);
  const key = `${config.scope}:${clientIp}`;
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return null;
  }

  if (current.count >= config.maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((current.resetAt - now) / 1000),
    );

    return Response.json(
      {
        error: "rate_limited",
        details: "Too many requests. Please wait a moment and try again.",
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return null;
}
