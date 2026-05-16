const NOMINATIM_REVERSE =
  "https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=18&addressdetails=1";

const cache = new Map<string, string>();
const CACHE_MAX = 64;

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function formatNominatimAddress(data: {
  display_name?: string;
  address?: Record<string, string | undefined>;
}): string {
  const address = data.address;
  if (!address) return data.display_name || "Location found";

  const parts: string[] = [];
  if (address.house_number && address.road) {
    parts.push(`${address.house_number} ${address.road}`);
  } else if (address.road) {
    parts.push(address.road);
  }
  if (address.suburb || address.neighbourhood) {
    parts.push((address.suburb || address.neighbourhood)!);
  }
  if (address.city || address.town || address.village) {
    parts.push((address.city || address.town || address.village)!);
  }
  if (address.state || address.region) {
    parts.push((address.state || address.region)!);
  }
  if (address.country) parts.push(address.country);
  if (address.postcode) parts.push(address.postcode);

  return parts.length > 0 ? parts.join(", ") : data.display_name || "Location found";
}

/**
 * Reverse geocode with in-memory cache (rounded coords) to avoid slow repeat Nominatim calls.
 */
export async function reverseGeocodeLatLng(lat: number, lng: number): Promise<string> {
  const key = cacheKey(lat, lng);
  const hit = cache.get(key);
  if (hit) return hit;

  const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  try {
    const url = NOMINATIM_REVERSE.replace("{lat}", String(lat)).replace("{lng}", String(lng));
    const response = await fetch(url, {
      headers: { "User-Agent": "Taskzing-Website/1.0" },
    });
    if (!response.ok) throw new Error("reverse geocode failed");
    const data = await response.json();
    const formatted = formatNominatimAddress(data);
    if (cache.size >= CACHE_MAX) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    cache.set(key, formatted);
    return formatted;
  } catch {
    return fallback;
  }
}
