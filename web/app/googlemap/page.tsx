"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/api/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { UserData } from "@/lib/api/auth";
import {
  MapPin,
  X,
  Navigation,
  Locate,
  Search,
  LayoutList,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { Task } from "@/lib/types/task";
import { getOpenJobs } from "@/lib/api/jobs";
import { getAllShowcases, formatShowcaseLoadError } from "@/lib/api/showcase";
import type { ShowcaseItem } from "@/lib/api/showcase";
import dynamic from "next/dynamic";
import { GoogleMapsStack } from "@/components/map/GoogleMapsStack";
import { FlutterMapControls } from "@/components/map/FlutterMapControls";
import { FlutterMapRadiusBar } from "@/components/map/FlutterMapRadiusBar";
import {
  cycleFlutterMapStyle,
  leafletTileConfig,
  type FlutterMapStyle,
} from "@/lib/map/flutterMapTheme";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);

const DEFAULT_CENTER: [number, number] = [43.6532, -79.3832];
const RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100] as const;
const MAX_GEOCODE_TOTAL = 8;
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

function hasValidCoords(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const q = address.trim();
  if (!q) return null;
  const cacheKey = q.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) || null;
  }
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
      { headers: { "User-Agent": "TaskZing/1.0 (map; contact support@taskzing.com)" } }
    );
    const data = await response.json();
    if (data?.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      geocodeCache.set(cacheKey, coords);
      return coords;
    }
    geocodeCache.set(cacheKey, null);
    return null;
  } catch {
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

/** Who is using the map: drives default Jobs vs Showcases visibility. */
function mapPageAudience(userData: UserData | null): "guest" | "provider" | "client" {
  if (!userData) return "guest";
  const cur = String(userData.currentRole ?? userData.role ?? "client");
  if (cur === "provider") return "provider";
  return "client";
}

type ShowcaseMapPoint = {
  item: ShowcaseItem;
  lat: number;
  lng: number;
  providerName?: string;
  providerRoleLabel?: string;
  providerPhotoUrl?: string;
};

function providerRoleLabel(userRole?: string, currentRole?: string): string {
  const role = String(currentRole ?? userRole ?? "").toLowerCase();
  if (role.includes("provider")) return "Provider";
  if (role.includes("client")) return "Client";
  return "Service provider";
}

function MapController({
  jobs,
  showcasePoints,
  userLocation,
  centerOnUser,
  fitBoundsToken,
}: {
  jobs: Task[];
  showcasePoints: ShowcaseMapPoint[];
  userLocation: { lat: number; lng: number } | null;
  centerOnUser: boolean;
  fitBoundsToken: number;
}) {
  const { useMap } = require("react-leaflet");
  const map = useMap();
  const hasInitialFit = useRef(false);
  const lastFitToken = useRef(0);

  useEffect(() => {
    if (centerOnUser && userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 15);
      return;
    }

    if (fitBoundsToken !== lastFitToken.current) {
      lastFitToken.current = fitBoundsToken;
      hasInitialFit.current = false;
    }

    if (hasInitialFit.current) return;

    const coords: [number, number][] = [];
    jobs.forEach((job) => {
      if (hasValidCoords(job.lat, job.lng)) coords.push([job.lat, job.lng]);
    });
    showcasePoints.forEach((s) => coords.push([s.lat, s.lng]));
    if (userLocation) coords.push([userLocation.lat, userLocation.lng]);

    if (coords.length === 0) return;

    const L = require("leaflet");
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 14 });
    hasInitialFit.current = true;
  }, [jobs, showcasePoints, userLocation, centerOnUser, map, fitBoundsToken]);

  return null;
}

type MapStyle = FlutterMapStyle;

function matchesSearchJob(job: Task, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.toLowerCase();
  return (
    job.title.toLowerCase().includes(s) ||
    job.description.toLowerCase().includes(s) ||
    (job.address || "").toLowerCase().includes(s) ||
    (job.category || "").toLowerCase().includes(s)
  );
}

function matchesSearchShowcase(p: ShowcaseMapPoint, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.toLowerCase();
  const { item } = p;
  return (
    item.title.toLowerCase().includes(s) ||
    item.description.toLowerCase().includes(s) ||
    item.location.toLowerCase().includes(s) ||
    (item.skills || "").toLowerCase().includes(s)
  );
}

export default function GoogleMapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData } = useAuth();
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const useGoogleMaps = googleMapsApiKey.length > 0;
  const [jobs, setJobs] = useState<Task[]>([]);
  const [showcasePoints, setShowcasePoints] = useState<ShowcaseMapPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Task | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [centerOnUser, setCenterOnUser] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [jobIcon, setJobIcon] = useState<any>(null);
  const [showcaseIcon, setShowcaseIcon] = useState<any>(null);
  const [userIcon, setUserIcon] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [hoveredShowcaseId, setHoveredShowcaseId] = useState<string | null>(null);
  const [selectedShowcaseId, setSelectedShowcaseId] = useState<string | null>(null);
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  /** Flutter `CustomGoogleMap`: index 0 = light (default). */
  const [mapStyle, setMapStyle] = useState<MapStyle>("default");
  const [fitBoundsToken, setFitBoundsToken] = useState(0);
  const [radiusKm, setRadiusKm] = useState<number>(5);

  const locateFromUrl =
    searchParams.get("locate") === "1" ||
    searchParams.get("nearMe") === "1" ||
    searchParams.get("myLocation") === "1";
  const autoLocateFromQueryDone = useRef(false);

  const audience = useMemo(() => mapPageAudience(userData), [userData]);

  const jobsOnMap = useMemo(
    () => jobs.filter((j) => hasValidCoords(j.lat, j.lng)),
    [jobs]
  );
  const filteredJobs = useMemo(
    () => jobsOnMap.filter((j) => matchesSearchJob(j, searchQuery)),
    [jobsOnMap, searchQuery]
  );
  const filteredShowcases = useMemo(
    () => showcasePoints.filter((p) => matchesSearchShowcase(p, searchQuery)),
    [showcasePoints, searchQuery]
  );

  const radiusFilteredJobs = useMemo(() => {
    if (!userLocation) return filteredJobs;
    return filteredJobs.filter((job) => {
      if (!hasValidCoords(job.lat, job.lng)) return false;
      return (
        calculateDistanceKm(
          userLocation.lat,
          userLocation.lng,
          job.lat,
          job.lng
        ) <= radiusKm
      );
    });
  }, [filteredJobs, userLocation, radiusKm]);

  const radiusFilteredShowcases = useMemo(() => {
    if (!userLocation) return filteredShowcases;
    return filteredShowcases.filter((point) => {
      if (!hasValidCoords(point.lat, point.lng)) return false;
      return (
        calculateDistanceKm(
          userLocation.lat,
          userLocation.lng,
          point.lat,
          point.lng
        ) <= radiusKm
      );
    });
  }, [filteredShowcases, userLocation, radiusKm]);

  /** Map pins: clients = showcases only; providers = jobs only; guests = both. */
  const mapJobs = useMemo(
    () => (audience === "client" ? [] : radiusFilteredJobs),
    [audience, radiusFilteredJobs]
  );
  const mapShowcases = useMemo(
    () => (audience === "provider" ? [] : radiusFilteredShowcases),
    [audience, radiusFilteredShowcases]
  );

  useEffect(() => {
    if (audience === "client") setSelectedJob(null);
  }, [audience]);

  useEffect(() => {
    if (useGoogleMaps) {
      setMapReady(true);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);

    const setupLeaflet = async () => {
      const L = await import("leaflet");
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const jobPin = L.divIcon({
        className: "taskzing-leaflet-divicon",
        html: `<div style="width:26px;height:26px;background:linear-gradient(145deg,#3b82f6,#1d4ed8);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.3);"></div>`,
        iconSize: [28, 36],
        iconAnchor: [14, 34],
      });
      setJobIcon(jobPin);

      const showcasePin = L.divIcon({
        className: "taskzing-leaflet-divicon",
        html: `<div style="width:26px;height:26px;background:linear-gradient(145deg,#fb7185,#e11d48);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.3);"></div>`,
        iconSize: [28, 36],
        iconAnchor: [14, 34],
      });
      setShowcaseIcon(showcasePin);

      const blueIcon = new L.Icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      setUserIcon(blueIcon);
      setMapReady(true);
    };

    void setupLeaflet();

    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, [useGoogleMaps]);

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (locateFromUrl) return;
    requestUserLocation();
  }, [requestUserLocation, locateFromUrl]);

  /** Deep links from client home / provider explore: `?locate=1` centers the map on the user. */
  useEffect(() => {
    if (!locateFromUrl || autoLocateFromQueryDone.current) return;
    if (!navigator.geolocation) {
      window.alert("Your browser does not support location.");
      return;
    }
    autoLocateFromQueryDone.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setCenterOnUser(true);
        setTimeout(() => setCenterOnUser(false), 400);
        setViewMode("map");
      },
      () => {
        window.alert(
          "Unable to read your location. Allow location access and try again."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [locateFromUrl]);

  const loadData = useCallback(async () => {
    setLoadError(null);
    setIsLoading(true);

    try {
      const [openJobs, showcasesResult] = await Promise.all([
        getOpenJobs(),
        getAllShowcases().catch((e: unknown) => {
          console.warn(e);
          setLoadError(formatShowcaseLoadError(e));
          return [] as ShowcaseItem[];
        }),
      ]);

      // Fast path: render immediately using existing coordinates.
      setJobs(openJobs);
      let showcases: ShowcaseItem[] = [];
      showcases = showcasesResult;
      const immediatePoints: ShowcaseMapPoint[] = showcases
        .map((item) => ({
          item,
          lat: item.lat ?? NaN,
          lng: item.lng ?? NaN,
          providerName:
            item.storeName ||
            item.companyName ||
            item.title ||
            "Service provider",
          providerRoleLabel: providerRoleLabel(undefined, undefined),
          providerPhotoUrl: item.imageUrls?.[0],
        }))
        .filter((p) => hasValidCoords(p.lat, p.lng));
      setShowcasePoints(immediatePoints);

      // Background enrichment: geocode missing coordinates after first render.
      void (async () => {
        let geocodeRemaining = MAX_GEOCODE_TOTAL;
        const enrichedJobs: Task[] = [...openJobs];
        const jobsToGeocode = openJobs
          .map((job, index) => ({ job, index, address: job.address?.trim() || "" }))
          .filter(
            ({ job, address }) =>
              !hasValidCoords(job.lat, job.lng) && address.length > 0
          )
          .slice(0, geocodeRemaining);

        geocodeRemaining -= jobsToGeocode.length;
        if (jobsToGeocode.length > 0) {
          const geocodedJobs = await Promise.all(
            jobsToGeocode.map(async ({ index, address }) => ({
              index,
              coords: await geocodeAddress(address),
            }))
          );
          geocodedJobs.forEach(({ index, coords }) => {
            if (!coords) return;
            enrichedJobs[index] = {
              ...enrichedJobs[index],
              lat: coords.lat,
              lng: coords.lng,
            };
          });
          setJobs(enrichedJobs);
        }

        const showcaseCoordList = await Promise.all(
          showcases.map(async (item, idx) => {
            const lat = item.lat ?? NaN;
            const lng = item.lng ?? NaN;
            if (hasValidCoords(lat, lng)) return { idx, lat, lng };
            if (geocodeRemaining <= 0) return { idx, lat: NaN, lng: NaN };
            const loc = item.location?.trim();
            if (!loc) return { idx, lat: NaN, lng: NaN };
            geocodeRemaining -= 1;
            const coords = await geocodeAddress(loc);
            if (!coords) return { idx, lat: NaN, lng: NaN };
            return { idx, lat: coords.lat, lng: coords.lng };
          })
        );

        const enrichedPoints: ShowcaseMapPoint[] = showcaseCoordList.reduce<
          ShowcaseMapPoint[]
        >((points, { idx, lat, lng }) => {
          if (!hasValidCoords(lat, lng)) return points;
          const item = showcases[idx];
          points.push({
            item,
            lat,
            lng,
            providerName:
              item.storeName ||
              item.companyName ||
              item.title ||
              "Service provider",
            providerRoleLabel: providerRoleLabel(undefined, undefined),
            providerPhotoUrl: item.imageUrls?.[0],
          });
          return points;
        }, []);
        setShowcasePoints(enrichedPoints);
      })();
    } catch (e) {
      console.error(e);
      setLoadError((e as Error)?.message || "Failed to load map data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFitBoundsToken((t) => t + 1);
    await loadData();
    setIsRefreshing(false);
  };

  const cycleMapStyle = useCallback(() => {
    setMapStyle((prev) => cycleFlutterMapStyle(prev));
  }, []);

  const tileConfig = useMemo(() => leafletTileConfig(mapStyle), [mapStyle]);

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      window.alert("Your browser does not support location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(loc);
        setCenterOnUser(true);
        setTimeout(() => setCenterOnUser(false), 400);
        setViewMode("map");
      },
      () => {
        window.alert(
          "Unable to read your location. Allow location access and try again."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const handleRadiusChange = useCallback(
    (nextKm: number) => {
      setRadiusKm(nextKm);
      if (!userLocation) handleNearMe();
    },
    [userLocation, handleNearMe]
  );

  const formatPrice = (task: Task) => {
    if (task.jobType === "fixed") {
      return `$${task.fixedPrice || task.price} fixed`;
    }
    return `$${task.hourlyRate || task.price}/hr`;
  };

  const openShowcaseDetail = (item: ShowcaseItem) => {
    const id = item.id;
    if (!id) return;
    const q = item.userId
      ? `?provider=${encodeURIComponent(item.userId)}`
      : "";
    router.push(`/work-details/${id}${q}`);
  };

  const openJobDetail = useCallback(
    (job: Task) => {
      router.push(`/job-details/${job.jobId}`);
    },
    [router]
  );

  const getMapCenter = (): [number, number] => {
    if (userLocation) return [userLocation.lat, userLocation.lng];
    if (mapJobs[0]) return [mapJobs[0].lat, mapJobs[0].lng];
    if (mapShowcases[0]) return [mapShowcases[0].lat, mapShowcases[0].lng];
    return DEFAULT_CENTER;
  };

  const mapCenterLiteral = useMemo(() => {
    if (userLocation) return { lat: userLocation.lat, lng: userLocation.lng };
    const j = mapJobs[0];
    if (j && hasValidCoords(j.lat, j.lng)) return { lat: j.lat, lng: j.lng };
    const s = mapShowcases[0];
    if (s && hasValidCoords(s.lat, s.lng)) return { lat: s.lat, lng: s.lng };
    return { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
  }, [userLocation, mapJobs, mapShowcases]);

  const totalPins = mapJobs.length + mapShowcases.length;

  return (
    <DashboardLayout hideNavigationChrome>
    <div className="flex h-screen flex-col overflow-hidden bg-[#F3F4F6] pb-20 dark:bg-darkBlue-013 lg:pb-0">
      <div className="mx-auto w-full max-w-6xl px-4 pb-5 pt-3 sm:px-6">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex min-w-0 flex-1 items-center rounded-full border border-[#1A202C] bg-white px-2 py-1.5 shadow-sm dark:border-white/25 dark:bg-darkBlue-203/45">
            <button
              type="button"
              onClick={handleNearMe}
              aria-label="Near me"
              className="flex h-9 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF1D25] text-white"
            >
              <Locate className="h-4 w-4" />
            </button>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Explore Here"
              className="min-w-0 flex-1 border-0 bg-transparent px-3 text-xl font-semibold text-[#2D3A82] placeholder:text-[#2D3A82] focus:outline-none dark:text-white dark:placeholder:text-white/90"
            />
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              aria-label="Search and refresh"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF1D25] text-white disabled:opacity-60"
            >
              <Search className={`h-5 w-5 ${isRefreshing ? "animate-pulse" : ""}`} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (audience === "client") {
                router.push("/client-home");
                return;
              }
              if (audience === "provider") {
                router.push("/provider-explore");
                return;
              }
              router.push("/explore");
            }}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-[#E8C5CC] bg-[#F6E8EA] px-4 text-sm font-semibold text-[#352E58] transition hover:bg-[#f1dde1] dark:border-white/20 dark:bg-white/10 dark:text-white"
          >
            <LayoutList className="h-4 w-4 text-[#E53E3E]" />
            List
          </button>
        </div>

        {loadError && (
          <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
            {loadError.length > 160 ? `${loadError.slice(0, 160)}…` : loadError}
          </p>
        )}
      </div>

      <div className="relative z-0 mx-auto mb-4 w-[calc(100%-2rem)] max-w-6xl flex-1 isolate overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-darkBlue-203">
        {viewMode === "list" ? (
          <div className="h-full overflow-y-auto bg-gray-50 p-4 dark:bg-darkBlue-013">
            <div className="mx-auto max-w-lg space-y-6">
              {audience !== "provider" && (
              <section>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                  <Sparkles className="h-4 w-4" />
                  Showcased work
                </h2>
                {filteredShowcases.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No showcases match your search or have a mappable location.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {filteredShowcases.map((p) => (
                      <li key={`${p.item.id}-${p.item.userId}`}>
                        <button
                          type="button"
                          onClick={() => openShowcaseDetail(p.item)}
                          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-rose-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-rose-500/50"
                        >
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {p.item.title || "Showcase"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                            {p.item.location}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              )}
              {audience !== "client" && (
              <section>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  <Briefcase className="h-4 w-4" />
                  Posted jobs
                </h2>
                {filteredJobs.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No open jobs match your search or have coordinates yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {filteredJobs.map((job) => (
                      <li key={job.jobId}>
                        <button
                          type="button"
                          onClick={() => router.push(`/job-details/${job.jobId}`)}
                          className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500/50"
                        >
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {job.title}
                          </p>
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            {formatPrice(job)}
                          </p>
                          <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                            {job.address}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              )}
            </div>
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-red-500" />
              <p className="text-gray-600 dark:text-gray-400">
                {"loading "}
              </p>
            </div>
          </div>
        ) : useGoogleMaps ? (
          <div className="relative h-full w-full">
            <GoogleMapsStack
              jobs={mapJobs}
              showcasePoints={mapShowcases}
              userLocation={userLocation}
              centerOnUser={centerOnUser}
              fitBoundsToken={fitBoundsToken}
              mapStyle={mapStyle}
              onLocateUser={handleNearMe}
              onCycleMapStyle={cycleMapStyle}
              onJobClick={openJobDetail}
              onShowcaseOpen={openShowcaseDetail}
              mapCenter={mapCenterLiteral}
              totalPins={totalPins}
              radiusKm={radiusKm}
              radiusOptions={[...RADIUS_OPTIONS_KM]}
              onRadiusChange={handleRadiusChange}
            />

            {selectedJob &&
              audience !== "client" &&
              !isLoading && (
                <div className="absolute bottom-4 left-4 right-4 z-20 sm:left-auto sm:right-4 sm:w-96">
                  <div className="rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-darkBlue-203">
                    <div className="p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <h3 className="flex-1 text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedJob.title}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setSelectedJob(null)}
                          className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <X className="h-5 w-5 text-gray-500" />
                        </button>
                      </div>
                      {selectedJob.photos?.[0] && (
                        <img
                          src={selectedJob.photos[0]}
                          alt=""
                          className="mb-3 h-32 w-full rounded-lg object-cover"
                        />
                      )}
                      <div className="mb-2 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="line-clamp-2">{selectedJob.address}</span>
                      </div>
                      <p className="mb-3 text-lg font-bold text-red-500">
                        {formatPrice(selectedJob)}
                      </p>
                      <div className="flex gap-2">
                        <Link
                          href={`/job-details/${selectedJob.jobId}`}
                          className="flex-1 rounded-lg bg-red-500 py-2 text-center text-sm font-semibold text-white hover:bg-red-600"
                        >
                          View details
                        </Link>
                        <button
                          type="button"
                          onClick={() => setSelectedJob(null)}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        ) : !mapReady ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-red-500" />
              <p className="text-gray-600 dark:text-gray-400">
                {"loading "}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full">
            <MapContainer
              center={getMapCenter()}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                attribution={tileConfig.attribution}
                url={tileConfig.url}
              />
              <MapController
                jobs={mapJobs}
                showcasePoints={mapShowcases}
                userLocation={userLocation}
                centerOnUser={centerOnUser}
                fitBoundsToken={fitBoundsToken}
              />
              {userLocation && userIcon && (
                <Marker
                  position={[userLocation.lat, userLocation.lng]}
                  icon={userIcon}
                >
                  <Tooltip
                    permanent={false}
                    direction="top"
                    className="taskzing-map-tooltip"
                  >
                    You are here
                  </Tooltip>
                  <Popup>
                    <div className="p-1 text-center text-sm">
                      <Navigation className="mx-auto mb-1 h-4 w-4 text-blue-500" />
                      <span className="font-semibold">Your location</span>
                    </div>
                  </Popup>
                </Marker>
              )}
              {userLocation && (
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={radiusKm * 1000}
                  pathOptions={{
                    color: "#E46B6B",
                    fillColor: "#F7B8B8",
                    fillOpacity: 0.22,
                    weight: 2,
                  }}
                />
              )}

              {showcaseIcon &&
                mapShowcases.map((p) => {
                  const id = p.item.id;
                  if (!id) return null;
                  const displayName =
                    p.providerName ||
                    p.item.storeName ||
                    p.item.companyName ||
                    p.item.title ||
                    "Service provider";
                  const subtitle =
                    p.providerRoleLabel ||
                    p.item.skills?.split(",").map((s) => s.trim()).filter(Boolean)[0] ||
                    "Service provider";
                  const redLine =
                    p.item.skills?.split(",").map((s) => s.trim()).filter(Boolean)[0] ||
                    (p.item.postingAs === "company"
                      ? "Company"
                      : p.item.postingAs === "instore"
                        ? "In-store"
                        : "Provider");
                  return (
                    <Marker
                      key={`showcase-${id}`}
                      position={[p.lat, p.lng]}
                      icon={showcaseIcon}
                      eventHandlers={{
                        mouseover: () => setHoveredShowcaseId(id),
                        mouseout: () =>
                          setHoveredShowcaseId((prev) =>
                            prev === id && selectedShowcaseId !== id ? null : prev
                          ),
                        click: () => {
                          setSelectedShowcaseId(id);
                          openShowcaseDetail(p.item);
                        },
                      }}
                    >
                      {(hoveredShowcaseId === id || selectedShowcaseId === id) && (
                        <Tooltip
                          permanent
                          direction="top"
                          offset={[0, -36]}
                          opacity={1}
                          className="taskzing-map-tooltip !bg-transparent !border-0 !shadow-none !p-0"
                        >
                          <button
                            type="button"
                            onClick={() => openShowcaseDetail(p.item)}
                            className="w-[232px] rounded-2xl bg-white px-3 py-2 text-left text-[#28357A] shadow-lg"
                          >
                            <div className="flex items-start gap-2">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200">
                                {p.providerPhotoUrl ? (
                                  <img
                                    src={p.providerPhotoUrl}
                                    alt={displayName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : p.item.imageUrls?.[0] ? (
                                  <img
                                    src={p.item.imageUrls[0]}
                                    alt={displayName}
                                    className="h-full w-full object-cover"
                                  />
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
                                  {subtitle}
                                </p>
                                <p className="line-clamp-1 text-[16px] font-semibold leading-tight text-[#E53935]">
                                  {redLine}
                                </p>
                              </div>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-sm text-[#2D3A82]">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="line-clamp-1">
                                {p.item.location || "Location unavailable"}
                              </span>
                            </div>
                          </button>
                        </Tooltip>
                      )}
                    </Marker>
                  );
                })}

              {jobIcon &&
                mapJobs.map((job) => (
                  <Marker
                    key={job.jobId}
                    position={[job.lat, job.lng]}
                    icon={jobIcon}
                    eventHandlers={{
                      mouseover: () => setHoveredJobId(job.jobId),
                      mouseout: () =>
                        setHoveredJobId((prev) => (prev === job.jobId ? null : prev)),
                      click: () => openJobDetail(job),
                    }}
                  >
                    {hoveredJobId === job.jobId && (
                      <Tooltip
                        permanent
                        direction="top"
                        offset={[0, -36]}
                        opacity={1}
                        className="taskzing-map-tooltip !bg-transparent !border-0 !shadow-none !p-0"
                      >
                        <button
                          type="button"
                          onClick={() => openJobDetail(job)}
                          className="w-[232px] rounded-2xl bg-white px-3 py-2 text-left text-[#28357A] shadow-lg"
                        >
                          <div className="flex items-start gap-2">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200">
                              {job.photos?.[0] ? (
                                <img
                                  src={job.photos[0]}
                                  alt={job.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-500">
                                  {(job.posterName || job.title || "J")
                                    .slice(0, 1)
                                    .toUpperCase()}
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
                                {formatPrice(job)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-sm text-[#2D3A82]">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="line-clamp-1">
                              {job.address || "Location unavailable"}
                            </span>
                          </div>
                        </button>
                      </Tooltip>
                    )}
                    <Popup>
                      <div className="min-w-[200px] p-1">
                        <p className="text-xs font-semibold uppercase text-blue-600">
                          Job
                        </p>
                        <h3 className="text-sm font-bold">{job.title}</h3>
                        <p className="text-sm font-semibold text-red-600">
                          {formatPrice(job)}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/job-details/${job.jobId}`)
                          }
                          className="mt-2 w-full rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          View job
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>

            <FlutterMapControls
              mapStyle={mapStyle}
              onLocate={handleNearMe}
              onCycleStyle={cycleMapStyle}
            />

            <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/75 px-4 py-1.5 text-xs font-medium text-white sm:hidden">
              {totalPins} on map · tap pins for details
            </div>
            <FlutterMapRadiusBar
              radiusKm={radiusKm}
              radiusOptions={RADIUS_OPTIONS_KM}
              onRadiusChange={handleRadiusChange}
            />

            {selectedJob &&
              audience !== "client" &&
              !isLoading &&
              mapReady && (
                <div className="absolute bottom-4 left-4 right-4 z-20 sm:left-auto sm:right-4 sm:w-96">
                  <div className="rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-darkBlue-203">
                    <div className="p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <h3 className="flex-1 text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedJob.title}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setSelectedJob(null)}
                          className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <X className="h-5 w-5 text-gray-500" />
                        </button>
                      </div>
                      {selectedJob.photos?.[0] && (
                        <img
                          src={selectedJob.photos[0]}
                          alt=""
                          className="mb-3 h-32 w-full rounded-lg object-cover"
                        />
                      )}
                      <div className="mb-2 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="line-clamp-2">{selectedJob.address}</span>
                      </div>
                      <p className="mb-3 text-lg font-bold text-red-500">
                        {formatPrice(selectedJob)}
                      </p>
                      <div className="flex gap-2">
                        <Link
                          href={`/job-details/${selectedJob.jobId}`}
                          className="flex-1 rounded-lg bg-red-500 py-2 text-center text-sm font-semibold text-white hover:bg-red-600"
                        >
                          View details
                        </Link>
                        <button
                          type="button"
                          onClick={() => setSelectedJob(null)}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>

    </div>
    </DashboardLayout>
  );
}
