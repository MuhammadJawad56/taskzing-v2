"use client";

import { useEffect, useState } from "react";

/**
 * True when the browser reports network connectivity and this tab is visible.
 * Used for the signed-in user's own status dot (no Firestore write required).
 */
export function useBrowserOnline(): boolean {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const update = () => {
      if (typeof navigator === "undefined" || typeof document === "undefined") {
        setOnline(false);
        return;
      }
      setOnline(navigator.onLine && document.visibilityState === "visible");
    };

    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    document.addEventListener("visibilitychange", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return online;
}
