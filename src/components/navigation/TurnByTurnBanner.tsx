"use client";

import {
  ArrowUp,
  CornerDownLeft,
  CornerDownRight,
  Flag,
  GitFork,
  MapPin,
  Navigation2,
  RotateCcw,
  Signpost,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  formatEta,
  formatMeters,
  type ManeuverKind,
  type NavigationSnapshot,
} from "@/lib/maps/navigation-engine";
import { cn } from "@/lib/utils";

function ManeuverIcon({
  kind,
  className,
}: {
  kind: ManeuverKind;
  className?: string;
}) {
  const props = { className: cn("h-7 w-7 shrink-0", className) };
  switch (kind) {
    case "turn-left":
    case "sharp-left":
    case "slight-left":
      return <CornerDownLeft {...props} />;
    case "turn-right":
    case "sharp-right":
    case "slight-right":
      return <CornerDownRight {...props} />;
    case "uturn":
      return <RotateCcw {...props} />;
    case "roundabout":
      return <GitFork {...props} />;
    case "arrive":
      return <Flag {...props} />;
    case "depart":
      return <Navigation2 {...props} />;
    case "fork":
      return <Signpost {...props} />;
    default:
      return <ArrowUp {...props} />;
  }
}

export function TurnByTurnBanner({
  nav,
  destination,
  loading,
}: {
  nav: NavigationSnapshot;
  destination: string;
  loading?: boolean;
}) {
  const kind = nav.arrived
    ? "arrive"
    : nav.currentStep?.maneuver ?? "straight";
  const distanceLabel = nav.arrived
    ? "Done"
    : formatMeters(nav.distanceToManeuverM);
  const showBigDistance =
    !nav.arrived && distanceLabel !== "now" && nav.distanceToManeuverM < 1000;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#141414] via-[#111] to-[#0d0d0d] shadow-2xl shadow-black/40">
      {showBigDistance && (
        <div className="border-b border-white/5 px-5 pt-4 pb-1">
          <p className="text-5xl font-bold tabular-nums tracking-tighter text-text">
            {Math.round(nav.distanceToManeuverM / 10) * 10}
            <span className="ml-1 text-2xl font-medium text-text-muted">m</span>
          </p>
        </div>
      )}
      <div className="flex items-stretch gap-3 p-4">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl",
            nav.arrived
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-orange/15 text-orange"
          )}
        >
          {nav.arrived ? (
            <MapPin className="h-7 w-7" />
          ) : (
            <ManeuverIcon kind={kind} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate text-xl font-semibold tracking-tight text-text">
              {nav.primaryText}
            </p>
            {!nav.arrived && distanceLabel !== "now" && (
              <span className="shrink-0 text-sm font-medium tabular-nums text-orange">
                in {distanceLabel}
              </span>
            )}
            {!nav.arrived && distanceLabel === "now" && (
              <span className="shrink-0 animate-pulse text-sm font-medium text-orange">
                now
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-text-muted">
            {nav.arrived ? destination : nav.secondaryText}
          </p>
        </div>
      </div>

      <div className="border-t border-white/5 px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
          <span className="tabular-nums">
            {loading ? "Updating route…" : formatMeters(nav.distanceRemainingM)}{" "}
            left
          </span>
          <span className="tabular-nums">{formatEta(nav.etaSeconds)}</span>
        </div>
        <Progress value={nav.progressPercent} className="h-1.5" />
        <p className="mt-2 truncate text-[11px] text-text-muted/80">
          To {destination}
        </p>
      </div>
    </div>
  );
}
