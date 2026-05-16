/** Showcase location picker — matches Flutter profile-radius constraint (5 km). */
export const SHOWCASE_LOCATION_RADIUS_KM = 5;

export type MapLatLng = { lat: number; lng: number };

export function calculateDistanceKm(start: MapLatLng, end: MapLatLng): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(end.lat - start.lat);
  const dLng = toRad(end.lng - start.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(start.lat)) *
      Math.cos(toRad(end.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function isWithinShowcaseRadius(
  center: MapLatLng,
  point: MapLatLng,
  radiusKm: number = SHOWCASE_LOCATION_RADIUS_KM
): boolean {
  return calculateDistanceKm(center, point) <= radiusKm;
}

/** Flutter showcase picker: red border + light pink fill around profile center. */
export const SHOWCASE_PICKER_CIRCLE_GOOGLE: google.maps.CircleOptions = {
  strokeColor: "#E53E3E",
  strokeOpacity: 1,
  strokeWeight: 2,
  fillColor: "#FAD1D6",
  fillOpacity: 0.35,
};

export const SHOWCASE_PICKER_CIRCLE_LEAFLET = {
  color: "#E53E3E",
  fillColor: "#FAD1D6",
  fillOpacity: 0.35,
  weight: 2,
} as const;
