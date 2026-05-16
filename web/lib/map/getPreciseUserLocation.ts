export type GeoPoint = {
  lat: number;
  lng: number;
  accuracy?: number;
};

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0,
};

/** Good enough for pin placement (meters). */
const TARGET_ACCURACY_M = 35;

/**
 * Returns the most accurate device fix available, preferring GPS over cached/network estimates.
 * Uses a short watch session and keeps the best reading by `coords.accuracy`.
 */
export function getPreciseUserLocation(
  options?: Partial<PositionOptions>
): Promise<GeoPoint> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new Error("Geolocation is not supported in this browser."));
  }

  const opts: PositionOptions = { ...DEFAULT_OPTIONS, ...options };
  const timeoutMs = opts.timeout ?? DEFAULT_OPTIONS.timeout ?? 20000;

  return new Promise((resolve, reject) => {
    let best: GeoPoint | null = null;
    let settled = false;
    let watchId: number | null = null;

    const cleanup = () => {
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const finish = (point: GeoPoint) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timerId);
      cleanup();
      resolve(point);
    };

    const fail = (err: GeolocationPositionError | Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timerId);
      cleanup();
      if (best) {
        resolve(best);
        return;
      }
      reject(err);
    };

    const consider = (position: GeolocationPosition) => {
      const point: GeoPoint = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      const acc = position.coords.accuracy;
      if (
        !best ||
        (typeof acc === "number" &&
          typeof best.accuracy === "number" &&
          acc < best.accuracy) ||
        best.accuracy == null
      ) {
        best = point;
      }
      if (typeof acc === "number" && acc <= TARGET_ACCURACY_M) {
        finish(point);
      }
    };

    const timerId = window.setTimeout(() => {
      if (best) finish(best);
      else fail(new Error("Location request timed out. Try again outdoors or enable GPS."));
    }, timeoutMs);

    watchId = navigator.geolocation.watchPosition(
      consider,
      (err) => {
        if (best) finish(best);
        else fail(err);
      },
      opts
    );

    navigator.geolocation.getCurrentPosition(consider, () => {}, opts);
  });
}
