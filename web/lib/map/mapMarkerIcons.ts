/** Pin markers shared by Google Maps and Leaflet — matches Flutter explore map pins. */

function pinSvg(fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path fill="#fff" d="M14 0C6.3 0 0 6.1 0 13.6c0 10.2 14 22.4 14 22.4S28 23.8 28 13.6C28 6.1 21.7 0 14 0z"/>
    <path fill="${fill}" d="M14 2C7.4 2 2 7.3 2 13.6c0 8.2 12 18.8 12 18.8S26 21.8 26 13.6C26 7.3 20.6 2 14 2z"/>
    <circle cx="14" cy="13" r="4" fill="#fff"/>
  </svg>`;
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const JOB_PIN_COLOR = "#2563eb";
export const SHOWCASE_PIN_COLOR = "#e11d48";
export const SELECTED_PIN_COLOR = "#F21A1A";
export const PROFILE_CENTER_PIN_COLOR = "#2563eb";

export function jobMarkerDataUrl(): string {
  return svgDataUrl(pinSvg(JOB_PIN_COLOR));
}

export function showcaseMarkerDataUrl(): string {
  return svgDataUrl(pinSvg(SHOWCASE_PIN_COLOR));
}

export function selectedMarkerDataUrl(): string {
  return svgDataUrl(pinSvg(SELECTED_PIN_COLOR));
}

export function profileCenterMarkerDataUrl(): string {
  return svgDataUrl(pinSvg(PROFILE_CENTER_PIN_COLOR));
}

export function googleJobMarkerIcon(): google.maps.Icon {
  return {
    url: jobMarkerDataUrl(),
    scaledSize: new google.maps.Size(28, 36),
    anchor: new google.maps.Point(14, 34),
  };
}

export function googleShowcaseMarkerIcon(): google.maps.Icon {
  return {
    url: showcaseMarkerDataUrl(),
    scaledSize: new google.maps.Size(28, 36),
    anchor: new google.maps.Point(14, 34),
  };
}

export function googleSelectedMarkerIcon(): google.maps.Icon {
  return {
    url: selectedMarkerDataUrl(),
    scaledSize: new google.maps.Size(28, 36),
    anchor: new google.maps.Point(14, 34),
  };
}

export function googleProfileCenterMarkerIcon(): google.maps.Icon {
  return {
    url: profileCenterMarkerDataUrl(),
    scaledSize: new google.maps.Size(28, 36),
    anchor: new google.maps.Point(14, 34),
  };
}

/** Leaflet `L.Icon` for colored pins (explore / pickers). */
export function createLeafletColoredPinIcon(L: typeof import("leaflet"), color: "blue" | "red"): InstanceType<typeof L.Icon> {
  const file =
    color === "blue"
      ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png"
      : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png";
  return new L.Icon({
    iconUrl: file,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}
