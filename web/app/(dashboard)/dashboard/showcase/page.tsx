"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, X, MapPin, Map as MapIcon, Plus, Trash2, FileText } from "lucide-react";
import { Circle, GoogleMap, Marker, useJsApiLoader, useGoogleMap } from "@react-google-maps/api";
import { taskzingGoogleMapsLoaderConfig } from "@/lib/map/googleMapsLoader";
import { FlutterMapControls } from "@/components/map/FlutterMapControls";
import { GoogleMapPanTo } from "@/components/map/GoogleMapPanTo";
import { LocationPickerFooter } from "@/components/map/LocationPickerFooter";
import { getUserLocation } from "@/lib/map/getPreciseUserLocation";
import { reverseGeocodeLatLng } from "@/lib/map/reverseGeocode";
import {
  cycleFlutterMapStyle,
  googleMapOptionsForStyle,
  leafletTileConfig,
  type FlutterMapStyle,
} from "@/lib/map/flutterMapTheme";
import { googleProfileCenterMarkerIcon } from "@/lib/map/mapMarkerIcons";
import {
  SHOWCASE_LOCATION_RADIUS_KM,
  SHOWCASE_PICKER_CIRCLE_GOOGLE,
  SHOWCASE_PICKER_CIRCLE_LEAFLET,
  isWithinShowcaseRadius,
} from "@/lib/map/showcaseLocationRadius";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/lib/api/AuthContext";
import { resolveProfileDisplayName, updateUserProfile } from "@/lib/api/auth";
import {
  createShowcaseItem,
  uploadShowcaseImages,
  getUserShowcases,
  deleteShowcaseItem,
  ShowcaseItem,
} from "@/lib/api/showcase";
import {
  deleteShowcaseDraft,
  listShowcaseDrafts,
  saveShowcaseDraft,
  type ShowcaseDraftDocument,
  type ShowcaseDraftFormSnapshot,
} from "@/lib/api/showcaseDrafts";
import { cn } from "@/lib/utils/cn";
import { GhostOverlay } from "@/components/ui/GhostOverlay";
import { acceptGhostOnTab, acceptGhostOnTouchTap } from "@/lib/utils/ghostInputHandlers";
import { findGhostSuggestion } from "@/lib/utils/ghostSuggestion";
import {
  JOB_EXTRA_WORD_SUGGESTIONS,
  JOB_EXTRA_WORD_SUGGESTIONS_FRENCH,
} from "@/lib/constants/jobFieldSuggestions";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { showDraftSavedSnackbar } from "@/lib/draftSavedEvents";
import {
  chatzingDraftToShowcaseFormSnapshot,
  consumeChatzingPendingDraft,
  dataUrlsToFiles,
} from "@/lib/chatzing/contentDraft";

const SHOWCASE_TITLE_SUGGESTIONS = [
  "Modern Website Redesign",
  "Brand Identity Package",
  "E-commerce Store Setup",
  "Mobile App UI Design",
  "Kitchen Renovation Project",
  "Bathroom Remodeling Work",
  "Professional House Painting",
  "Custom Furniture Build",
  "Office Deep Cleaning Service",
  "Landscape and Garden Makeover",
];

const SHOWCASE_SKILL_SUGGESTIONS = [
  "Web Development",
  "Graphic Design",
  "UI/UX Design",
  "Video Editing",
  "Photography",
  "Interior Design",
  "Home Renovation",
  "Plumbing",
  "Electrical Repair",
  "Carpentry",
  "Deep Cleaning",
  "Digital Marketing",
];

const SHOWCASE_DESCRIPTION_SUGGESTIONS = [
  "I completed this project for a client and delivered it on time with full quality checks.",
  "This work focused on clean execution, attention to detail, and strong client communication.",
  "I handled planning, execution, and final delivery while keeping the client updated at each milestone.",
  "The final result improved usability, visual quality, and overall customer satisfaction.",
];

const SHOWCASE_LOCATION_SUGGESTIONS = [
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "London, UK",
  "Dubai, UAE",
  "Mumbai, Maharashtra",
  "Bengaluru, Karnataka",
  "Toronto, Canada",
  "Sydney, Australia",
];

const SHOWCASE_COMPANY_SUGGESTIONS = [
  "Brightline Solutions",
  "UrbanCraft Studio",
  "NovaEdge Technologies",
  "BluePeak Services",
  "PrimeNest Interiors",
];

const SHOWCASE_STORE_SUGGESTIONS = [
  "Downtown Service Hub",
  "City Center Workshop",
  "Main Street Studio",
  "Northside Repair Store",
  "Sunrise Design Store",
];

const DEFAULT_LOCATION_CENTER = { lat: 31.5204, lng: 74.3587 };

const DELETE_DRAFT_MODAL_RED = "#E53E3E";

/** Lat/lng bounds that fully contain a circle of `radiusKm` around `center` (WGS84 approximation). */
function approximateKmRadiusBounds(center: { lat: number; lng: number }, radiusKm: number) {
  const latRad = (center.lat * Math.PI) / 180;
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / Math.max(0.05, Math.abs(111.32 * Math.cos(latRad)));
  return {
    south: center.lat - latDelta,
    north: center.lat + latDelta,
    west: center.lng - lngDelta,
    east: center.lng + lngDelta,
  };
}

/** Fit viewport so profile radius circle is fully visible (Google Maps picker). Must render inside <GoogleMap>. */
function ShowcaseLocationRadiusGoogleFit({
  profileCenter,
  radiusKm,
}: {
  profileCenter: { lat: number; lng: number };
  radiusKm: number;
}) {
  const map = useGoogleMap();

  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    const { south, north, west, east } = approximateKmRadiusBounds(profileCenter, radiusKm);
    const bounds = new google.maps.LatLngBounds(
      { lat: south, lng: west },
      { lat: north, lng: east },
    );

    let cancelled = false;

    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled || !map) return;
        google.maps.event.addListenerOnce(map, "idle", () => {
          if (cancelled) return;
          map.fitBounds(bounds, { top: 48, bottom: 120, left: 56, right: 56 });
        });
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, [map, profileCenter.lat, profileCenter.lng, radiusKm]);

  return null;
}

export default function ShowcasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData } = useAuth();
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [profileLocationCenter, setProfileLocationCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMapPoint, setSelectedMapPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMapAddress, setSelectedMapAddress] = useState("");
  const [isResolvingMapAddress, setIsResolvingMapAddress] = useState(false);
  const [isLocatingOnMap, setIsLocatingOnMap] = useState(false);
  const [mapPanTarget, setMapPanTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [pickerMapStyle, setPickerMapStyle] = useState<FlutterMapStyle>("default");
  const [confirmedMapCoords, setConfirmedMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLeafletMapReady, setIsLeafletMapReady] = useState(false);
  const [leafletBlueIcon, setLeafletBlueIcon] = useState<any>(null);
  const leafletLibRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletTileLayerRef = useRef<any>(null);
  const leafletCenterMarkerRef = useRef<any>(null);
  const leafletSelectedMarkerRef = useRef<any>(null);
  const leafletCircleRef = useRef<any>(null);
  const leafletContainerRef = useRef<HTMLDivElement | null>(null);
  const selectMapPointRef = useRef<(point: { lat: number; lng: number }) => boolean>(() => false);
  const [pickerMarkerSnapKey, setPickerMarkerSnapKey] = useState(0);
  const [showOutOfRangeModal, setShowOutOfRangeModal] = useState(false);
  const [showUpdateCenterModal, setShowUpdateCenterModal] = useState(false);
  const [isUpdatingProfileLocation, setIsUpdatingProfileLocation] = useState(false);
  const [showcases, setShowcases] = useState<ShowcaseItem[]>([]);
  const [drafts, setDrafts] = useState<ShowcaseDraftDocument[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [isDraftValidationModalOpen, setIsDraftValidationModalOpen] = useState(false);
  const [isSaveDraftModalOpen, setIsSaveDraftModalOpen] = useState(false);
  /** Flutter-style "Delete this draft?" sheet (replaces native `confirm`). */
  const [draftDeleteConfirmId, setDraftDeleteConfirmId] = useState<string | null>(null);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [postingAs, setPostingAs] = useState<"individual" | "company" | "instore">("individual");
  const [formData, setFormData] = useState({
    companyName: "",
    storeName: "",
    title: "",
    skillInput: "",
    skillTags: [] as string[],
    description: "",
    location: "",
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<{
    companyName?: string;
    storeName?: string;
    title?: string;
    description?: string;
    location?: string;
    images?: string;
  }>({});
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const {
    isLoaded: isLocationMapLoaded,
    loadError: locationMapLoadError,
  } = useJsApiLoader(taskzingGoogleMapsLoaderConfig(googleMapsApiKey));

  const hasTypedSomethingInShowcaseForm = useMemo(() => {
    const ne = (s: string) => s.trim().length > 0;
    const fd = formData;
    return (
      ne(fd.title) ||
      fd.skillTags.length > 0 ||
      ne(fd.skillInput) ||
      ne(fd.description) ||
      ne(fd.location) ||
      ne(fd.companyName) ||
      ne(fd.storeName)
    );
  }, [formData]);

  const userName = resolveProfileDisplayName(user, userData);
  const userInitial = userName.charAt(0).toUpperCase();

  const radiusCenter = profileLocationCenter ?? DEFAULT_LOCATION_CENTER;

  /** Single blue pin — movable only inside the red radius circle (Flutter). */
  const showcasePickerPinPosition = useMemo(
    () => selectedMapPoint ?? profileLocationCenter ?? DEFAULT_LOCATION_CENTER,
    [selectedMapPoint, profileLocationCenter]
  );

  const lastValidPickerPointRef = useRef(showcasePickerPinPosition);

  const selectionWithinRadius = useMemo(() => {
    if (!selectedMapPoint) return false;
    return isWithinShowcaseRadius(radiusCenter, selectedMapPoint);
  }, [radiusCenter, selectedMapPoint]);

  // Load user's showcases
  useEffect(() => {
    if (user?.uid) {
      loadShowcases();
    }
  }, [user]);

  useEffect(() => {
    let alive = true;
    const initProfileCenter = async () => {
      if (profileLocationCenter) return;
      if (userData?.location?.trim()) {
        const coords = await geocodeAddress(userData.location.trim());
        if (alive && coords) {
          setProfileLocationCenter(coords);
          return;
        }
      }
      if (!navigator.geolocation) {
        if (alive) setProfileLocationCenter(DEFAULT_LOCATION_CENTER);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!alive) return;
          setProfileLocationCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          if (!alive) return;
          setProfileLocationCenter(DEFAULT_LOCATION_CENTER);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };
    void initProfileCenter();
    return () => {
      alive = false;
    };
  }, [userData?.location, profileLocationCenter]);

  useEffect(() => {
    if (!isLocationPickerOpen) return;
    if (googleMapsApiKey) return;
    let alive = true;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);

    const setupLeaflet = async () => {
      const L = await import("leaflet");
      leafletLibRef.current = L;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const blueIcon = new L.Icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      if (alive) {
        setLeafletBlueIcon(blueIcon);
      }
      if (alive) setIsLeafletMapReady(true);
    };
    void setupLeaflet();

    return () => {
      alive = false;
      setIsLeafletMapReady(false);
      setLeafletBlueIcon(null);
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, [isLocationPickerOpen, googleMapsApiKey]);

  useEffect(() => {
    if (!isLocationPickerOpen || !!googleMapsApiKey || !isLeafletMapReady) return;
    const L = leafletLibRef.current;
    const container = leafletContainerRef.current;
    if (!L || !container) return;

    let mapWasJustCreated = false;

    if (!leafletMapRef.current) {
      mapWasJustCreated = true;
      // Defensive reset for dev/HMR where container can retain prior id.
      if ((container as any)._leaflet_id) {
        try {
          delete (container as any)._leaflet_id;
        } catch {
          (container as any)._leaflet_id = undefined;
        }
      }

      const start = selectedMapPoint ?? profileLocationCenter ?? DEFAULT_LOCATION_CENTER;
      const map = L.map(container, { zoomControl: true, attributionControl: false }).setView([start.lat, start.lng], 12);
      const tiles = leafletTileConfig(pickerMapStyle);
      leafletTileLayerRef.current = L.tileLayer(tiles.url, {
        attribution: tiles.attribution,
      }).addTo(map);
      map.on("click", (event: any) => {
        const point = { lat: event.latlng.lat, lng: event.latlng.lng };
        selectMapPointRef.current(point);
      });
      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;
    const center = selectedMapPoint ?? profileLocationCenter ?? DEFAULT_LOCATION_CENTER;

    if (leafletCircleRef.current) {
      leafletCircleRef.current.remove();
      leafletCircleRef.current = null;
    }
    if (profileLocationCenter) {
      leafletCircleRef.current = L.circle(
        [profileLocationCenter.lat, profileLocationCenter.lng],
        {
          radius: SHOWCASE_LOCATION_RADIUS_KM * 1000,
          ...SHOWCASE_PICKER_CIRCLE_LEAFLET,
        }
      ).addTo(map);
    }

    if (leafletCenterMarkerRef.current) {
      leafletCenterMarkerRef.current.remove();
      leafletCenterMarkerRef.current = null;
    }

    const pin = showcasePickerPinPosition;
    if (leafletSelectedMarkerRef.current) {
      leafletSelectedMarkerRef.current.setLatLng([pin.lat, pin.lng]);
      if (leafletBlueIcon) {
        leafletSelectedMarkerRef.current.setIcon(leafletBlueIcon);
      }
    } else {
      const selectionMarker = L.marker([pin.lat, pin.lng], {
        draggable: true,
        icon: leafletBlueIcon ?? undefined,
      }).addTo(map);
      selectionMarker.on("dragend", (event: import("leaflet").LeafletEvent) => {
        const marker = event.target as import("leaflet").Marker;
        const { lat, lng } = marker.getLatLng();
        const ok = selectMapPointRef.current({ lat, lng });
        if (!ok) {
          const valid = lastValidPickerPointRef.current;
          marker.setLatLng([valid.lat, valid.lng]);
        }
      });
      leafletSelectedMarkerRef.current = selectionMarker;
    }

    /** On open / new map instance, zoom so entire radius circle stays in view (Leaflet/OSM path). */
    if (profileLocationCenter && leafletCircleRef.current && mapWasJustCreated) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          map.invalidateSize();
          const circleLayer = leafletCircleRef.current;
          if (!circleLayer) return;
          map.fitBounds(circleLayer.getBounds(), {
            paddingTopLeft: L.point(20, 56),
            paddingBottomRight: L.point(56, 120),
            maxZoom: 15,
            animate: false,
          });
        });
      });
    } else {
      map.setView([center.lat, center.lng], map.getZoom() ?? 12);
    }
  }, [
    isLocationPickerOpen,
    googleMapsApiKey,
    isLeafletMapReady,
    profileLocationCenter,
    selectedMapPoint,
    leafletBlueIcon,
    showcasePickerPinPosition,
    pickerMapStyle,
  ]);

  useEffect(() => {
    if (!isLocationPickerOpen || googleMapsApiKey || !leafletTileLayerRef.current) return;
    const tiles = leafletTileConfig(pickerMapStyle);
    leafletTileLayerRef.current.setUrl(tiles.url);
  }, [pickerMapStyle, isLocationPickerOpen, googleMapsApiKey]);

  useEffect(() => {
    if (isLocationPickerOpen || !!googleMapsApiKey) return;
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    leafletTileLayerRef.current = null;
    leafletCenterMarkerRef.current = null;
    leafletSelectedMarkerRef.current = null;
    leafletCircleRef.current = null;
  }, [isLocationPickerOpen, googleMapsApiKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLocationPickerOpen) {
      document.body.classList.add("taskzing-hide-dashboard-chrome");
    } else {
      document.body.classList.remove("taskzing-hide-dashboard-chrome");
    }
    window.dispatchEvent(new Event("taskzing:toggle-dashboard-chrome"));
    return () => {
      document.body.classList.remove("taskzing-hide-dashboard-chrome");
      window.dispatchEvent(new Event("taskzing:toggle-dashboard-chrome"));
    };
  }, [isLocationPickerOpen]);

  useEffect(() => {
    if (!showDraftsModal || !user?.uid) return;
    let alive = true;
    setDraftsLoading(true);
    void listShowcaseDrafts(user.uid)
      .then((rows) => {
        if (alive) setDrafts(rows);
      })
      .catch((err) => {
        console.error("Failed to load showcase drafts:", err);
        if (alive) setDrafts([]);
      })
      .finally(() => {
        if (alive) setDraftsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [showDraftsModal, user?.uid]);

  useEffect(() => {
    if (searchParams.get("from") !== "chatzing" || !user?.uid) return;
    const draft = consumeChatzingPendingDraft();
    if (!draft || draft.kind !== "showcase") return;

    const snapshot = chatzingDraftToShowcaseFormSnapshot(draft);
    setPostingAs(snapshot.postingAs);
    const skillTags = (snapshot.skills ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setFormData({
      companyName: snapshot.companyName,
      storeName: snapshot.storeName,
      title: snapshot.title,
      skillInput: "",
      skillTags: skillTags.length ? skillTags : draft.skills ?? [],
      description: snapshot.description,
      location: snapshot.location,
    });
    setEditingDraftId(null);

    if (draft.imageDataUrls.length > 0) {
      void dataUrlsToFiles(draft.imageDataUrls.slice(0, 5)).then((files) => {
        if (!files.length) return;
        imagePreviews.forEach((url) => {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        });
        setSelectedImages(files);
        setImagePreviews(files.map((f) => URL.createObjectURL(f)));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply once when opened from ChatZing
  }, [searchParams, user?.uid]);

  const loadShowcases = async () => {
    if (!user?.uid) return;
    try {
      setIsLoading(true);
      const userShowcases = await getUserShowcases(user.uid);
      setShowcases(userShowcases);
    } catch (error) {
      console.error("Error loading showcases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (selectedImages.length + files.length > 5) {
      setErrors({ ...errors, images: "Maximum 5 photos allowed" });
      return;
    }

    const newImages = [...selectedImages, ...files.slice(0, 5 - selectedImages.length)];
    setSelectedImages(newImages);
    setErrors({ ...errors, images: undefined });

    // Create previews
    const newPreviews = newImages.map((file) => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // Revoke object URLs
    URL.revokeObjectURL(imagePreviews[index]);
    
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
    setErrors({ ...errors, images: undefined });
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            "User-Agent": "Taskzing-Website/1.0",
          },
        }
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    } catch {
      return null;
    }
  };

  const resolveMapPointAddress = useCallback(async (point: { lat: number; lng: number }) => {
    setIsResolvingMapAddress(true);
    try {
      const address = await reverseGeocodeLatLng(point.lat, point.lng);
      setSelectedMapAddress(address);
      return address;
    } finally {
      setIsResolvingMapAddress(false);
    }
  }, []);

  /** Flutter parity: only accept taps/GPS inside profile radius; otherwise show out-of-range sheet. */
  const trySelectMapPoint = useCallback(
    (point: { lat: number; lng: number }) => {
      const center = profileLocationCenter ?? DEFAULT_LOCATION_CENTER;
      if (!isWithinShowcaseRadius(center, point)) {
        setShowOutOfRangeModal(true);
        return false;
      }
      setShowOutOfRangeModal(false);
      setSelectedMapPoint(point);
      lastValidPickerPointRef.current = point;
      setMapPanTarget(point);
      if (leafletMapRef.current) {
        leafletMapRef.current.setView(
          [point.lat, point.lng],
          Math.max(leafletMapRef.current.getZoom() ?? 14, 15),
          { animate: true }
        );
      }
      void resolveMapPointAddress(point);
      return true;
    },
    [profileLocationCenter, resolveMapPointAddress]
  );

  useEffect(() => {
    selectMapPointRef.current = trySelectMapPoint;
  }, [trySelectMapPoint]);

  const handleLocateOnMap = async () => {
    if (isLocatingOnMap) return;
    setIsLocatingOnMap(true);
    try {
      const point = await getUserLocation({ mode: "fast" });
      trySelectMapPoint(point);
    } catch {
      window.alert(
        "Unable to read your location. Allow location access in your browser and try again."
      );
    } finally {
      setIsLocatingOnMap(false);
    }
  };

  const openLocationPicker = () => {
    setIsLocationPickerOpen(true);
    setErrors((prev) => ({ ...prev, location: undefined }));
    setShowOutOfRangeModal(false);
    setShowUpdateCenterModal(false);

    const center = profileLocationCenter ?? DEFAULT_LOCATION_CENTER;
    const initial = selectedMapPoint ?? center;
    trySelectMapPoint(initial);

    setIsFetchingLocation(true);
    void (async () => {
      try {
        const gps = await getUserLocation({ mode: "balanced", timeout: 8000 });
        if (isWithinShowcaseRadius(center, gps)) {
          trySelectMapPoint(gps);
        } else {
          setShowOutOfRangeModal(true);
        }
      } catch {
        // Keep profile/default center when GPS is denied or slow.
      } finally {
        setIsFetchingLocation(false);
      }
    })();
  };

  const handleUsePickedLocation = async () => {
    if (!selectedMapPoint) return;
    const center = profileLocationCenter ?? DEFAULT_LOCATION_CENTER;
    if (!isWithinShowcaseRadius(center, selectedMapPoint)) {
      setShowOutOfRangeModal(true);
      return;
    }
    const address = selectedMapAddress || (await resolveMapPointAddress(selectedMapPoint));
    setConfirmedMapCoords(selectedMapPoint);
    setFormData((prev) => ({ ...prev, location: address }));
    setErrors((prev) => ({ ...prev, location: undefined }));
    setIsLocationPickerOpen(false);
  };

  const handleUpdateCenterLocation = async () => {
    if (!selectedMapPoint || !user?.uid) return;
    setIsUpdatingProfileLocation(true);
    try {
      const address = selectedMapAddress || (await resolveMapPointAddress(selectedMapPoint));
      await updateUserProfile(user.uid, { location: address });
      setProfileLocationCenter(selectedMapPoint);
      setFormData((prev) => ({ ...prev, location: address }));
      setErrors((prev) => ({ ...prev, location: undefined }));
      setShowUpdateCenterModal(false);
      setShowOutOfRangeModal(false);
      setIsLocationPickerOpen(false);
    } catch (error) {
      console.error("Failed to update profile location:", error);
      alert("Failed to update profile location. Please try again.");
    } finally {
      setIsUpdatingProfileLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasTypedSomethingInShowcaseForm) return;

    // Validation
    const newErrors: typeof errors = {};
    if (postingAs === "company" && !formData.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }
    if (postingAs === "instore" && !formData.storeName.trim()) {
      newErrors.storeName = "Store name is required";
    }
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.trim().length < 50) {
      newErrors.description = "Description must be at least 50 characters";
    }
    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }
    if (selectedImages.length < 3) {
      newErrors.images = "At least 3 photos are required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!user?.uid) {
      alert("Please log in to create a showcase");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Upload images to Firebase Storage
      const imageUrls = await uploadShowcaseImages(selectedImages, user.uid);

      const skills = formData.skillTags;

      const skillsField =
        skills.length > 0 ? skills.join(", ") : formData.skillInput.trim() || undefined;

      // Create showcase item in Firestore
      await createShowcaseItem(user.uid, {
        postingAs,
        companyName: postingAs === "company" ? formData.companyName.trim() : undefined,
        storeName: postingAs === "instore" ? formData.storeName.trim() : undefined,
        title: formData.title.trim(),
        skills: skillsField,
        description: formData.description.trim(),
        location: formData.location.trim(),
        ...(confirmedMapCoords
          ? { lat: confirmedMapCoords.lat, lng: confirmedMapCoords.lng }
          : selectedMapPoint
            ? { lat: selectedMapPoint.lat, lng: selectedMapPoint.lng }
            : {}),
        imageUrls,
        tags: skills.length > 0 ? skills : formData.skillInput.trim() ? [formData.skillInput.trim()] : [],
      });

      if (editingDraftId) {
        try {
          await deleteShowcaseDraft(user.uid, editingDraftId);
        } catch (delErr) {
          console.warn("Could not remove showcase draft after submit:", delErr);
        }
        setEditingDraftId(null);
      }

      // Reset form
      setFormData({
        companyName: "",
        storeName: "",
        title: "",
        skillInput: "",
        skillTags: [],
        description: "",
        location: "",
      });
      setSelectedImages([]);
      setImagePreviews([]);
      setConfirmedMapCoords(null);
      setSelectedMapPoint(null);
      setPostingAs("individual");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Reload showcases
      await loadShowcases();

      alert("Showcase item added successfully!");
    } catch (error: any) {
      console.error("Error creating showcase:", error);
      alert(error.message || "Failed to create showcase item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildDraftSnapshot = (): ShowcaseDraftFormSnapshot => ({
    postingAs,
    companyName: formData.companyName,
    storeName: formData.storeName,
    title: formData.title,
    skills:
      formData.skillTags.length > 0
        ? formData.skillTags.join(", ")
        : formData.skillInput.trim(),
    description: formData.description,
    location: formData.location,
  });

  const hasAnyDraftTextContent = () => {
    if (formData.skillTags.length > 0) return true;
    const textFields = [
      formData.companyName,
      formData.storeName,
      formData.title,
      formData.skillInput,
      formData.description,
      formData.location,
    ];
    return textFields.some((value) => value.trim().length > 0);
  };

  const applyDraftToForm = (draft: ShowcaseDraftDocument) => {
    setPostingAs(draft.form.postingAs);
    const rawSkills = draft.form.skills ?? "";
    const skillTags = rawSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setFormData({
      companyName: draft.form.companyName,
      storeName: draft.form.storeName,
      title: draft.form.title,
      skillInput: "",
      skillTags,
      description: draft.form.description,
      location: draft.form.location,
    });
    setEditingDraftId(draft.id);
    setShowDraftsModal(false);
  };

  const handleSaveDraft = async () => {
    if (!user?.uid) {
      alert("Please sign in to save a draft.");
      return;
    }
    if (!hasAnyDraftTextContent()) {
      setIsDraftValidationModalOpen(true);
      return;
    }
    setIsSavingDraft(true);
    try {
      const wasExisting = editingDraftId != null;
      const id = await saveShowcaseDraft(user.uid, buildDraftSnapshot(), editingDraftId);
      setEditingDraftId(id);
      if (showDraftsModal) {
        const rows = await listShowcaseDrafts(user.uid);
        setDrafts(rows);
      }
      showDraftSavedSnackbar(wasExisting ? "Draft updated." : "Post saved to draft");
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not save draft. Try again.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleCancelClick = () => {
    if (hasAnyDraftTextContent()) {
      setIsSaveDraftModalOpen(true);
      return;
    }
    router.back();
  };

  const handleDiscardAndExit = () => {
    setIsSaveDraftModalOpen(false);
    router.back();
  };

  const handleSaveDraftAndExit = async () => {
    await handleSaveDraft();
    setIsSaveDraftModalOpen(false);
    router.back();
  };

  const confirmDeleteShowcaseDraft = async () => {
    if (!user?.uid || !draftDeleteConfirmId) return;
    setIsDeletingDraft(true);
    try {
      await deleteShowcaseDraft(user.uid, draftDeleteConfirmId);
      const removedId = draftDeleteConfirmId;
      setDrafts((prev) => prev.filter((d) => d.id !== removedId));
      if (editingDraftId === removedId) {
        setEditingDraftId(null);
      }
      setDraftDeleteConfirmId(null);
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not delete draft.");
    } finally {
      setIsDeletingDraft(false);
    }
  };

  const handleDelete = async (id: string, imageUrls: string[], videoUrl?: string) => {
    if (!confirm("Are you sure you want to delete this showcase item?")) {
      return;
    }
    if (!user?.uid) {
      alert("Please log in to delete a showcase item.");
      return;
    }

    try {
      await deleteShowcaseItem(id, imageUrls, videoUrl, user.uid);
      await loadShowcases();
      alert("Showcase item deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting showcase:", error);
      alert(error.message || "Failed to delete showcase item. Please try again.");
    }
  };

  const ghostExtraWords = useMemo(
    () =>
      language === "french"
        ? [...JOB_EXTRA_WORD_SUGGESTIONS, ...JOB_EXTRA_WORD_SUGGESTIONS_FRENCH]
        : [...JOB_EXTRA_WORD_SUGGESTIONS],
    [language]
  );

  const titleGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.title,
        [...SHOWCASE_TITLE_SUGGESTIONS, ...ghostExtraWords],
        "full"
      ),
    [formData.title, ghostExtraWords]
  );

  const skillsGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.skillInput,
        [...SHOWCASE_SKILL_SUGGESTIONS, ...ghostExtraWords],
        "lastSegment"
      ),
    [formData.skillInput, ghostExtraWords]
  );

  const addShowcaseSkill = () => {
    const t = formData.skillInput.trim();
    if (!t || formData.skillTags.includes(t)) return;
    setFormData((prev) => ({
      ...prev,
      skillTags: [...prev.skillTags, t],
      skillInput: "",
    }));
  };

  const removeShowcaseSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skillTags: prev.skillTags.filter((s) => s !== skill),
    }));
  };

  const descriptionGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.description,
        [...SHOWCASE_DESCRIPTION_SUGGESTIONS, ...ghostExtraWords],
        "lastSegment"
      ),
    [formData.description, ghostExtraWords]
  );

  const locationGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.location,
        [...SHOWCASE_LOCATION_SUGGESTIONS, ...ghostExtraWords],
        "full"
      ),
    [formData.location, ghostExtraWords]
  );

  const companyGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.companyName,
        [...SHOWCASE_COMPANY_SUGGESTIONS, ...ghostExtraWords],
        "full"
      ),
    [formData.companyName, ghostExtraWords]
  );

  const storeGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.storeName,
        [...SHOWCASE_STORE_SUGGESTIONS, ...ghostExtraWords],
        "full"
      ),
    [formData.storeName, ghostExtraWords]
  );

  const descriptionLength = formData.description.length;
  const minChars = 50;
  const maxChars = 1500;
  const sectionBlockClasses =
    "rounded-2xl border border-gray-200 bg-white/90 p-3 sm:p-4 dark:border-transparent dark:bg-[#013453]";

  return (
    <div className="min-h-screen bg-gray-50 pb-28 dark:bg-[#003D62] lg:pb-10">
      <div className="mx-auto max-w-[67rem] px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
        {/* Form */}
        <Card className="border-0 bg-[#F9FAFB] shadow-none dark:bg-[#003D62]">
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {/* LEFT COLUMN: all text fields */}
                <div className="space-y-4">
                  <div className={cn(sectionBlockClasses, "space-y-4")}>
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">Showcase Work</h1>
                      <p className="mt-2 text-sm text-gray-600 dark:text-white/70">
                        Share your best work so clients can quickly understand your expertise.
                      </p>
                    </div>

                    <div className="flex flex-row items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white sm:h-10 sm:w-10 sm:text-base">
                          {userInitial}
                        </div>
                        <span className="truncate text-sm font-medium text-gray-900 dark:text-white sm:text-base">
                          {userName}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => setShowDraftsModal(true)}
                        className="h-[34px] shrink-0 rounded-[20px] border-none bg-[#E7E9EE] px-5 text-[12px] font-medium text-[#343B8C] shadow-[0_4px_4px_rgba(0,0,0,0.25)] hover:bg-[#dfe3ea] dark:bg-darkBlue-343 dark:text-white dark:hover:bg-darkBlue-203 md:h-[40px] md:px-6 md:text-sm"
                      >
                        Drafts
                      </Button>
                    </div>

                    <label className="block text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">
                      Posting As
                    </label>
                    <div className="flex gap-1.5 sm:gap-2 md:gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPostingAs("individual");
                          setFormData({ ...formData, companyName: "", storeName: "" });
                          setErrors({ ...errors, companyName: undefined, storeName: undefined });
                        }}
                        className={cn(
                          "flex-1 px-2.5 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 rounded-full font-medium transition-colors text-xs sm:text-sm md:text-base",
                          postingAs === "individual"
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "border border-transparent bg-[#D9D9D9] text-[#343B8C] hover:bg-[#cfcfcf] dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343"
                        )}
                      >
                        Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPostingAs("company");
                          setFormData({ ...formData, storeName: "" });
                          setErrors({ ...errors, companyName: undefined, storeName: undefined });
                        }}
                        className={cn(
                          "flex-1 px-2.5 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 rounded-full font-medium transition-colors text-xs sm:text-sm md:text-base",
                          postingAs === "company"
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "border border-transparent bg-[#D9D9D9] text-[#343B8C] hover:bg-[#cfcfcf] dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343"
                        )}
                      >
                        Company
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPostingAs("instore");
                          setFormData({ ...formData, companyName: "" });
                          setErrors({ ...errors, companyName: undefined, storeName: undefined });
                        }}
                        className={cn(
                          "flex-1 px-2.5 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 rounded-full font-medium transition-colors text-xs sm:text-sm md:text-base",
                          postingAs === "instore"
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "border border-transparent bg-[#D9D9D9] text-[#343B8C] hover:bg-[#cfcfcf] dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343"
                        )}
                      >
                        In Store
                      </button>
                    </div>
                    {postingAs === "company" && (
                      <div className="w-full">
                        <label className="mb-1 block text-sm font-medium text-theme-primaryText dark:text-white">
                          Company Name <span className="ml-1 text-accent-error">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.companyName}
                            onChange={(e) => {
                              setFormData({ ...formData, companyName: e.target.value });
                              setErrors({ ...errors, companyName: undefined });
                            }}
                            onKeyDown={(e) =>
                              acceptGhostOnTab(e, companyGhost, (full) =>
                                setFormData({ ...formData, companyName: full })
                              )
                            }
                            onPointerDown={(e) =>
                              acceptGhostOnTouchTap(e, companyGhost, (full) =>
                                setFormData({ ...formData, companyName: full })
                              )
                            }
                            placeholder="Enter company name"
                            required
                            className={cn(
                              "flex h-10 w-full rounded-lg border border-theme-accent2 bg-theme-primaryBackground px-3 py-2 text-sm text-theme-primaryText",
                              "placeholder:text-theme-accent4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                              "dark:border-gray-600 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white",
                              errors.companyName && "border-accent-error focus-visible:ring-accent-error"
                            )}
                          />
                          <GhostOverlay
                            value={formData.companyName}
                            tail={companyGhost?.tail ?? ""}
                            paddingClassName="px-3 py-2"
                            radiusClassName="rounded-lg"
                            className="text-sm"
                          />
                        </div>
                        {errors.companyName ? (
                          <p className="mt-1 text-sm text-accent-error">{errors.companyName}</p>
                        ) : null}
                      </div>
                    )}

                    {postingAs === "instore" && (
                      <div className="w-full">
                        <label className="mb-1 block text-sm font-medium text-theme-primaryText dark:text-white">
                          Store Name <span className="ml-1 text-accent-error">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.storeName}
                            onChange={(e) => {
                              setFormData({ ...formData, storeName: e.target.value });
                              setErrors({ ...errors, storeName: undefined });
                            }}
                            onKeyDown={(e) =>
                              acceptGhostOnTab(e, storeGhost, (full) =>
                                setFormData({ ...formData, storeName: full })
                              )
                            }
                            onPointerDown={(e) =>
                              acceptGhostOnTouchTap(e, storeGhost, (full) =>
                                setFormData({ ...formData, storeName: full })
                              )
                            }
                            placeholder="Enter store name"
                            required
                            className={cn(
                              "flex h-10 w-full rounded-lg border border-theme-accent2 bg-theme-primaryBackground px-3 py-2 text-sm text-theme-primaryText",
                              "placeholder:text-theme-accent4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                              "dark:border-gray-600 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white",
                              errors.storeName && "border-accent-error focus-visible:ring-accent-error"
                            )}
                          />
                          <GhostOverlay
                            value={formData.storeName}
                            tail={storeGhost?.tail ?? ""}
                            paddingClassName="px-3 py-2"
                            radiusClassName="rounded-lg"
                            className="text-sm"
                          />
                        </div>
                        {errors.storeName ? (
                          <p className="mt-1 text-sm text-accent-error">{errors.storeName}</p>
                        ) : null}
                      </div>
                    )}

                    <div className="w-full">
                      <label className="mb-1 block text-sm font-medium text-theme-primaryText dark:text-white">
                        Title <span className="ml-1 text-accent-error">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => {
                            setFormData({ ...formData, title: e.target.value });
                            setErrors({ ...errors, title: undefined });
                          }}
                          onKeyDown={(e) =>
                            acceptGhostOnTab(e, titleGhost, (full) => {
                              setFormData({ ...formData, title: full });
                              setErrors({ ...errors, title: undefined });
                            })
                          }
                          onPointerDown={(e) =>
                            acceptGhostOnTouchTap(e, titleGhost, (full) => {
                              setFormData({ ...formData, title: full });
                              setErrors({ ...errors, title: undefined });
                            })
                          }
                          placeholder="Enter your work title"
                          required
                          className={cn(
                            "flex h-10 w-full rounded-lg border border-theme-accent2 bg-theme-primaryBackground px-3 py-2 text-sm text-theme-primaryText",
                            "placeholder:text-theme-accent4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                            "dark:border-gray-600 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white",
                            errors.title && "border-accent-error focus-visible:ring-accent-error"
                          )}
                        />
                        <GhostOverlay
                          value={formData.title}
                          tail={titleGhost?.tail ?? ""}
                          paddingClassName="px-3 py-2"
                          radiusClassName="rounded-lg"
                          className="text-sm"
                        />
                      </div>
                      {errors.title ? (
                        <p className="mt-1 text-sm text-accent-error">{errors.title}</p>
                      ) : null}
                    </div>

                    <div className="w-full">
                      <label className="mb-2 block text-sm font-medium text-theme-primaryText dark:text-white">
                        Skills
                      </label>
                      <div className="flex min-h-[54px] w-full items-stretch overflow-hidden rounded-full border border-black bg-theme-secondary text-theme-primaryText dark:rounded-2xl dark:border-white dark:bg-darkBlue-003 dark:text-white">
                        <div className="relative min-h-[54px] min-w-0 flex-1">
                          <input
                            type="text"
                            value={formData.skillInput}
                            onChange={(e) =>
                              setFormData({ ...formData, skillInput: e.target.value })
                            }
                            onKeyDown={(e) => {
                              acceptGhostOnTab(e, skillsGhost, (full) =>
                                setFormData({ ...formData, skillInput: full })
                              );
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addShowcaseSkill();
                              }
                            }}
                            onPointerDown={(e) =>
                              acceptGhostOnTouchTap(e, skillsGhost, (full) =>
                                setFormData({ ...formData, skillInput: full })
                              )
                            }
                            placeholder="Enter your skills"
                            aria-label="Add skill"
                            className="h-full min-h-[54px] w-full border-0 bg-transparent px-4 py-3 text-sm text-theme-primaryText placeholder:text-theme-accent4 focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-white/80"
                          />
                          <GhostOverlay
                            value={formData.skillInput}
                            tail={skillsGhost?.tail ?? ""}
                            paddingClassName="px-4 py-3"
                            radiusClassName="rounded-full dark:rounded-2xl"
                            className="text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={addShowcaseSkill}
                          className="flex h-auto min-h-[54px] w-12 shrink-0 items-center justify-center text-theme-primaryText transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:text-white dark:hover:bg-white/10"
                          aria-label="Add skill"
                        >
                          <Plus className="h-6 w-6" strokeWidth={2} />
                        </button>
                      </div>
                      {formData.skillTags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {formData.skillTags.map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center gap-1.5 rounded-2xl bg-theme-accent8 px-[13px] py-2.5 text-sm font-semibold text-theme-accent3 dark:bg-darkBlue-203 dark:text-white"
                            >
                              {skill}
                              <button
                                type="button"
                                onClick={() => removeShowcaseSkill(skill)}
                                className="rounded p-0.5 text-theme-accent3 hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                                aria-label={`Remove ${skill}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="w-full">
                      <label className="mb-1 block text-sm font-medium text-theme-primaryText dark:text-white">
                        Description <span className="ml-1 text-accent-error">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          value={formData.description}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= maxChars) {
                              setFormData({ ...formData, description: value });
                              setErrors({ ...errors, description: undefined });
                            }
                          }}
                          onKeyDown={(e) =>
                            acceptGhostOnTab(e, descriptionGhost, (full) => {
                              if (full.length <= maxChars) {
                                setFormData({ ...formData, description: full });
                                setErrors({ ...errors, description: undefined });
                              }
                            })
                          }
                          onPointerDown={(e) =>
                            acceptGhostOnTouchTap(e, descriptionGhost, (full) => {
                              if (full.length <= maxChars) {
                                setFormData({ ...formData, description: full });
                                setErrors({ ...errors, description: undefined });
                              }
                            })
                          }
                          placeholder="Describe your work and experience in detail"
                          rows={6}
                          required
                          className={cn(
                            "flex min-h-[80px] w-full rounded-lg border border-theme-accent2 bg-theme-primaryBackground px-3 py-2 text-sm text-theme-primaryText",
                            "placeholder:text-theme-accent4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                            "dark:border-gray-600 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white",
                            errors.description && "border-accent-error focus-visible:ring-accent-error"
                          )}
                        />
                        <GhostOverlay
                          value={formData.description}
                          tail={descriptionGhost?.tail ?? ""}
                          paddingClassName="px-3 py-2"
                          radiusClassName="rounded-lg"
                          className="text-sm"
                          multiline
                        />
                      </div>
                      {errors.description ? (
                        <p className="mt-1 text-sm text-accent-error">{errors.description}</p>
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        descriptionLength < minChars ? "text-red-500" : "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {descriptionLength}/{maxChars} characters (min {minChars})
                    </p>

                    <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.location}
                        readOnly
                        placeholder="Your Address"
                        required
                        className={`w-full cursor-default rounded-[16px] border px-4 py-3 pr-24 focus:outline-none focus:ring-2 dark:bg-darkBlue-013 dark:text-white dark:placeholder:text-white ${
                          errors.location
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:ring-red-500 dark:border-gray-600"
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                        {formData.location ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, location: "" }));
                              setSelectedMapAddress("");
                              setErrors((prev) => ({ ...prev, location: undefined }));
                            }}
                            className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-gray-400 bg-white text-[12px] font-semibold leading-none text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-500 dark:bg-darkBlue-013 dark:text-white"
                            aria-label="Clear location"
                          >
                            ×
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void openLocationPicker()}
                          disabled={isFetchingLocation}
                          className="flex h-[24px] w-[28px] items-center justify-center rounded-md bg-transparent text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white dark:hover:bg-darkBlue-203"
                          aria-label="Open location picker map"
                        >
                          {isFetchingLocation ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                          ) : (
                            <MapIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location}</p>}
                  </div>
                </div>

                {/* RIGHT COLUMN: pictures only */}
                <div className="space-y-4">
                  <div className={sectionBlockClasses}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        Photos (at least 3) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{imagePreviews.length}/5 Photos</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Add photos to help Clients better understand your skills
                    </p>

                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-4">
                        {imagePreviews.map((preview, index) => (
                          <div
                            key={index}
                            className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600"
                          >
                            <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {imagePreviews.length < 5 && (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors p-4 min-h-[180px]",
                          "border-black dark:border-white",
                          "hover:bg-gray-50 dark:hover:bg-white/5",
                          errors.images && "border-red-600 dark:border-red-500"
                        )}
                      >
                        <Camera className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium text-center">Add Photo</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    {errors.images && <p className="mt-1 text-sm text-red-500">{errors.images}</p>}
                  </div>
                </div>
              </div>

              {/* Action Buttons: outside blocks, Flutter-style side-by-side */}
              <div className="pt-2">
                <div className="mx-auto flex w-full max-w-[320px] items-center justify-center gap-3 sm:max-w-[360px]">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="h-10 flex-1 rounded-[16px] border-transparent bg-[#C8C8C8] px-4 text-sm font-medium text-black shadow-[0_4px_4px_rgba(0,0,0,0.4)] hover:bg-[#bbbbbb] dark:bg-[#C8C8C8] dark:text-black dark:hover:bg-[#bbbbbb]"
                  onClick={handleCancelClick}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className={cn(
                    "h-10 flex-1 rounded-[16px] px-4 text-sm font-medium shadow-[0_4px_4px_rgba(0,0,0,0.4)] disabled:!opacity-100",
                    hasTypedSomethingInShowcaseForm
                      ? "bg-[#F21A1A] text-white hover:bg-red-600 disabled:cursor-wait disabled:shadow-none"
                      : "cursor-not-allowed bg-[#8E8E93] text-white/80 shadow-none hover:bg-[#8E8E93] dark:bg-[#5C5C5E] dark:text-white/55 dark:hover:bg-[#5C5C5E]"
                  )}
                  isLoading={isSubmitting}
                  disabled={isSubmitting || !hasTypedSomethingInShowcaseForm}
                >
                  Submit Showcase
                </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {isLocationPickerOpen ? (
          <div className="fixed inset-0 z-[280] bg-black/45">
            <div className="relative flex h-full w-full flex-col bg-white dark:bg-darkBlue-013">
              <div className="relative flex-1">
                {profileLocationCenter ? (
                  <div className="pointer-events-none absolute left-4 top-16 z-[999] max-w-[min(100%,280px)] rounded-lg bg-black/75 px-3 py-2 text-xs font-medium leading-snug text-white">
                    Tap or drag the blue pin inside the red {SHOWCASE_LOCATION_RADIUS_KM} km circle to set your
                    showcase location.
                  </div>
                ) : null}
                {!googleMapsApiKey ? (
                  !isLeafletMapReady ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                    </div>
                  ) : (
                    <>
                      <div ref={leafletContainerRef} className="h-full w-full" />
                      <FlutterMapControls
                        mapStyle={pickerMapStyle}
                        onLocate={() => void handleLocateOnMap()}
                        onCycleStyle={() => setPickerMapStyle((p) => cycleFlutterMapStyle(p))}
                        isLocating={isLocatingOnMap}
                      />
                    </>
                  )
                ) : locationMapLoadError ? (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-600 dark:text-gray-300">
                    Google Maps failed to load. Please try again.
                  </div>
                ) : !isLocationMapLoaded ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  </div>
                ) : (
                  <>
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "100%" }}
                      center={selectedMapPoint ?? profileLocationCenter ?? DEFAULT_LOCATION_CENTER}
                      {...(profileLocationCenter ? {} : { zoom: 13 })}
                      onClick={(event) => {
                        const lat = event.latLng?.lat();
                        const lng = event.latLng?.lng();
                        if (typeof lat !== "number" || typeof lng !== "number") return;
                        const point = { lat, lng };
                        trySelectMapPoint(point);
                      }}
                      options={googleMapOptionsForStyle(pickerMapStyle)}
                    >
                      {profileLocationCenter ? (
                        <ShowcaseLocationRadiusGoogleFit
                          profileCenter={profileLocationCenter}
                          radiusKm={SHOWCASE_LOCATION_RADIUS_KM}
                        />
                      ) : null}
                      {profileLocationCenter ? (
                        <Circle
                          center={profileLocationCenter}
                          radius={SHOWCASE_LOCATION_RADIUS_KM * 1000}
                          options={SHOWCASE_PICKER_CIRCLE_GOOGLE}
                        />
                      ) : null}
                      <Marker
                        key={`showcase-pin-${pickerMarkerSnapKey}-${showcasePickerPinPosition.lat}-${showcasePickerPinPosition.lng}`}
                        position={showcasePickerPinPosition}
                        icon={googleProfileCenterMarkerIcon()}
                        draggable={!!profileLocationCenter}
                        onDragEnd={(event) => {
                          const lat = event.latLng?.lat();
                          const lng = event.latLng?.lng();
                          if (typeof lat !== "number" || typeof lng !== "number") return;
                          if (!trySelectMapPoint({ lat, lng })) {
                            setPickerMarkerSnapKey((k) => k + 1);
                          }
                        }}
                      />
                      <GoogleMapPanTo target={mapPanTarget} zoom={16} />
                    </GoogleMap>
                    <FlutterMapControls
                      mapStyle={pickerMapStyle}
                      onLocate={() => void handleLocateOnMap()}
                      onCycleStyle={() => setPickerMapStyle((p) => cycleFlutterMapStyle(p))}
                      isLocating={isLocatingOnMap}
                    />
                  </>
                )}
              </div>
              <LocationPickerFooter
                size="lg"
                addressLine={selectedMapAddress}
                isResolving={isResolvingMapAddress}
                confirmDisabled={!selectedMapPoint || !selectionWithinRadius}
                radiusWarning={
                  selectedMapPoint && !selectionWithinRadius
                    ? `Move the pin inside the red ${SHOWCASE_LOCATION_RADIUS_KM} km circle around your profile location.`
                    : undefined
                }
                onCancel={() => {
                  setIsLocationPickerOpen(false);
                  setShowOutOfRangeModal(false);
                  setShowUpdateCenterModal(false);
                }}
                onConfirm={() => void handleUsePickedLocation()}
              />
            </div>
          </div>
        ) : null}

        {showUpdateCenterModal ? (
          <div className="fixed inset-0 z-[290] flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-darkBlue-013">
              <h3 className="text-xl font-semibold leading-tight text-gray-900 dark:text-white">Update profile location</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                Do you want to update your profile location to this exact point?
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpdateCenterModal(false)}
                  className="px-1 py-1 text-sm font-medium text-gray-600 transition-colors hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdatingProfileLocation}
                  onClick={() => void handleUpdateCenterLocation()}
                  className="rounded-lg bg-[#F21A1A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                >
                  {isUpdatingProfileLocation ? "Updating..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showOutOfRangeModal ? (
          <div className="fixed inset-0 z-[289] flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-darkBlue-013">
              <h3 className="text-xl font-semibold leading-tight text-gray-900 dark:text-white">Out of range</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                Selected marker is outside your {SHOWCASE_LOCATION_RADIUS_KM} km radius. You can select a point within range or
                update your profile location.
              </p>
              <div className="mt-6 flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOutOfRangeModal(false)}
                  className="px-1 py-1 text-sm font-medium text-gray-600 transition-colors hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                >
                  Keep within radius
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOutOfRangeModal(false);
                    setShowUpdateCenterModal(true);
                  }}
                  className="rounded-lg bg-[#F21A1A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                >
                  Update center location
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showDraftsModal ? (
          <div className="fixed inset-0 z-[262] flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-md rounded-2xl bg-[#D9D9D9] p-4 shadow-2xl dark:bg-darkBlue-203">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Showcase Work Draft</h3>
                <button
                  type="button"
                  onClick={() => setShowDraftsModal(false)}
                  className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
              <p className="mb-3 text-sm text-gray-600 dark:text-white/70">Unsaved showcase work:</p>

              <div className="max-h-[55vh] overflow-y-auto rounded-2xl border border-gray-300 p-2 dark:border-white/10">
                {draftsLoading ? (
                  <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading drafts...</p>
                ) : drafts.length === 0 ? (
                  <p className="py-12 text-center text-2xl text-gray-400 dark:text-gray-500">No drafts available</p>
                ) : (
                  <ul className="space-y-2">
                    {drafts.map((d) => (
                      <li key={d.id} className="rounded-xl border border-gray-300 p-3 dark:border-white/10 dark:bg-white/5">
                        <p className="line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">
                          {d.form.title || "Untitled draft"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                          {d.form.description || "No description"}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => applyDraftToForm(d)}
                            className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDraftDeleteConfirmId(d.id)}
                            className="rounded-lg px-3 py-1 text-xs font-medium text-red-500 transition-colors hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {draftDeleteConfirmId ? (
          <div className="fixed inset-0 z-[268] flex items-center justify-center p-4" role="presentation">
            <button
              type="button"
              className="absolute inset-0 bg-black/55"
              aria-label="Close"
              disabled={isDeletingDraft}
              onClick={() => {
                if (!isDeletingDraft) setDraftDeleteConfirmId(null);
              }}
            />
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-draft-confirm-title"
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:border dark:border-white/10 dark:bg-darkBlue-003"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-gray-100 px-5 pb-4 pt-5 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <Trash2 className="h-6 w-6 shrink-0 text-red-500" aria-hidden />
                  <h2
                    id="delete-draft-confirm-title"
                    className="text-lg font-bold leading-snug text-gray-900 dark:text-white"
                  >
                    Delete this draft?
                  </h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-900 dark:text-gray-100">
                  This draft will be removed permanently.
                </p>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-darkBlue-203/80">
                  <FileText className="h-5 w-5 shrink-0 text-gray-800 dark:text-gray-200" aria-hidden />
                  <span className="min-w-0 flex-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {drafts.find((d) => d.id === draftDeleteConfirmId)?.form.title?.trim() || "Untitled draft"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-white/10">
                <button
                  type="button"
                  disabled={isDeletingDraft}
                  onClick={() => setDraftDeleteConfirmId(null)}
                  className="px-2 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingDraft}
                  onClick={() => void confirmDeleteShowcaseDraft()}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: DELETE_DRAFT_MODAL_RED }}
                >
                  {isDeletingDraft ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isDraftValidationModalOpen ? (
          <div className="fixed inset-0 z-[265] flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-white shadow-2xl dark:border-red-400/30 dark:bg-darkBlue-013">
              <div className="border-b border-red-100 px-5 py-4 dark:border-red-400/20">
                <h3 className="text-lg font-bold text-[#E53E3E] dark:text-red-300">Draft cannot be empty</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  Enter at least one field before saving a draft.
                </p>
              </div>
              <div className="flex justify-end border-t border-gray-100 px-5 py-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsDraftValidationModalOpen(false)}
                  className="rounded-lg bg-[#E53E3E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isSaveDraftModalOpen ? (
          <div className="fixed inset-0 z-[266] flex items-center justify-center bg-black/55 p-4">
            <div className="relative w-full max-w-sm rounded-2xl bg-[#D9D9D9] p-5 shadow-2xl dark:bg-darkBlue-203">
              <button
                type="button"
                onClick={() => setIsSaveDraftModalOpen(false)}
                className="absolute right-3 top-3 rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Close save draft popup"
              >
                <X className="h-5 w-5 text-black dark:text-white" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="mt-3 mb-4 text-red-500">
                  <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" aria-hidden>
                    <path d="M5 7h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-black dark:text-white">Save Showcase Work?</h3>
                <p className="mt-2 text-sm text-black/60 dark:text-white/70">
                  You can save showcase work to send later from your drafts.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDiscardAndExit}
                  className="min-w-24 rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveDraftAndExit()}
                  disabled={isSavingDraft}
                  className="min-w-24 rounded-full bg-[#C8C8C8] px-5 py-2 text-sm font-semibold text-black hover:bg-[#bbbbbb] disabled:opacity-60"
                >
                  {isSavingDraft ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* My Showcases */}
        {showcases.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              My Showcases
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {showcases.map((showcase) => (
                <Card
                  key={showcase.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow dark:bg-darkBlue-203 dark:border-gray-700"
                >
                  {showcase.imageUrls && showcase.imageUrls.length > 0 && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={showcase.imageUrls[0]}
                        alt={showcase.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleDelete(showcase.id!, showcase.imageUrls, showcase.videoUrl)}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {showcase.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">
                      {showcase.description}
                    </p>
                    {showcase.location && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        📍 {showcase.location}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
