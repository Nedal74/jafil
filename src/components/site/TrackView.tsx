"use client";

import { useEffect } from "react";
import { track, type TrackEvent } from "@/lib/track-client";

export function TrackView({ event, params, dedupeKey }: { event: TrackEvent; params?: Record<string, string>; dedupeKey?: string }) {
  useEffect(() => {
    track(event, params, dedupeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, dedupeKey]);
  return null;
}
