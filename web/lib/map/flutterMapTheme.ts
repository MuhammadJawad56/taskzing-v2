/** Day (roadmap/OSM) and satellite only — no night/dark mode. */
export type FlutterMapStyle = "default" | "satellite";

export function normalizeFlutterMapStyle(style: string): FlutterMapStyle {
  return style === "satellite" ? "satellite" : "default";
}

export const FLUTTER_MAP_COLORS = {
  controlIcon: "#F21A1A",
  userCircleStroke: "#E46B6B",
  userCircleFill: "#F7B8B8",
  radiusActiveBg: "#FAD1D6",
  radiusActiveText: "#E53E3E",
  radiusIdleBg: "#E5E7EB",
  radiusIdleText: "#1F2937",
  /** Showcase picker radius (Flutter): red ring + pink fill */
  profileRadiusStroke: "#E53E3E",
  profileRadiusFill: "#FAD1D6",
} as const;

export const FLUTTER_MAP_CONTROL_CLASS =
  "flex h-10 w-10 items-center justify-center rounded-[10px] bg-white shadow-md transition hover:bg-gray-50";

export const FLUTTER_MAP_CONTROL_SHADOW = "0 2px 8px rgba(0,0,0,0.2)";

export function cycleFlutterMapStyle(prev: FlutterMapStyle): FlutterMapStyle {
  const current = normalizeFlutterMapStyle(prev);
  return current === "default" ? "satellite" : "default";
}

export function leafletTileConfig(style: FlutterMapStyle): {
  url: string;
  attribution: string;
} {
  if (normalizeFlutterMapStyle(style) === "satellite") {
    return {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri",
    };
  }
  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  };
}

/** Google Maps options aligned with Flutter `custom_google_map.dart` (no default UI chrome). */
export function googleMapOptionsForStyle(style: FlutterMapStyle): google.maps.MapOptions {
  const satellite = normalizeFlutterMapStyle(style) === "satellite";
  return {
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    mapTypeId: satellite ? "satellite" : "roadmap",
    styles: undefined,
  };
}

export const userLocationCircleOptions = {
  strokeColor: FLUTTER_MAP_COLORS.userCircleStroke,
  strokeOpacity: 0.9,
  strokeWeight: 2,
  fillColor: FLUTTER_MAP_COLORS.userCircleFill,
  fillOpacity: 0.22,
} as const;
