export type GeoPoint = {
  lat: number;
  lng: number;
  accuracy?: number;
};

export type UserLocationMode = "fast" | "balanced" | "precise";

export type GetUserLocationOptions = Partial<PositionOptions> & {
  /** fast = locate button (~1–3s); balanced = picker open; precise = best fix, capped wait */
  mode?: UserLocationMode;
};

type ModePreset = {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  targetAccuracyM: number;
  maxWaitMs: number;
  useWatch: boolean;
};

const MODE_PRESETS: Record<UserLocationMode, ModePreset> = {
  fast: {
    enableHighAccuracy: true,
    timeout: 7000,
    maximumAge: 60_000,
    targetAccuracyM: 200,
    maxWaitMs: 7000,
    useWatch: false,
  },
  balanced: {
    enableHighAccuracy: true,
    timeout: 10_000,
    maximumAge: 30_000,
    targetAccuracyM: 60,
    maxWaitMs: 10_000,
    useWatch: true,
  },
  precise: {
    enableHighAccuracy: true,
    timeout: 12_000,
    maximumAge: 10_000,
    targetAccuracyM: 35,
    maxWaitMs: 12_000,
    useWatch: true,
  },
};

function positionToPoint(position: GeolocationPosition): GeoPoint {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

function isBetterFix(next: GeoPoint, prev: GeoPoint | null): boolean {
  if (!prev) return true;
  const nextAcc = next.accuracy;
  const prevAcc = prev.accuracy;
  if (typeof nextAcc === "number" && typeof prevAcc === "number") return nextAcc < prevAcc;
  return prevAcc == null;
}

/**
 * Device location with mode-specific speed vs accuracy tradeoffs.
 * Prefer `mode: "fast"` for map locate buttons so the pin moves immediately.
 */
export function getUserLocation(options?: GetUserLocationOptions): Promise<GeoPoint> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new Error("Geolocation is not supported in this browser."));
  }

  const mode = options?.mode ?? "balanced";
  const preset = MODE_PRESETS[mode];
  const opts: PositionOptions = {
    enableHighAccuracy: options?.enableHighAccuracy ?? preset.enableHighAccuracy,
    timeout: options?.timeout ?? preset.timeout,
    maximumAge: options?.maximumAge ?? preset.maximumAge,
  };
  const maxWaitMs = options?.timeout ?? preset.maxWaitMs;
  const targetAccuracyM = preset.targetAccuracyM;

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
      const point = positionToPoint(position);
      if (isBetterFix(point, best)) best = point;

      const acc = position.coords.accuracy;
      if (mode === "fast") {
        finish(point);
        return;
      }
      if (typeof acc === "number" && acc <= targetAccuracyM) {
        finish(point);
      }
    };

    const timerId = window.setTimeout(() => {
      if (best) finish(best);
      else fail(new Error("Location request timed out. Try again or check location permissions."));
    }, maxWaitMs);

    navigator.geolocation.getCurrentPosition(
      consider,
      (err) => {
        if (best) finish(best);
        else if (!preset.useWatch) fail(err);
      },
      opts
    );

    if (preset.useWatch) {
      watchId = navigator.geolocation.watchPosition(
        consider,
        (err) => {
          if (best) finish(best);
          else fail(err);
        },
        opts
      );
    }
  });
}

/** @deprecated Prefer `getUserLocation({ mode: "fast" })` for locate buttons. */
export function getPreciseUserLocation(options?: Partial<PositionOptions>): Promise<GeoPoint> {
  return getUserLocation({ ...options, mode: "balanced" });
}
