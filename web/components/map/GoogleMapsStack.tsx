"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  GoogleMap,
  InfoWindow,
  Marker,
  TrafficLayer,
  useJsApiLoader,
} from "@react-google-maps/api";
import type { Task } from "@/lib/types/task";
import type { ShowcaseItem } from "@/lib/api/showcase";
import { FlutterMapControls } from "@/components/map/FlutterMapControls";
import { FlutterMapRadiusBar } from "@/components/map/FlutterMapRadiusBar";
import {
  googleMapOptionsForStyle,
  userLocationCircleOptions,
  type FlutterMapStyle,
} from "@/lib/map/flutterMapTheme";
import {
  googleJobMarkerIcon,
  googleShowcaseMarkerIcon,
} from "@/lib/map/mapMarkerIcons";

export type ShowcaseMapPoint = {
  item: ShowcaseItem;
  lat: number;
  lng: number;
  providerName?: string;
  providerRoleLabel?: string;
  providerPhotoUrl?: string;
};

type MapStyle = FlutterMapStyle;

const TORONTO = { lat: 43.6532, lng: -79.3832 };
const MAP_CONTAINER_STYLE: React.CSSProperties = { width: "100%", height: "100%" };

function hasValidCoords(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}

function userMarkerIcon(): google.maps.Icon {
  return {
    url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    scaledSize: new google.maps.Size(32, 32),
    anchor: new google.maps.Point(16, 32),
  };
}

function firstSkillLabel(item: ShowcaseItem): string {
  if (Array.isArray(item.tags) && item.tags.length > 0) return item.tags[0];
  if (typeof item.skills === "string" && item.skills.trim()) {
    return item.skills.split(",").map((s) => s.trim()).filter(Boolean)[0] || "";
  }
  return item.postingAs === "company"
    ? "Company showcase"
    : item.postingAs === "instore"
      ? "In-store service"
      : "Service provider";
}

function showcaseRateLabel(item: ShowcaseItem): string {
  if (typeof item.skills === "string" && item.skills.trim()) {
    return item.skills.split(",").map((s) => s.trim()).filter(Boolean)[0] || "Showcase";
  }
  if (Array.isArray(item.tags) && item.tags.length > 0) return item.tags[0];
  return "Showcase";
}

function formatTaskPrice(task: Task): string {
  if (task.jobType === "fixed") return `$${task.fixedPrice || task.price} fixed`;
  return `$${task.hourlyRate || task.price}/hr`;
}

export type GoogleMapsStackProps = {
  jobs: Task[];
  showcasePoints: ShowcaseMapPoint[];
  userLocation: { lat: number; lng: number } | null;
  centerOnUser: boolean;
  fitBoundsToken: number;
  mapStyle: MapStyle;
  onLocateUser: () => void;
  onCycleMapStyle: () => void;
  onJobClick: (job: Task) => void;
  onShowcaseOpen: (item: ShowcaseItem) => void;
  /** Initial / fallback center (Flutter default: Toronto). */
  mapCenter: google.maps.LatLngLiteral;
  totalPins: number;
  radiusKm: number;
  radiusOptions: number[];
  onRadiusChange: (radiusKm: number) => void;
};

export function GoogleMapsStack({
  jobs,
  showcasePoints,
  userLocation,
  centerOnUser,
  fitBoundsToken,
  mapStyle,
  onLocateUser,
  onCycleMapStyle,
  onJobClick,
  onShowcaseOpen,
  mapCenter,
  totalPins,
  radiusKm,
  radiusOptions,
  onRadiusChange,
}: GoogleMapsStackProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const { isLoaded, loadError } = useJsApiLoader({
    id: "taskzing-google-maps",
    googleMapsApiKey: apiKey,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const hasInitialFit = useRef(false);
  const lastFitToken = useRef(0);
  const [showcaseInfoId, setShowcaseInfoId] = useState<string | null>(null);
  const [hoveredShowcaseId, setHoveredShowcaseId] = useState<string | null>(null);
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  const [jobInfoId, setJobInfoId] = useState<string | null>(null);
  const [mapInstanceTick, setMapInstanceTick] = useState(0);

  const mapOptions = useMemo(
    (): google.maps.MapOptions => googleMapOptionsForStyle(mapStyle),
    [mapStyle]
  );

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapInstanceTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const map = mapRef.current;
    if (!map || mapInstanceTick === 0) return;

    if (centerOnUser && userLocation) {
      map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      map.setZoom(15);
      return;
    }

    if (fitBoundsToken !== lastFitToken.current) {
      lastFitToken.current = fitBoundsToken;
      hasInitialFit.current = false;
    }

    if (hasInitialFit.current) return;

    const bounds = new google.maps.LatLngBounds();
    jobs.forEach((job) => {
      if (hasValidCoords(job.lat, job.lng)) {
        bounds.extend({ lat: job.lat, lng: job.lng });
      }
    });
    showcasePoints.forEach((s) => {
      bounds.extend({ lat: s.lat, lng: s.lng });
    });
    if (userLocation) {
      bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
    }

    if (bounds.isEmpty()) {
      map.setCenter(TORONTO);
      map.setZoom(14);
      hasInitialFit.current = true;
      return;
    }

    map.fitBounds(bounds, 56);
    const listener = google.maps.event.addListenerOnce(map, "idle", () => {
      const z = map.getZoom();
      if (typeof z === "number" && z > 14) map.setZoom(14);
    });
    hasInitialFit.current = true;
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [
    isLoaded,
    mapInstanceTick,
    jobs,
    showcasePoints,
    userLocation,
    centerOnUser,
    fitBoundsToken,
  ]);

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 p-4 text-center text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
        Could not load Google Maps. Check{" "}
        <code className="mx-1 rounded bg-gray-200 px-1 dark:bg-gray-800">
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        </code>{" "}
        and billing on the Google Cloud project.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-red-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading map…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={mapCenter}
        zoom={14}
        onLoad={onMapLoad}
        options={mapOptions}
      >
        <TrafficLayer />
        {userLocation && (
          <>
            <Marker
              position={{ lat: userLocation.lat, lng: userLocation.lng }}
              icon={userMarkerIcon()}
              title="You are here"
            />
            <Circle
              center={{ lat: userLocation.lat, lng: userLocation.lng }}
              radius={radiusKm * 1000}
              options={userLocationCircleOptions}
            />
          </>
        )}
        {showcasePoints.map((p) => {
          const id = p.item.id;
          if (!id || !hasValidCoords(p.lat, p.lng)) return null;
          const isPreviewOpen = hoveredShowcaseId === id || showcaseInfoId === id;
          const displayName =
            p.providerName ||
            p.item.storeName ||
            p.item.companyName ||
            p.item.title ||
            "Service provider";
          const subtitle = firstSkillLabel(p.item);
          const cover = p.providerPhotoUrl || p.item.imageUrls?.[0];
          const rateLabel = showcaseRateLabel(p.item);
          return (
            <Marker
              key={`showcase-${id}`}
              position={{ lat: p.lat, lng: p.lng }}
              icon={googleShowcaseMarkerIcon()}
              onMouseOver={() => {
                setHoveredShowcaseId(id);
                setShowcaseInfoId(id);
              }}
              onMouseOut={() =>
                setHoveredShowcaseId((prev) =>
                  prev === id && showcaseInfoId !== id ? null : prev
                )
              }
              onClick={() => setShowcaseInfoId(id)}
            >
              {isPreviewOpen && (
                <InfoWindow
                  onCloseClick={() => setShowcaseInfoId(null)}
                  options={{ pixelOffset: new google.maps.Size(0, -26) }}
                >
                  <div
                    className="w-[232px] rounded-2xl bg-white px-3 py-2 text-[#28357A] shadow-lg"
                    onMouseEnter={() => setHoveredShowcaseId(id)}
                    onMouseLeave={() => setHoveredShowcaseId((prev) => (prev === id ? null : prev))}
                  >
                    <button
                      type="button"
                      onClick={() => onShowcaseOpen(p.item)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-2">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200">
                          {cover ? (
                            <img src={cover} alt={displayName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-500">
                              {displayName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="line-clamp-1 text-[14px] font-bold leading-tight text-[#2D3A82]">
                              {displayName}
                            </p>
                            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-red-500" />
                          </div>
                          <p className="line-clamp-1 text-[14px] leading-tight text-[#2D3A82]">
                            {p.providerRoleLabel || subtitle}
                          </p>
                          <p className="line-clamp-1 text-[16px] font-semibold leading-tight text-[#E53935]">
                            {rateLabel}
                          </p>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-sm text-[#2D3A82]">
                        <span>📍</span>
                        <span className="line-clamp-1">{p.item.location || "Location unavailable"}</span>
                      </div>
                    </button>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          );
        })}
        {jobs.map((job) =>
          hasValidCoords(job.lat, job.lng) ? (
            <Marker
              key={job.jobId}
              position={{ lat: job.lat, lng: job.lng }}
              icon={googleJobMarkerIcon()}
              onMouseOver={() => {
                setHoveredJobId(job.jobId);
                setJobInfoId(job.jobId);
              }}
              onMouseOut={() =>
                setHoveredJobId((prev) =>
                  prev === job.jobId && jobInfoId !== job.jobId ? null : prev
                )
              }
              onClick={() => {
                setJobInfoId(job.jobId);
                onJobClick(job);
              }}
            >
              {(hoveredJobId === job.jobId || jobInfoId === job.jobId) && (
                <InfoWindow
                  onCloseClick={() => setJobInfoId(null)}
                  options={{ pixelOffset: new google.maps.Size(0, -26) }}
                >
                  <div className="w-[232px] rounded-2xl bg-white px-3 py-2 text-[#28357A] shadow-lg">
                    <button
                      type="button"
                      onClick={() => onJobClick(job)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-2">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200">
                          {job.photos?.[0] ? (
                            <img src={job.photos[0]} alt={job.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-500">
                              {(job.posterName || job.title || "J").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="line-clamp-1 text-[14px] font-bold leading-tight text-[#2D3A82]">
                              {job.posterName || job.title}
                            </p>
                            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-red-500" />
                          </div>
                          <p className="line-clamp-1 text-[14px] leading-tight text-[#2D3A82]">
                            {job.category || "Service"}
                          </p>
                          <p className="line-clamp-1 text-[16px] font-semibold leading-tight text-[#E53935]">
                            {formatTaskPrice(job)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-sm text-[#2D3A82]">
                        <span>📍</span>
                        <span className="line-clamp-1">{job.address || "Location unavailable"}</span>
                      </div>
                    </button>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          ) : null
        )}
      </GoogleMap>

      <FlutterMapControls
        mapStyle={mapStyle}
        onLocate={onLocateUser}
        onCycleStyle={onCycleMapStyle}
      />

      <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/75 px-4 py-1.5 text-xs font-medium text-white sm:hidden">
        {totalPins} on map · tap pins for details
      </div>
      <FlutterMapRadiusBar
        radiusKm={radiusKm}
        radiusOptions={radiusOptions}
        onRadiusChange={onRadiusChange}
      />
    </div>
  );
}
