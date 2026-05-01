import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  getClientIp,
  getRequestCountry,
  isLocalRequest,
} from "@/server/security/request-guard";

function isThailandAllowed(request: NextRequest) {
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

export function proxy(request: NextRequest) {
  if (isThailandAllowed(request)) {
    return NextResponse.next();
  }

  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");

  if (isApiRequest) {
    return NextResponse.json(
      {
        error: "forbidden",
        details: "This demo is available only in Thailand.",
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
          "X-Blocked-Country": getRequestCountry(request) || "UNKNOWN",
          "X-Client-IP": getClientIp(request),
        },
      },
    );
  }

  return new NextResponse("This demo is available only in Thailand.", {
    status: 403,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Blocked-Country": getRequestCountry(request) || "UNKNOWN",
      "X-Client-IP": getClientIp(request),
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
