import { withBody, withQuery } from "@/server/planner/http";
import {
  handleDeletePlan,
  handleGetPlan,
  handlePlan,
  handleUpdatePlan,
} from "@/server/planner/plan";
import type { LatLng, PlanInput } from "@/server/planner/types";

export const POST = withBody<PlanInput>(handlePlan);
export const GET = withQuery<LatLng>(handleGetPlan);
export const PUT = withBody<PlanInput>(handleUpdatePlan);
export const DELETE = withBody<LatLng>(handleDeletePlan);
