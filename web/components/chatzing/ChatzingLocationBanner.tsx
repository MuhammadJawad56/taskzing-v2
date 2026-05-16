"use client";

import React from "react";
import { MapPin, Loader2 } from "lucide-react";

type Props = {
  locale: "en" | "fr";
  status: "idle" | "loading" | "available" | "denied";
  locationConfirmed: boolean;
  onConfirm: () => void;
  onDeny: () => void;
  onRefresh: () => void;
};

export function ChatzingLocationBanner({
  locale,
  status,
  locationConfirmed,
  onConfirm,
  onDeny,
  onRefresh,
}: Props) {
  const isFr = locale === "fr";

  if (locationConfirmed) {
    return (
      <div className="mx-4 mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="flex-1">
          {isFr
            ? "Position partagée avec ChatZing pour les résultats locaux."
            : "Location shared with ChatZing for local results."}
        </span>
        <button type="button" onClick={onRefresh} className="font-semibold underline">
          {isFr ? "Actualiser" : "Refresh"}
        </button>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="mx-4 mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
        {isFr
          ? "Localisation indisponible. Indiquez une ville dans le chat ou activez la localisation du navigateur."
          : "Location unavailable. Type a city in chat or enable browser location."}
        <button type="button" onClick={onRefresh} className="ml-2 font-semibold underline">
          {isFr ? "Réessayer" : "Retry"}
        </button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="mx-4 mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-600 dark:bg-darkBlue-203/30 dark:text-gray-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {isFr ? "Détection de votre position…" : "Detecting your location…"}
      </div>
    );
  }

  if (status === "available") {
    return (
      <div className="mx-4 mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
        <p className="mb-2 leading-relaxed">
          {isFr
            ? "ChatZing peut utiliser votre position actuelle pour les emplois, vitrines et la demande locale — uniquement après votre accord."
            : "ChatZing can use your current location for nearby jobs, showcases, and local demand — only after you confirm."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-500 px-3 py-1.5 font-semibold text-white hover:bg-red-600"
          >
            {isFr ? "Utiliser ma position" : "Use my location"}
          </button>
          <button
            type="button"
            onClick={onDeny}
            className="rounded-lg border border-blue-300 px-3 py-1.5 font-medium dark:border-blue-600"
          >
            {isFr ? "Pas maintenant" : "Not now"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
