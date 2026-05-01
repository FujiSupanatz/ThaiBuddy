import { withBody, withQuery } from "@/server/planner/http";
import {
  handleDeletePlan,
  handleGetPlan,
  handlePlan,
  handleUpdatePlan,
} from "@/server/planner/plan";
import type { LatLng, PlanInput } from "@/server/planner/types";
import {
  createCountryBlockedResponse,
  enforceRateLimit,
  isThailandAllowed,
} from "@/server/security/request-guard";

function guardRequest(
  request: Request,
  scope: string,
  maxRequests: number,
  windowMs: number,
) {
  if (!isThailandAllowed(request)) {
    return createCountryBlockedResponse(request);
  }

  return enforceRateLimit(request, {
    scope,
    maxRequests,
    windowMs,
  });
}

const postHandler = withBody<PlanInput>(handlePlan);
const getHandler = withQuery<LatLng>(handleGetPlan);
const putHandler = withBody<PlanInput>(handleUpdatePlan);
const deleteHandler = withBody<LatLng>(handleDeletePlan);

export async function POST(request: Request) {
  const blocked = guardRequest(
    request,
    "plan-post",
    Number(process.env.PLAN_RATE_LIMIT_MAX ?? 10),
    Number(process.env.PLAN_RATE_LIMIT_WINDOW_MS ?? 60_000),
  );
  if (blocked) {
    return blocked;
  }

  return postHandler(request);
}

export async function GET(request: Request) {
  const blocked = guardRequest(
    request,
    "plan-get",
    Number(process.env.PLAN_READ_RATE_LIMIT_MAX ?? 20),
    Number(process.env.PLAN_READ_RATE_LIMIT_WINDOW_MS ?? 60_000),
  );
  if (blocked) {
    return blocked;
  }

  return getHandler(request);
}

export async function PUT(request: Request) {
  const blocked = guardRequest(
    request,
    "plan-put",
    Number(process.env.PLAN_RATE_LIMIT_MAX ?? 10),
    Number(process.env.PLAN_RATE_LIMIT_WINDOW_MS ?? 60_000),
  );
  if (blocked) {
    return blocked;
  }

  return putHandler(request);
}

export async function DELETE(request: Request) {
  const blocked = guardRequest(
    request,
    "plan-delete",
    Number(process.env.PLAN_RATE_LIMIT_MAX ?? 10),
    Number(process.env.PLAN_RATE_LIMIT_WINDOW_MS ?? 60_000),
  );
  if (blocked) {
    return blocked;
  }

  return deleteHandler(request);
}
