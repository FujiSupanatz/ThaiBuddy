import type { MapAction, PlannerResult } from "../types";

interface PlannerPanelProps {
  plannerResult: PlannerResult;
  onPinPlace: (action: MapAction) => void;
}

function formatCurrency(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Free / flexible";
  }

  return `${amount.toLocaleString("en-US")} THB`;
}

export default function PlannerPanel({
  plannerResult,
  onPinPlace,
}: PlannerPanelProps) {
  const topPlaces = plannerResult.places.slice(0, 4);
  const itinerary = plannerResult.itinerary.slice(0, 5);
  const tips = plannerResult.tips.slice(0, 3);

  return (
    <div className="border-t border-blue-100 bg-blue-50/60 px-4 py-4 overflow-y-auto max-h-[40dvh] flex-shrink-0 scroll-touch">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Plan Summary</h3>
          <p className="text-[11px] text-slate-500">
            Structured itinerary from real nearby places
          </p>
        </div>
        <div className="rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-semibold text-blue-700">
          {formatCurrency(plannerResult.estimated_cost_thb)}
        </div>
      </div>

      {itinerary.length > 0 ? (
        <div className="mb-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Suggested Route
          </div>
          <div className="space-y-2">
            {itinerary.map((step, index) => (
              <button
                key={`${step.time}-${step.place}-${index}`}
                type="button"
                onClick={() =>
                  onPinPlace({
                    type: "pin-place",
                    query: step.place,
                    label: step.place,
                    mode: "planner",
                  })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:border-blue-400 hover:bg-blue-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-blue-700">{step.time}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {step.place}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{step.activity}</div>
                  </div>
                  <div className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                    {step.transport || "Move"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {topPlaces.length > 0 ? (
        <div className="mb-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Pick A Place
          </div>
          <div className="flex flex-wrap gap-2">
            {topPlaces.map((place) => (
              <button
                key={place.name}
                type="button"
                onClick={() =>
                  onPinPlace({
                    type: "pin-place",
                    query: place.name,
                    label: place.name,
                    mode: "planner",
                  })
                }
                className="rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-700 transition-all hover:border-blue-500 hover:bg-blue-100"
              >
                {place.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {tips.length > 0 ? (
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Quick Tips
          </div>
          <div className="space-y-2">
            {tips.map((tip, index) => (
              <div
                key={`${tip}-${index}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm"
              >
                {tip}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
