"use client";

import { useEffect } from "react";
import { useGoogleMap } from "@react-google-maps/api";

/** Pans the parent GoogleMap when `target` changes (e.g. after Near me). */
export function GoogleMapPanTo({
  target,
  zoom = 16,
}: {
  target: { lat: number; lng: number } | null;
  zoom?: number;
}) {
  const map = useGoogleMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
    const current = map.getZoom();
    if (typeof current !== "number" || current < zoom) {
      map.setZoom(zoom);
    }
  }, [map, target?.lat, target?.lng, zoom]);

  return null;
}
