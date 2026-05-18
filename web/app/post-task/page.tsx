"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, MapPin, Plus, Camera, X, Clock, ChevronDown, Keyboard, Edit, ChevronLeft, ChevronRight, AlertCircle, Info, Map as MapIcon } from "lucide-react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
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
import { googleSelectedMarkerIcon } from "@/lib/map/mapMarkerIcons";
import { useAuth } from "@/lib/api/AuthContext";
import { createJob } from "@/lib/api/jobs";
import {
  deleteJobDraft,
  listJobDrafts,
  saveJobDraft,
  type JobDraftDocument,
  type JobDraftFormSnapshot,
} from "@/lib/api/jobDrafts";
import { fetchCategoriesFromFirestore } from "@/lib/api/categories";
import { fetchSkillNamesFromFirestore } from "@/lib/api/skillsFirestore";
import { getUserData, resolveProfileDisplayName } from "@/lib/api/auth";
import type { Category } from "@/lib/types/category";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SKILL_SUGGESTIONS } from "@/lib/constants/skillsCatalog";
import { GhostOverlay } from "@/components/ui/GhostOverlay";
import { acceptGhostOnTab, acceptGhostOnTouchTap } from "@/lib/utils/ghostInputHandlers";
import { findGhostSuggestion } from "@/lib/utils/ghostSuggestion";
import {
  JOB_DESCRIPTION_SUGGESTIONS,
  JOB_DURATION_SUGGESTIONS,
  JOB_EXTRA_WORD_SUGGESTIONS,
  JOB_EXTRA_WORD_SUGGESTIONS_FRENCH,
  JOB_LOCATION_NOTES_SUGGESTIONS,
  JOB_LOCATION_SUGGESTIONS,
  JOB_PRICE_SUGGESTIONS,
  JOB_TIME_FLEXIBILITY_SUGGESTIONS,
} from "@/lib/constants/jobFieldSuggestions";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { showDraftSavedSnackbar } from "@/lib/draftSavedEvents";
import {
  chatzingDraftToJobFormSnapshot,
  consumeChatzingPendingDraft,
  dataUrlsToFiles,
} from "@/lib/chatzing/contentDraft";

const JOB_TITLE_SUGGESTIONS = [
  "Plumbing Repair",
  "Emergency Plumber Needed",
  "Drain Cleaning",
  "Toilet Installation",
  "Faucet Replacement",
  "Water Heater Service",
  "Grass Cutting",
  "Lawn Mowing",
  "Garden Maintenance",
  "Hedge Trimming",
  "Weed Removal",
  "Yard Cleanup",
  "House Cleaning",
  "Deep Cleaning Service",
  "Move-In Cleaning",
  "Move-Out Cleaning",
  "Kitchen Cleaning",
  "Bathroom Sanitization",
  "Window Cleaning",
  "Carpet Cleaning",
  "Sofa Cleaning",
  "Pool Cleaning",
  "Gutter Cleaning",
  "Snow Removal",
  "Painting Walls",
  "Interior Painting",
  "Exterior Painting",
  "Drywall Repair",
  "Ceiling Repair",
  "Floor Tile Installation",
  "Tile Grout Repair",
  "Laminate Flooring Install",
  "Electrical Repair",
  "Light Fixture Installation",
  "Switch and Socket Repair",
  "Fan Installation",
  "AC Service and Repair",
  "Heater Maintenance",
  "Fridge Repair",
  "Washing Machine Repair",
  "Dishwasher Repair",
  "Furniture Assembly",
  "IKEA Furniture Setup",
  "TV Wall Mount Installation",
  "Curtain Rod Installation",
  "Door Repair",
  "Lock Installation",
  "Handyman Needed",
  "General Home Maintenance",
  "Roof Leak Repair",
  "Pest Control Service",
  "Babysitting Job",
  "Pet Sitting",
  "Dog Walking",
  "Grocery Delivery Help",
  "Office Cleaning",
  "Data Entry Assistant",
  "Virtual Assistant Task",
  "Content Writing",
  "Graphic Design Task",
  "Website Bug Fix",
  "Mobile App Testing",
];

const DEFAULT_POST_JOB_MAP_CENTER = { lat: 31.5204, lng: 74.3587 };
export default function PostTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData } = useAuth();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"jobs" | "drafts">("jobs");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<JobDraftDocument[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [jobType, setJobType] = useState<"fixed" | "hourly">("fixed");
  const [postingType, setPostingType] = useState<"individual" | "company" | "instore">("individual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [isDraftValidationModalOpen, setIsDraftValidationModalOpen] = useState(false);
  const [isSaveDraftModalOpen, setIsSaveDraftModalOpen] = useState(false);
  const [isPostSuccessModalOpen, setIsPostSuccessModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    companyName: "",
    individualName: "",
    storeName: "",
    category: "",
    description: "",
    price: "",
    estimatedDuration: "",
    location: "",
    additionalLocationNotes: "",
    date: "",
    urgency: "normal" as "low" | "normal" | "urgent",
    skills: [] as string[],
    skillInput: "",
    timeFlexibility: "",
    startTime: "",
    endTime: "",
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  
  // Time picker modal state
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [timePickerField, setTimePickerField] = useState<"startTime" | "endTime" | null>(null);
  const [pickerHour, setPickerHour] = useState(12);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerAmPm, setPickerAmPm] = useState<"AM" | "PM">("PM");

  // Date picker modal state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date | null>(null);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // Location fetching state
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isLeafletMapReady, setIsLeafletMapReady] = useState(false);
  const [selectedMapPoint, setSelectedMapPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMapAddress, setSelectedMapAddress] = useState("");
  const [isResolvingMapAddress, setIsResolvingMapAddress] = useState(false);
  const [isLocatingOnMap, setIsLocatingOnMap] = useState(false);
  const [mapPanTarget, setMapPanTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [pickerMapStyle, setPickerMapStyle] = useState<FlutterMapStyle>("default");
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const {
    isLoaded: isPostJobLocationMapLoaded,
    loadError: postJobLocationMapLoadError,
  } = useJsApiLoader(taskzingGoogleMapsLoaderConfig(googleMapsApiKey));
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [categoryRows, setCategoryRows] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [skillCatalog, setSkillCatalog] = useState<string[]>(SKILL_SUGGESTIONS);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const skillsDropdownRef = useRef<HTMLDivElement>(null);
  const titleDropdownRef = useRef<HTMLDivElement>(null);
  const leafletLibRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletTileLayerRef = useRef<any>(null);
  const leafletMarkerRef = useRef<any>(null);
  const leafletContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletRedIconRef = useRef<any>(null);

  /** Preview stays grey/disabled until the user enters something (excludes profile-prefilled `individualName` and default `urgency`). */
  const hasTypedSomethingInPostJobForm = useMemo(() => {
    const ne = (s: string) => s.trim().length > 0;
    const fd = formData;
    if (fd.skills.length > 0) return true;
    return (
      ne(fd.skillInput) ||
      ne(fd.title) ||
      ne(fd.companyName) ||
      ne(fd.storeName) ||
      ne(fd.category) ||
      ne(fd.description) ||
      ne(fd.price) ||
      ne(fd.estimatedDuration) ||
      ne(fd.location) ||
      ne(fd.additionalLocationNotes) ||
      ne(fd.date) ||
      ne(fd.timeFlexibility) ||
      ne(fd.startTime) ||
      ne(fd.endTime)
    );
  }, [formData]);

  // Auto-populate individual name from user profile
  useEffect(() => {
    if (postingType === "individual" && user) {
      const profileName = resolveProfileDisplayName(user, userData);
      if (profileName) {
        setFormData((prev) => ({
          ...prev,
          individualName: profileName,
        }));
      }
    } else if (postingType !== "individual") {
      // Clear individual name when switching away from individual
      setFormData((prev) => ({
        ...prev,
        individualName: "",
      }));
    }
  }, [postingType, user, userData]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const rows = await fetchCategoriesFromFirestore();
        if (!alive) return;
        setCategoryRows(
          rows.length > 0
            ? rows
            : [
                {
                  id: "other",
                  mainCategory: "Other",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ]
        );
      } catch (e) {
        console.error("Failed to load categories from Firestore:", e);
        if (alive) {
          setCategoryRows([
            {
              id: "other",
              mainCategory: "Other",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]);
        }
      } finally {
        if (alive) setCategoriesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    let alive = true;
    void fetchSkillNamesFromFirestore().then((fromDb) => {
      if (!alive) return;
      setSkillCatalog(
        [...new Set([...SKILL_SUGGESTIONS, ...fromDb])].sort((a, b) =>
          a.localeCompare(b)
        )
      );
    });
    return () => {
      alive = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (searchParams.get("from") !== "chatzing" || !user?.uid) return;
    const draft = consumeChatzingPendingDraft();
    if (!draft || draft.kind !== "job") return;

    setJobType("fixed");
    setPostingType("individual");
    setFormData({
      ...chatzingDraftToJobFormSnapshot(draft),
      skillInput: "",
    });
    setEditingDraftId(null);
    setActiveTab("jobs");

    if (draft.imageDataUrls.length > 0) {
      void dataUrlsToFiles(draft.imageDataUrls).then((files) => {
        if (!files.length) return;
        revokePhotoPreviewUrls();
        setPhotos(files);
        setPhotoPreviews(files.map((f) => URL.createObjectURL(f)));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply once when opened from ChatZing
  }, [searchParams, user?.uid]);

  useEffect(() => {
    if (activeTab !== "drafts" || !user?.uid) return;
    let alive = true;
    setDraftsLoading(true);
    void listJobDrafts(user.uid)
      .then((rows) => {
        if (alive) setDrafts(rows);
      })
      .catch((err) => {
        console.error("Failed to load job drafts:", err);
        if (alive) setDrafts([]);
      })
      .finally(() => {
        if (alive) setDraftsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeTab, user?.uid]);

  const filteredSkillSuggestions = useMemo(() => {
    const query = formData.skillInput.trim().toLowerCase();
    const availableSkills = skillCatalog.filter(
      (skill) => !formData.skills.includes(skill)
    );

    if (!query) {
      return availableSkills.slice(0, 150);
    }

    return availableSkills
      .filter((skill) => skill.toLowerCase().includes(query))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.toLowerCase().startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.localeCompare(b);
      })
      .slice(0, 200);
  }, [formData.skillInput, formData.skills, skillCatalog]);

  const filteredTitleSuggestions = useMemo(() => {
    const query = formData.title.trim().toLowerCase();
    if (!query) {
      return JOB_TITLE_SUGGESTIONS.slice(0, 25);
    }

    return JOB_TITLE_SUGGESTIONS.filter((title) =>
      title.toLowerCase().includes(query)
    )
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.toLowerCase().startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.localeCompare(b);
      })
      .slice(0, 50);
  }, [formData.title]);

  // ----- Inline "ghost text" autocompletion (Google Docs / Copilot style) -----
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
        [...JOB_TITLE_SUGGESTIONS, ...ghostExtraWords],
        "full"
      ),
    [formData.title, ghostExtraWords]
  );

  const descriptionGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.description,
        [...JOB_DESCRIPTION_SUGGESTIONS, ...ghostExtraWords],
        "lastSegment"
      ),
    [formData.description, ghostExtraWords]
  );

  const locationGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.location,
        [...JOB_LOCATION_SUGGESTIONS, ...ghostExtraWords],
        "full"
      ),
    [formData.location, ghostExtraWords]
  );

  const locationNotesGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.additionalLocationNotes,
        [...JOB_LOCATION_NOTES_SUGGESTIONS, ...ghostExtraWords],
        "lastSegment"
      ),
    [formData.additionalLocationNotes, ghostExtraWords]
  );

  const priceGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.price,
        [...JOB_PRICE_SUGGESTIONS, ...ghostExtraWords],
        "full"
      ),
    [formData.price, ghostExtraWords]
  );

  const durationGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.estimatedDuration,
        [...JOB_DURATION_SUGGESTIONS, ...ghostExtraWords],
        "full"
      ),
    [formData.estimatedDuration, ghostExtraWords]
  );

  const timeFlexibilityGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.timeFlexibility,
        [...JOB_TIME_FLEXIBILITY_SUGGESTIONS, ...ghostExtraWords],
        "full"
      ),
    [formData.timeFlexibility, ghostExtraWords]
  );

  const skillGhost = useMemo(() => {
    if (!formData.skillInput) return null;
    const remaining = skillCatalog.filter(
      (skill) => !formData.skills.includes(skill)
    );
    return findGhostSuggestion(
      formData.skillInput,
      [...remaining, ...ghostExtraWords],
      "full"
    );
  }, [formData.skillInput, formData.skills, skillCatalog, ghostExtraWords]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        skillsDropdownRef.current &&
        !skillsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSkillSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isLocationPickerOpen || googleMapsApiKey) return;
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
      leafletRedIconRef.current = new L.Icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      if (alive) setIsLeafletMapReady(true);
    };
    void setupLeaflet();

    return () => {
      alive = false;
      setIsLeafletMapReady(false);
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, [isLocationPickerOpen, googleMapsApiKey]);

  useEffect(() => {
    if (!isLocationPickerOpen || googleMapsApiKey || !isLeafletMapReady) return;
    const L = leafletLibRef.current;
    const container = leafletContainerRef.current;
    if (!L || !container) return;

    if (!leafletMapRef.current) {
      if ((container as any)._leaflet_id) {
        try {
          delete (container as any)._leaflet_id;
        } catch {
          (container as any)._leaflet_id = undefined;
        }
      }
      const start = selectedMapPoint ?? DEFAULT_POST_JOB_MAP_CENTER;
      const map = L.map(container, { zoomControl: false, attributionControl: false }).setView([start.lat, start.lng], 15);
      const tiles = leafletTileConfig(pickerMapStyle);
      leafletTileLayerRef.current = L.tileLayer(tiles.url, {
        attribution: tiles.attribution,
      }).addTo(map);
      leafletMarkerRef.current = L.marker(
        [start.lat, start.lng],
        leafletRedIconRef.current ? { icon: leafletRedIconRef.current } : {}
      ).addTo(map);
      map.on("click", (event: any) => {
        const point = { lat: event.latlng.lat, lng: event.latlng.lng };
        setSelectedMapPoint(point);
        if (leafletMarkerRef.current) {
          leafletMarkerRef.current.setLatLng([point.lat, point.lng]);
        }
        void resolveMapPointAddress(point);
      });
      leafletMapRef.current = map;
    }
  }, [isLocationPickerOpen, isLeafletMapReady, selectedMapPoint, pickerMapStyle]);

  useEffect(() => {
    if (!isLocationPickerOpen || googleMapsApiKey || !leafletTileLayerRef.current) return;
    const tiles = leafletTileConfig(pickerMapStyle);
    leafletTileLayerRef.current.setUrl(tiles.url);
  }, [pickerMapStyle, isLocationPickerOpen, googleMapsApiKey]);

  useEffect(() => {
    if (!isLocationPickerOpen) {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      leafletTileLayerRef.current = null;
      leafletMarkerRef.current = null;
      return;
    }
    const point = selectedMapPoint;
    if (!point || !leafletMapRef.current || !leafletMarkerRef.current) return;
    leafletMarkerRef.current.setLatLng([point.lat, point.lng]);
    leafletMapRef.current.panTo([point.lat, point.lng]);
  }, [selectedMapPoint, isLocationPickerOpen]);

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
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        titleDropdownRef.current &&
        !titleDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTitleSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const categoryOptions = useMemo(
    () => [
      {
        value: "",
        label: categoriesLoading ? "Loading categories…" : "Select Category",
      },
      ...categoryRows.map((cat) => ({
        value: cat.subCategory || cat.mainCategory,
        label: `${cat.mainCategory}${cat.subCategory ? ` - ${cat.subCategory}` : ""}`,
      })),
    ],
    [categoryRows, categoriesLoading]
  );

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      alert("Maximum 5 photos allowed");
      return;
    }
    
    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);
    
    // Create previews
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews([...photoPreviews, ...newPreviews]);
    
    // Clear photo error if we have at least 3 photos
    if (newPhotos.length >= 3) {
      clearError("photos");
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos(newPhotos);
    setPhotoPreviews(newPreviews);
  };


  const addSkill = () => {
    if (formData.skillInput.trim() && !formData.skills.includes(formData.skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, formData.skillInput.trim()],
        skillInput: "",
      });
      setShowSkillSuggestions(false);
    }
  };

  const addSuggestedSkill = (skill: string) => {
    if (!formData.skills.includes(skill)) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skill],
        skillInput: "",
      });
      setShowSkillSuggestions(false);
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    });
  };

  const selectJobTitleSuggestion = (title: string) => {
    setFormData({ ...formData, title });
    setShowTitleSuggestions(false);
    clearError("title");
  };

  // Time picker functions
  const openTimePicker = (field: "startTime" | "endTime") => {
    setTimePickerField(field);
    const currentTime = formData[field];
    if (currentTime) {
      // Parse existing time (format: "HH:MM")
      const [hours, minutes] = currentTime.split(":").map(Number);
      const hour12 = hours % 12 || 12;
      setPickerHour(hour12);
      setPickerMinute(minutes);
      setPickerAmPm(hours >= 12 ? "PM" : "AM");
    } else {
      setPickerHour(12);
      setPickerMinute(0);
      setPickerAmPm("PM");
    }
    setIsTimePickerOpen(true);
  };

  const closeTimePicker = () => {
    setIsTimePickerOpen(false);
    setTimePickerField(null);
  };

  const confirmTimePicker = () => {
    if (timePickerField) {
      // Convert 12-hour format to 24-hour format
      let hour24 = pickerHour;
      if (pickerAmPm === "PM" && pickerHour !== 12) {
        hour24 = pickerHour + 12;
      } else if (pickerAmPm === "AM" && pickerHour === 12) {
        hour24 = 0;
      }
      const timeString = `${hour24.toString().padStart(2, "0")}:${pickerMinute.toString().padStart(2, "0")}`;
      setFormData({
        ...formData,
        [timePickerField]: timeString,
      });
    }
    closeTimePicker();
  };

  const formatTimeDisplay = (hour: number, minute: number) => {
    return `${hour} : ${minute.toString().padStart(2, "0")}`;
  };

  const handleClockClick = (hour: number) => {
    setPickerHour(hour);
  };

  const handleMinuteClick = () => {
    // Toggle between hour and minute selection (for now, just allow hour selection)
    // In a full implementation, you'd cycle between hour and minute selection
  };

  // Date picker functions
  const openDatePicker = () => {
    if (formData.date) {
      const date = new Date(formData.date);
      setPickerDate(date);
      setPickerMonth(date.getMonth());
      setPickerYear(date.getFullYear());
    } else {
      const today = new Date();
      setPickerDate(today);
      setPickerMonth(today.getMonth());
      setPickerYear(today.getFullYear());
    }
    setIsDatePickerOpen(true);
  };

  const closeDatePicker = () => {
    setIsDatePickerOpen(false);
  };

  const confirmDatePicker = () => {
    if (pickerDate) {
      const dateString = pickerDate.toISOString().split("T")[0];
      setFormData({ ...formData, date: dateString });
      clearError("date");
    }
    closeDatePicker();
  };

  const selectDate = (day: number) => {
    const selectedDate = new Date(pickerYear, pickerMonth, day);
    setPickerDate(selectedDate);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (pickerMonth === 0) {
        setPickerMonth(11);
        setPickerYear(pickerYear - 1);
      } else {
        setPickerMonth(pickerMonth - 1);
      }
    } else {
      if (pickerMonth === 11) {
        setPickerMonth(0);
        setPickerYear(pickerYear + 1);
      } else {
        setPickerMonth(pickerMonth + 1);
      }
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return "";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const getMonthName = (month: number) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return months[month];
  };

  // Validation function for preview
  const validateFormForPreview = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Job Title is required";
    }
    if (postingType === "company" && !formData.companyName.trim()) {
      newErrors.companyName = "Company Name is required";
    }
    if (postingType === "instore" && !formData.storeName.trim()) {
      newErrors.storeName = "Store Name is required";
    }
    if (!formData.category) {
      newErrors.category = "Category is required";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!formData.price.trim()) {
      newErrors.price = `${jobType === "fixed" ? "Price (Fixed Rate)" : "Hourly Rate"} is required`;
    }
    if (jobType === "fixed" && !formData.estimatedDuration.trim()) {
      newErrors.estimatedDuration = "Estimated Duration is required";
    }
    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }
    if (!formData.date) {
      newErrors.date = "Date is required";
    }
    if (photos.length < 3) {
      newErrors.photos = "At least 3 photos are required";
    }
    if (formData.skills.length === 0) {
      newErrors.skills = "At least one skill is required";
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    setShowErrorBanner(!isValid);
    
    if (!isValid) {
      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0];
      const errorElement = document.querySelector(`[data-field="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    
    return isValid;
  };

  const handlePreviewClick = () => {
    if (!hasTypedSomethingInPostJobForm) return;
    if (validateFormForPreview()) {
      setIsPreviewOpen(true);
      setShowErrorBanner(false);
    }
  };

  // Clear error when field is changed
  const clearError = (fieldName: string) => {
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const resolveMapPointAddress = async (point: { lat: number; lng: number }) => {
    setIsResolvingMapAddress(true);
    try {
      const address = await reverseGeocodeLatLng(point.lat, point.lng);
      setSelectedMapAddress(address);
      return address;
    } finally {
      setIsResolvingMapAddress(false);
    }
  };

  const centerMapOnPoint = (point: { lat: number; lng: number }) => {
    setSelectedMapPoint(point);
    setMapPanTarget(point);
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([point.lat, point.lng], Math.max(leafletMapRef.current.getZoom() ?? 14, 15), {
        animate: true,
      });
    }
  };

  const handleLocateOnMap = async () => {
    if (isLocatingOnMap) return;
    setIsLocatingOnMap(true);
    try {
      const point = await getUserLocation({ mode: "fast" });
      centerMapOnPoint(point);
      void resolveMapPointAddress(point);
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
    setSelectedMapAddress(formData.location || "");
    clearError("location");

    const initial = selectedMapPoint ?? DEFAULT_POST_JOB_MAP_CENTER;
    centerMapOnPoint(initial);

    setIsFetchingLocation(true);
    void (async () => {
      try {
        let point = initial;
        try {
          point = await getUserLocation({ mode: "balanced", timeout: 8000 });
        } catch {
          // Keep default center when GPS is unavailable.
        }
        centerMapOnPoint(point);
        void resolveMapPointAddress(point).then((address) => {
          if (!formData.location.trim()) {
            setSelectedMapAddress(address);
          }
        });
      } finally {
        setIsFetchingLocation(false);
      }
    })();
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const uploadPhotos = async (files: File[], _userId: string): Promise<string[]> => {
    return Promise.all(files.map(fileToDataUrl));
  };

  const buildFormSnapshot = (): JobDraftFormSnapshot => ({
    title: formData.title,
    companyName: formData.companyName,
    individualName: formData.individualName,
    storeName: formData.storeName,
    category: formData.category,
    description: formData.description,
    price: formData.price,
    estimatedDuration: formData.estimatedDuration,
    location: formData.location,
    additionalLocationNotes: formData.additionalLocationNotes,
    date: formData.date,
    urgency: formData.urgency,
    skills: [...formData.skills],
    timeFlexibility: formData.timeFlexibility,
    startTime: formData.startTime,
    endTime: formData.endTime,
  });

  const hasAnyDraftTextContent = () => {
    const textFields = [
      formData.title,
      formData.companyName,
      formData.individualName,
      formData.storeName,
      formData.category,
      formData.description,
      formData.price,
      formData.estimatedDuration,
      formData.location,
      formData.additionalLocationNotes,
      formData.date,
      formData.skillInput,
      formData.timeFlexibility,
      formData.startTime,
      formData.endTime,
    ];
    return (
      textFields.some((value) => value.trim().length > 0) ||
      formData.skills.length > 0 ||
      photos.length > 0
    );
  };

  const revokePhotoPreviewUrls = () => {
    photoPreviews.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
  };

  const applyDraftToForm = (d: JobDraftDocument) => {
    revokePhotoPreviewUrls();
    setPhotos([]);
    setPhotoPreviews([]);
    setJobType(d.jobType);
    setPostingType(d.postingType);
    setFormData({
      ...d.form,
      skillInput: "",
    });
    setEditingDraftId(d.id);
    setActiveTab("jobs");
  };

  const handleSaveDraft = async (): Promise<boolean> => {
    if (!user?.uid) {
      alert("Please sign in to save a draft.");
      return false;
    }
    if (!hasAnyDraftTextContent()) {
      setIsDraftValidationModalOpen(true);
      return false;
    }
    setIsSavingDraft(true);
    try {
      const wasExisting = editingDraftId != null;
      const id = await saveJobDraft(
        user.uid,
        jobType,
        postingType,
        buildFormSnapshot(),
        editingDraftId
      );
      setEditingDraftId(id);
      if (activeTab === "drafts") {
        const rows = await listJobDrafts(user.uid);
        setDrafts(rows);
      }
      showDraftSavedSnackbar(wasExisting ? "Draft updated." : "Post saved to draft");
      return true;
    } catch (err: unknown) {
      console.error(err);
      alert(
        err instanceof Error ? err.message : "Could not save draft. Try again."
      );
      return false;
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
    setErrors({});
    setShowErrorBanner(false);
  };

  const handleDiscardAndExit = () => {
    setIsSaveDraftModalOpen(false);
    router.back();
    setErrors({});
    setShowErrorBanner(false);
  };

  const handleSaveDraftAndExit = async () => {
    const didSave = await handleSaveDraft();
    if (!didSave) return;
    setIsSaveDraftModalOpen(false);
    router.back();
    setErrors({});
    setShowErrorBanner(false);
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!user?.uid) return;
    if (!confirm("Delete this draft?")) return;
    setDeletingDraftId(draftId);
    try {
      await deleteJobDraft(user.uid, draftId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      if (editingDraftId === draftId) {
        setEditingDraftId(null);
      }
    } catch (err: unknown) {
      console.error(err);
      alert(
        err instanceof Error ? err.message : "Could not delete draft."
      );
    } finally {
      setDeletingDraftId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert("Please sign in to post a job.");
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      alert("Please enter a job title");
      return;
    }
    if (postingType === "company" && !formData.companyName.trim()) {
      alert("Please enter a company name");
      return;
    }
    if (postingType === "instore" && !formData.storeName.trim()) {
      alert("Please enter a store name");
      return;
    }
    if (!formData.category) {
      alert("Please select a category");
      return;
    }
    if (!formData.description.trim()) {
      alert("Please enter a description");
      return;
    }
    if (!formData.price.trim()) {
      alert("Please enter a price");
      return;
    }
    if (jobType === "fixed" && !formData.estimatedDuration.trim()) {
      alert("Please enter estimated duration");
      return;
    }
    if (!formData.location.trim()) {
      alert("Please enter a location");
      return;
    }
    if (!formData.date) {
      alert("Please select a date");
      return;
    }
    if (photos.length < 3) {
      alert("Please upload at least 3 photos");
      return;
    }
    if (formData.skills.length === 0) {
      alert("Please add at least one skill");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user data for poster name (reads Flutter `full_name` via mapper)
      const profileRow = await getUserData(user.uid);
      const posterName = resolveProfileDisplayName(user, profileRow);

      // Upload photos
      const photoUrls = await uploadPhotos(photos, user.uid);

      const lat = selectedMapPoint?.lat ?? 0;
      const lng = selectedMapPoint?.lng ?? 0;

      // Create job data - only include fields that have values
      const jobData: any = {
        jobType,
        completionStatus: "open" as const,
        proposalAcceptance: "open" as const,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        price: parseFloat(formData.price.replace(/[^0-9.]/g, "")),
        lat,
        lng,
        address: formData.location.trim(),
        jobDate: formData.date,
        urgency: formData.urgency,
        posterType: postingType,
        posterName: postingType === "company" 
          ? formData.companyName.trim() 
          : postingType === "instore"
          ? formData.storeName.trim()
          : postingType === "individual" && formData.individualName.trim()
          ? formData.individualName.trim()
          : posterName,
        photos: photoUrls,
        skills: formData.skills,
        tags: formData.skills,
      };

      // Only add job type specific fields if they have values
      if (jobType === "fixed") {
        jobData.fixedPrice = parseFloat(formData.price.replace(/[^0-9.]/g, ""));
        if (formData.estimatedDuration) {
          jobData.estimatedDuration = parseInt(formData.estimatedDuration.replace(/[^0-9]/g, ""));
        }
      } else if (jobType === "hourly") {
        jobData.hourlyRate = parseFloat(formData.price.replace(/[^0-9.]/g, ""));
        if (formData.timeFlexibility) {
          jobData.timeFlexibility = formData.timeFlexibility;
        }
        if (formData.startTime) {
          jobData.jobStartTime = formData.startTime;
        }
        if (formData.endTime) {
          jobData.jobEndTime = formData.endTime;
        }
      }

      // Only add optional fields if they have values
      if (formData.additionalLocationNotes.trim()) {
        jobData.additionalLocationNotes = formData.additionalLocationNotes.trim();
      }

      await createJob(user.uid, jobData);

      if (editingDraftId) {
        try {
          await deleteJobDraft(user.uid, editingDraftId);
        } catch (delErr) {
          console.warn("Could not remove job draft after post:", delErr);
        }
        setEditingDraftId(null);
      }

      setIsPostSuccessModalOpen(true);
    } catch (error: any) {
      console.error("Error posting job:", error);
      alert(error.message || "Failed to post job. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-darkBlue-003">
        <div className="mx-auto max-w-[67rem] bg-transparent dark:bg-darkBlue-003">
        {/* Top Tabs */}
        <div className="mb-6 flex justify-between gap-3">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "jobs"
                ? "bg-gray-100 text-gray-900 shadow-sm dark:bg-darkBlue-343 dark:text-white dark:ring-1 dark:ring-white/25"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-darkBlue-203 dark:text-white/70 dark:hover:bg-darkBlue-343"
            }`}
          >
            Job / Proposals
          </button>
          <button
            onClick={() => setActiveTab("drafts")}
            className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "drafts"
                ? "bg-gray-100 text-gray-900 shadow-sm dark:bg-darkBlue-343 dark:text-white dark:ring-1 dark:ring-white/25"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-darkBlue-203 dark:text-white/70 dark:hover:bg-darkBlue-343"
            }`}
          >
            Drafts
          </button>
        </div>

        {activeTab === "drafts" ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-darkBlue-013">
            {!user ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sign in to view and manage job drafts stored in Firestore.
              </p>
            ) : draftsLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading drafts…
              </p>
            ) : drafts.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No drafts yet. Open <strong>Job / Proposals</strong> and click{" "}
                <strong>Save draft</strong> to store your progress.
              </p>
            ) : (
              <ul className="space-y-3">
                {drafts.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-col gap-3 rounded-lg border border-gray-100 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900 dark:text-white">
                        {d.form.title.trim() || "Untitled draft"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Updated {new Date(d.updatedAtMs).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => applyDraftToForm(d)}
                        className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                      >
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteDraft(d.id)}
                        disabled={deletingDraftId === d.id}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-darkBlue-203"
                      >
                        {deletingDraftId === d.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Type Section */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/15 dark:bg-darkBlue-013">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Job Type</h2>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setJobType("fixed")}
                className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-colors border-2 ${
                  jobType === "fixed"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400"
                    : "bg-gray-50 dark:bg-darkBlue-203 border-transparent text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-darkBlue-343"
                }`}
              >
                Fixed Rate
              </button>
              <button
                type="button"
                onClick={() => setJobType("hourly")}
                className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-colors border-2 ${
                  jobType === "hourly"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400"
                    : "bg-gray-50 dark:bg-darkBlue-203 border-transparent text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-darkBlue-343"
                }`}
              >
                Hourly Rate
              </button>
            </div>
          </div>

          {/* Job Details Section */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/15 dark:bg-darkBlue-013">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Job Details</h2>
            <div className="space-y-6">
              {/* Job Title */}
              <div data-field="title">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <div className="relative" ref={titleDropdownRef}>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      setShowTitleSuggestions(true);
                      clearError("title");
                    }}
                    onFocus={() => setShowTitleSuggestions(true)}
                    onPointerDown={(e) =>
                      acceptGhostOnTouchTap(e, titleGhost, (full) => {
                        setFormData({ ...formData, title: full });
                        setShowTitleSuggestions(false);
                        clearError("title");
                      })
                    }
                    onKeyDown={(e) =>
                      acceptGhostOnTab(e, titleGhost, (full) => {
                        setFormData({ ...formData, title: full });
                        setShowTitleSuggestions(false);
                        clearError("title");
                      })
                    }
                    placeholder="e.g. Garden Maintenance"
                    className={`w-full px-4 py-3 border rounded-[16px] focus:outline-none focus:ring-2 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white ${
                      errors.title
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:ring-red-500"
                    }`}
                    required
                  />
                  <GhostOverlay value={formData.title} tail={titleGhost?.tail ?? ""} />
                  {showTitleSuggestions && (
                    <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-darkBlue-203">
                      <div className="border-b border-gray-100 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        Suggested job titles ({filteredTitleSuggestions.length})
                      </div>
                      <div className="max-h-56 overflow-y-auto p-2">
                        {filteredTitleSuggestions.length > 0 ? (
                          filteredTitleSuggestions.map((title) => (
                            <button
                              key={title}
                              type="button"
                              onClick={() => selectJobTitleSuggestion(title)}
                              className="mb-1 w-full rounded-lg border border-gray-100 px-3 py-2 text-left text-sm text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-400/40 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                            >
                              {title}
                            </button>
                          ))
                        ) : (
                          <p className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
                            No matching job titles found.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                )}
              </div>

              {/* Job Type (Individual/Company/In Store) */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Job Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPostingType("individual")}
                    className={`flex-1 px-4 py-2.5 rounded-[16px] text-sm font-medium transition-colors ${
                      postingType === "individual"
                        ? "bg-red-500 text-white font-semibold"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343"
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostingType("company")}
                    className={`flex-1 px-4 py-2.5 rounded-[16px] text-sm font-medium transition-colors ${
                      postingType === "company"
                        ? "bg-red-500 text-white font-semibold"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343"
                    }`}
                  >
                    Company
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostingType("instore")}
                    className={`flex-1 px-4 py-2.5 rounded-[16px] text-sm font-medium transition-colors ${
                      postingType === "instore"
                        ? "bg-red-500 text-white font-semibold"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343"
                    }`}
                  >
                    In Store
                  </button>
                </div>
              </div>

              {/* Individual Name (if Individual selected) */}
              {postingType === "individual" && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Individual Name
                  </label>
                  <input
                    type="text"
                    value={formData.individualName}
                    readOnly
                    placeholder="e.g. Jawad Kamil"
                    className="w-full cursor-not-allowed rounded-[16px] border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 dark:border-white/20 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white"
                  />
                </div>
              )}

              {/* Company Name (if Company selected) */}
              {postingType === "company" && (
                <div data-field="companyName">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 100) {
                          setFormData({ ...formData, companyName: value });
                          clearError("companyName");
                        }
                      }}
                      placeholder="e.g. ABC Corporation, XYZ Ltd."
                      className={`w-full px-4 py-3 border rounded-[16px] focus:outline-none focus:ring-2 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white pr-16 ${
                        errors.companyName
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 dark:border-gray-600 focus:ring-red-500"
                      }`}
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                      {formData.companyName.length}/100
                    </span>
                  </div>
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-500">{errors.companyName}</p>
                  )}
                </div>
              )}

              {/* Store Name (if In Store selected) */}
              {postingType === "instore" && (
                <div data-field="storeName">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.storeName}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 100) {
                          setFormData({ ...formData, storeName: value });
                          clearError("storeName");
                        }
                      }}
                      placeholder="e.g. Walmart, Target, Best Buy"
                      className={`w-full px-4 py-3 border rounded-[16px] focus:outline-none focus:ring-2 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white pr-16 ${
                        errors.storeName
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 dark:border-gray-600 focus:ring-red-500"
                      }`}
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                      {formData.storeName.length}/100
                    </span>
                  </div>
                  {errors.storeName && (
                    <p className="mt-1 text-sm text-red-500">{errors.storeName}</p>
                  )}
                </div>
              )}

              {/* Category */}
              <div data-field="category">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      setFormData({ ...formData, category: e.target.value });
                      clearError("category");
                    }}
                    disabled={categoriesLoading}
                    className={`w-full px-4 py-3 border rounded-[16px] focus:outline-none focus:ring-2 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white appearance-none pr-10 ${
                      errors.category
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:ring-red-500"
                    }`}
                    required
                  >
                    {categoryOptions.map((option, idx) => (
                      <option key={`${idx}-${option.label}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-500">{errors.category}</p>
                )}
              </div>

              {/* Description */}
              <div data-field="description">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 1500) {
                        setFormData({ ...formData, description: value });
                        clearError("description");
                      }
                    }}
                    onKeyDown={(e) =>
                      acceptGhostOnTab(e, descriptionGhost, (full) => {
                        if (full.length <= 1500) {
                          setFormData({ ...formData, description: full });
                          clearError("description");
                        }
                      })
                    }
                    onPointerDown={(e) =>
                      acceptGhostOnTouchTap(e, descriptionGhost, (full) => {
                        if (full.length <= 1500) {
                          setFormData({ ...formData, description: full });
                          clearError("description");
                        }
                      })
                    }
                    placeholder="Describe task in detail"
                    rows={6}
                    className={`w-full px-4 py-3 border rounded-[16px] focus:outline-none focus:ring-2 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white resize-none pr-16 ${
                      errors.description
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:ring-red-500"
                    }`}
                    required
                  />
                  <GhostOverlay
                    value={formData.description}
                    tail={descriptionGhost?.tail ?? ""}
                    multiline
                    paddingClassName="pl-4 pr-16 py-3"
                  />
                  <span className="absolute bottom-3 right-3 z-20 text-xs text-gray-500 dark:text-gray-400">
                    {formData.description.length}/1500
                  </span>
                </div>
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Price Section */}
          <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/15 dark:bg-darkBlue-013">
            {/* Fixed Rate Section */}
            {jobType === "fixed" && (
              <>
                <div data-field="price">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Price (Fixed Rate) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.price}
                      onChange={(e) => {
                        setFormData({ ...formData, price: e.target.value });
                        clearError("price");
                      }}
                      onKeyDown={(e) =>
                        acceptGhostOnTab(e, priceGhost, (full) => {
                          setFormData({ ...formData, price: full });
                          clearError("price");
                        })
                      }
                      onPointerDown={(e) =>
                        acceptGhostOnTouchTap(e, priceGhost, (full) => {
                          setFormData({ ...formData, price: full });
                          clearError("price");
                        })
                      }
                      placeholder="e.g. 100(USD)"
                      className={`w-full px-4 py-3 border rounded-[16px] focus:outline-none focus:ring-2 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white ${
                        errors.price
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 dark:border-gray-600 focus:ring-red-500"
                      }`}
                      required
                    />
                    <GhostOverlay value={formData.price} tail={priceGhost?.tail ?? ""} />
                  </div>
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                  )}
                </div>
                <div data-field="estimatedDuration">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Estimated Duration <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.estimatedDuration}
                      onChange={(e) => {
                        setFormData({ ...formData, estimatedDuration: e.target.value });
                        clearError("estimatedDuration");
                      }}
                      onKeyDown={(e) =>
                        acceptGhostOnTab(e, durationGhost, (full) => {
                          setFormData({ ...formData, estimatedDuration: full });
                          clearError("estimatedDuration");
                        })
                      }
                      onPointerDown={(e) =>
                        acceptGhostOnTouchTap(e, durationGhost, (full) => {
                          setFormData({ ...formData, estimatedDuration: full });
                          clearError("estimatedDuration");
                        })
                      }
                      placeholder="e.g. 2(hours)"
                      className={`w-full px-4 py-3 border rounded-[16px] focus:outline-none focus:ring-2 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white ${
                        errors.estimatedDuration
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 dark:border-gray-600 focus:ring-red-500"
                      }`}
                      required
                    />
                    <GhostOverlay
                      value={formData.estimatedDuration}
                      tail={durationGhost?.tail ?? ""}
                    />
                  </div>
                  {errors.estimatedDuration && (
                    <p className="mt-1 text-sm text-red-500">{errors.estimatedDuration}</p>
                  )}
                </div>
              </>
            )}

            {/* Hourly Rate Section */}
            {jobType === "hourly" && (
              <>
                {/* Hourly Rate */}
                <div data-field="price">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Hourly Rate <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.price}
                      onChange={(e) => {
                        setFormData({ ...formData, price: e.target.value });
                        clearError("price");
                      }}
                      onKeyDown={(e) =>
                        acceptGhostOnTab(e, priceGhost, (full) => {
                          setFormData({ ...formData, price: full });
                          clearError("price");
                        })
                      }
                      onPointerDown={(e) =>
                        acceptGhostOnTouchTap(e, priceGhost, (full) => {
                          setFormData({ ...formData, price: full });
                          clearError("price");
                        })
                      }
                      placeholder="e.g. $25/hr"
                      className={`w-full px-4 py-3 pr-10 border rounded-[16px] focus:outline-none focus:ring-2 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white ${
                        errors.price
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 dark:border-gray-600 focus:ring-red-500"
                      }`}
                      required
                    />
                    <GhostOverlay
                      value={formData.price}
                      tail={priceGhost?.tail ?? ""}
                      paddingClassName="pl-4 pr-10 py-3"
                    />
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 z-20 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-white" />
                  </div>
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                  )}
                </div>

                {/* Time Flexibility */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Time Flexibility
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.timeFlexibility}
                      onChange={(e) => setFormData({ ...formData, timeFlexibility: e.target.value })}
                      placeholder="Time Flexibility"
                      className="w-full px-4 py-3 pr-10 border border-gray-300 dark:border-white/20 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white"
                    />
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-white" />
                  </div>
                </div>

                {/* Start/End Time */}
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Start
                    </label>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      End
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <div
                        onClick={() => openTimePicker("startTime")}
                        className="flex w-full cursor-pointer items-center rounded-[16px] border-0 bg-gray-100 px-4 py-3 pl-12 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-darkBlue-003 dark:text-white dark:hover:bg-darkBlue-203"
                      >
                        {formData.startTime
                          ? (() => {
                              const [hours, minutes] = formData.startTime.split(":").map(Number);
                              const hour12 = hours % 12 || 12;
                              const ampm = hours >= 12 ? "PM" : "AM";
                              return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
                            })()
                          : "12:00 PM"}
                      </div>
                      <Clock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-white" />
                    </div>
                    <div className="flex-1 relative">
                      <div
                        onClick={() => openTimePicker("endTime")}
                        className="flex w-full cursor-pointer items-center rounded-[16px] border-0 bg-gray-100 px-4 py-3 pl-12 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-darkBlue-003 dark:text-white dark:hover:bg-darkBlue-203"
                      >
                        {formData.endTime
                          ? (() => {
                              const [hours, minutes] = formData.endTime.split(":").map(Number);
                              const hour12 = hours % 12 || 12;
                              const ampm = hours >= 12 ? "PM" : "AM";
                              return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
                            })()
                          : "12:00 PM"}
                      </div>
                      <Clock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-white" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Location and Timing Section */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/15 dark:bg-darkBlue-013">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Location and Timing</h2>
            <div className="space-y-6">
              {/* Location */}
              <div data-field="location">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.location}
                    readOnly
                    placeholder="Your Address"
                    className={`w-full cursor-default px-4 py-3 pr-24 border rounded-[16px] focus:outline-none focus:ring-2 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white ${
                      errors.location
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:ring-red-500"
                    }`}
                    required
                  />
                  <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                    {formData.location ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, location: "" }));
                          setSelectedMapAddress("");
                          clearError("location");
                        }}
                        className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-gray-400 bg-white text-[12px] font-semibold leading-none text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-500 dark:bg-darkBlue-013 dark:text-white"
                        aria-label="Clear location"
                      >
                        ×
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={openLocationPicker}
                      disabled={isFetchingLocation}
                      className="flex h-[24px] w-[28px] items-center justify-center rounded-md bg-transparent text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white dark:hover:bg-darkBlue-203"
                      aria-label="Open location picker"
                    >
                      {isFetchingLocation ? (
                        <div className="h-3.5 w-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <MapIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                {errors.location && (
                  <p className="mt-1 text-sm text-red-500">{errors.location}</p>
                )}
              </div>

              {/* Additional Location Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Additional Location Notes
                </label>
                <div className="relative">
                  <textarea
                    value={formData.additionalLocationNotes}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 500) {
                        setFormData({ ...formData, additionalLocationNotes: value });
                      }
                    }}
                    placeholder="Additional Location Notes"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-white/20 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white resize-none pr-16"
                  />
                  <span className="absolute bottom-3 right-3 text-xs text-gray-500 dark:text-gray-400">
                    {formData.additionalLocationNotes.length}/500
                  </span>
                </div>
              </div>

              {/* Date */}
              <div data-field="date">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div
                    onClick={() => {
                      openDatePicker();
                      clearError("date");
                    }}
                    className={`w-full px-4 py-3 pl-12 border rounded-[16px] focus:outline-none focus:ring-2 dark:bg-darkBlue-003 dark:text-white dark:placeholder:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-darkBlue-203 transition-colors flex items-center ${
                      errors.date
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:ring-red-500"
                    }`}
                  >
                    {formData.date
                      ? (() => {
                          const date = new Date(formData.date);
                          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                          return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
                        })()
                      : "Please select a date"}
                  </div>
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-white" />
                </div>
                {errors.date && (
                  <p className="mt-1 text-sm text-red-500">{errors.date}</p>
                )}
              </div>

              {/* Urgency Level */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Urgency Level <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, urgency: "low" })}
                    className={`flex-1 px-4 py-2.5 rounded-[16px] text-sm font-medium transition-colors ${
                      formData.urgency === "low"
                        ? "bg-yellow-400 text-yellow-800"
                        : "bg-gray-200 dark:bg-darkBlue-203 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-darkBlue-343"
                    }`}
                  >
                    Low
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, urgency: "normal" })}
                    className={`flex-1 px-4 py-2.5 rounded-[16px] text-sm font-medium transition-colors ${
                      formData.urgency === "normal"
                        ? "bg-green-400 text-white"
                        : "bg-gray-200 dark:bg-darkBlue-203 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-darkBlue-343"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, urgency: "urgent" })}
                    className={`flex-1 px-4 py-2.5 rounded-[16px] text-sm font-medium transition-colors ${
                      formData.urgency === "urgent"
                        ? "bg-red-500 text-white"
                        : "bg-gray-200 dark:bg-darkBlue-203 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-darkBlue-343"
                    }`}
                  >
                    Urgent
                  </button>
                </div>
              </div>

              {/* Skill Required */}
              <div data-field="skills">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Skill Required <span className="text-red-500">*</span>
                </label>
                <div className="relative" ref={skillsDropdownRef}>
                  <div
                    className={`flex min-h-[54px] w-full items-stretch overflow-hidden rounded-full border bg-white dark:rounded-2xl dark:bg-darkBlue-003 ${
                      errors.skills
                        ? "border-red-500"
                        : "border-black dark:border-white"
                    }`}
                  >
                    <div className="relative min-h-[54px] min-w-0 flex-1">
                      <input
                        type="text"
                        value={formData.skillInput}
                        onChange={(e) => {
                          setFormData({ ...formData, skillInput: e.target.value });
                          setShowSkillSuggestions(true);
                          if (formData.skills.length > 0) {
                            clearError("skills");
                          }
                        }}
                        onFocus={() => setShowSkillSuggestions(true)}
                        onKeyDown={(e) => {
                          acceptGhostOnTab(e, skillGhost, (full) =>
                            setFormData({ ...formData, skillInput: full })
                          );
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill();
                            clearError("skills");
                          }
                        }}
                        onPointerDown={(e) =>
                          acceptGhostOnTouchTap(e, skillGhost, (full) =>
                            setFormData({ ...formData, skillInput: full })
                          )
                        }
                        placeholder="Enter a skill (e.g. Developer)"
                        aria-label="Add skill"
                        className="h-full min-h-[54px] w-full border-0 bg-transparent px-4 py-3 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-white/80"
                      />
                      <GhostOverlay
                        value={formData.skillInput}
                        tail={skillGhost?.tail ?? ""}
                        paddingClassName="px-4 py-3"
                        radiusClassName="rounded-full dark:rounded-2xl"
                        className="text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        addSkill();
                        clearError("skills");
                      }}
                      className={`flex h-auto min-h-[54px] w-12 shrink-0 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 ${
                        errors.skills
                          ? "text-red-600 hover:bg-red-500/10 dark:text-red-300"
                          : "text-gray-900 hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                      }`}
                      aria-label="Add skill"
                    >
                      <Plus className="h-6 w-6" strokeWidth={2} />
                    </button>
                  </div>

                  {showSkillSuggestions && (
                    <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-darkBlue-203">
                      <div className="border-b border-gray-100 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                        Showing {filteredSkillSuggestions.length} matches from {skillCatalog.length} skills
                      </div>
                      <div className="max-h-56 overflow-y-auto p-2">
                        {filteredSkillSuggestions.length > 0 ? (
                          filteredSkillSuggestions.map((suggestedSkill) => (
                            <button
                              key={suggestedSkill}
                              type="button"
                              onClick={() => {
                                addSuggestedSkill(suggestedSkill);
                                clearError("skills");
                              }}
                              className="mb-1 w-full rounded-lg border border-gray-100 px-3 py-2 text-left text-sm text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-gray-700 dark:text-gray-200 dark:hover:border-red-400/40 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                            >
                              {suggestedSkill}
                            </button>
                          ))
                        ) : (
                          <p className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
                            No matching skills found.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {errors.skills && (
                  <p className="mt-1 text-sm text-red-500">{errors.skills}</p>
                )}
                {formData.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-theme-accent8 px-[13px] py-2.5 text-sm font-semibold text-theme-accent3 dark:bg-darkBlue-203 dark:text-white"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="rounded p-0.5 text-theme-accent3 hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Photos Section */}
          <div data-field="photos" className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/15 dark:bg-darkBlue-013">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                Photos (at least 3) <span className="text-red-500">*</span>
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {photos.length}/5 Photos
              </span>
            </div>
            {errors.photos && (
              <p className="mb-2 text-sm text-red-500">{errors.photos}</p>
            )}
            <div className="border-2 border-dashed border-black dark:border-white rounded-[16px] p-8 text-center">
              {photoPreviews.length > 0 ? (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Camera className="h-12 w-12 text-gray-400 mb-2" />
                  <span className="text-gray-600 dark:text-gray-400 mb-1">Add Photo</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-gray-100 dark:bg-darkBlue-203 text-gray-700 dark:text-white rounded-[16px] hover:bg-gray-200 dark:hover:bg-darkBlue-343 transition-colors"
              >
                {photoPreviews.length > 0 ? "Add More Photos" : "Select Photos"}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Add photos to help providers better understand your task
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pt-6">
            <button
              type="button"
              onClick={handleCancelClick}
              className="min-w-[132px] rounded-[16px] bg-[#C8C8C8] px-8 py-3 font-medium text-black shadow-[0_4px_4px_rgba(0,0,0,0.4)] transition-colors hover:bg-[#bbbbbb]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!hasTypedSomethingInPostJobForm}
              onClick={handlePreviewClick}
              className={`min-w-[132px] rounded-[16px] px-8 py-3 font-medium shadow-[0_4px_4px_rgba(0,0,0,0.4)] transition-colors disabled:cursor-not-allowed disabled:shadow-none ${
                hasTypedSomethingInPostJobForm
                  ? "bg-theme-accent8 text-theme-accent11 hover:bg-theme-accent17 dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343"
                  : "bg-[#8E8E93] text-white/80 dark:bg-[#5C5C5E] dark:text-white/55"
              }`}
            >
              Preview
            </button>
          </div>

          {/* Error Banner */}
          {showErrorBanner && (
            <div className="mt-4 bg-red-500 text-white rounded-lg p-4 flex items-center gap-3">
              <Info className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">Please fill all required fields</p>
            </div>
          )}
        </form>
        )}
      </div>

      {/* Time Picker Modal */}
      {isTimePickerOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkBlue-013 rounded-lg shadow-xl max-w-md w-full p-6">
            {/* Modal Title */}
            <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white mb-6">
              SELECT TIME
            </h3>

            <div className="flex gap-6 mb-6">
              {/* Digital Time Display (Left Side) */}
              <div className="flex-1">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div
                    onClick={() => handleMinuteClick()}
                    className={`px-4 py-3 rounded-lg text-3xl font-bold cursor-pointer transition-colors ${
                      true // Hour is selected
                        ? "bg-blue-100 dark:bg-blue-900/30 text-gray-900 dark:text-white"
                        : "bg-gray-100 dark:bg-darkBlue-013 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {pickerHour}
                  </div>
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">:</span>
                  <div
                    onClick={() => handleMinuteClick()}
                    className={`px-4 py-3 rounded-lg text-3xl font-bold cursor-pointer transition-colors ${
                      false // Minute is not selected
                        ? "bg-blue-100 dark:bg-blue-900/30 text-gray-900 dark:text-white"
                        : "bg-gray-100 dark:bg-darkBlue-013 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {pickerMinute.toString().padStart(2, "0")}
                  </div>
                </div>

                {/* AM/PM Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setPickerAmPm("AM")}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      pickerAmPm === "AM"
                        ? "bg-white dark:bg-darkBlue-013 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        : "bg-white dark:bg-darkBlue-013 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-darkBlue-203"
                    }`}
                  >
                    AM
                  </button>
                  <button
                    onClick={() => setPickerAmPm("PM")}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pickerAmPm === "PM"
                        ? "bg-red-500 text-white"
                        : "bg-white dark:bg-darkBlue-013 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-darkBlue-203"
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>

              {/* Analog Clock Face (Right Side) */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-48 h-48">
                  {/* Clock Circle */}
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="2"
                      className="dark:stroke-gray-600"
                    />
                    {/* Clock Numbers */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
                      const angle = ((num - 3) * 30) * (Math.PI / 180);
                      const x = 100 + 70 * Math.cos(angle);
                      const y = 100 + 70 * Math.sin(angle);
                      const isSelected = num === pickerHour;
                      return (
                        <g key={num}>
                          {isSelected && (
                            <circle
                              cx={x}
                              cy={y}
                              r="18"
                              fill="#ef4444"
                              className="cursor-pointer"
                              onClick={() => handleClockClick(num)}
                            />
                          )}
                          <text
                            x={x}
                            y={y + 5}
                            textAnchor="middle"
                            fontSize="16"
                            fontWeight={isSelected ? "bold" : "normal"}
                            fill={isSelected ? "white" : "#374151"}
                            className="dark:fill-gray-300 cursor-pointer"
                            onClick={() => handleClockClick(num)}
                          >
                            {num}
                          </text>
                        </g>
                      );
                    })}
                    {/* Clock Hand */}
                    <line
                      x1="100"
                      y1="100"
                      x2={100 + 50 * Math.cos(((pickerHour - 3) * 30) * (Math.PI / 180))}
                      y2={100 + 50 * Math.sin(((pickerHour - 3) * 30) * (Math.PI / 180))}
                      stroke="#ef4444"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* Center dot */}
                    <circle cx="100" cy="100" r="4" fill="#ef4444" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between">
              {/* Keyboard Icon */}
              <button
                onClick={() => {
                  // Toggle keyboard input mode (placeholder for future implementation)
                }}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                aria-label="Keyboard input"
              >
                <Keyboard className="h-5 w-5" />
              </button>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeTimePicker}
                  className="px-6 py-2 bg-gray-200 dark:bg-darkBlue-013 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-darkBlue-203 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmTimePicker}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkBlue-013 rounded-lg shadow-xl max-w-2xl w-full overflow-hidden flex">
            {/* Left Panel - Selected Date Display (Blue) */}
            <div className="bg-blue-500 text-white p-8 flex flex-col justify-between min-w-[200px]">
              <div>
                <h3 className="text-2xl font-bold mb-2">
                  {pickerDate ? formatDateDisplay(pickerDate) : "Select Date"}
                </h3>
                {pickerDate && (
                  <p className="text-blue-100 text-sm">
                    {pickerDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  // Toggle edit mode (placeholder for keyboard input)
                }}
                className="text-blue-100 hover:text-white transition-colors"
                aria-label="Edit date"
              >
                <Edit className="h-5 w-5" />
              </button>
            </div>

            {/* Right Panel - Calendar */}
            <div className="flex-1 p-6">
              {/* Month/Year Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateMonth("prev")}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-darkBlue-203 rounded-lg transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getMonthName(pickerMonth)} {pickerYear}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
                <button
                  onClick={() => navigateMonth("next")}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-darkBlue-203 rounded-lg transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="mb-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                    <div
                      key={index}
                      className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: getFirstDayOfMonth(pickerMonth, pickerYear) }).map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: getDaysInMonth(pickerMonth, pickerYear) }, (_, i) => i + 1).map((day) => {
                    const currentDate = new Date(pickerYear, pickerMonth, day);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    currentDate.setHours(0, 0, 0, 0);
                    const isPastDate = currentDate < today;
                    
                    const isSelected =
                      pickerDate &&
                      pickerDate.getDate() === day &&
                      pickerDate.getMonth() === pickerMonth &&
                      pickerDate.getFullYear() === pickerYear;
                    const isToday =
                      today.getDate() === day &&
                      today.getMonth() === pickerMonth &&
                      today.getFullYear() === pickerYear;

                    return (
                      <button
                        key={day}
                        onClick={() => !isPastDate && selectDate(day)}
                        disabled={isPastDate}
                        className={`aspect-square flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${
                          isPastDate
                            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"
                            : isSelected
                            ? "bg-blue-500 text-white"
                            : isToday
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            : "hover:bg-gray-100 dark:hover:bg-darkBlue-203 text-gray-900 dark:text-white"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeDatePicker}
                  className="px-6 py-2 bg-gray-200 dark:bg-darkBlue-013 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-darkBlue-203 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmDatePicker}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Preview */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55">
          <div className="h-full w-full overflow-y-auto bg-white shadow-xl dark:bg-darkBlue-013">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-darkBlue-013 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {formData.title || "Preview"}
              </h2>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-darkBlue-203 rounded-lg transition-colors"
                aria-label="Close preview"
              >
                <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
              {/* Description */}
              {formData.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Description
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {formData.description}
                  </p>
                </div>
              )}

              {/* Task Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Task Details
                </h3>
                <div className="space-y-2 text-sm">
                  {formData.category && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Category: </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {categoryOptions.find((opt) => opt.value === formData.category)?.label || formData.category}
                      </span>
                    </div>
                  )}
                  
                  {formData.price && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Budget: </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        ${formData.price.replace(/[^0-9.]/g, "")} {jobType === "fixed" ? "Fixed Rate" : "Hourly Rate"}
                      </span>
                    </div>
                  )}

                  {formData.date && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Job posted: </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {(() => {
                          const date = new Date(formData.date);
                          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                          return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
                        })()}
                      </span>
                    </div>
                  )}

                  {formData.location && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Location: </span>
                      <span className="text-gray-600 dark:text-gray-400">{formData.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills Required */}
              {formData.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Skills Required:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-darkBlue-013 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Images */}
              {photoPreviews.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Images
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {photoPreviews.slice(0, 3).map((preview, index) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Other Details
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {formData.timeFlexibility && jobType === "hourly" && (
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span>Flexibility: {formData.timeFlexibility}</span>
                    </li>
                  )}
                  {formData.startTime && formData.endTime && jobType === "hourly" && (
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span>
                        Time: {(() => {
                          const [startH, startM] = formData.startTime.split(":").map(Number);
                          const [endH, endM] = formData.endTime.split(":").map(Number);
                          const startAmPm = startH >= 12 ? "PM" : "AM";
                          const endAmPm = endH >= 12 ? "PM" : "AM";
                          const startHour12 = startH % 12 || 12;
                          const endHour12 = endH % 12 || 12;
                          return `${startHour12}:${startM.toString().padStart(2, "0")} ${startAmPm} - ${endHour12}:${endM.toString().padStart(2, "0")} ${endAmPm}`;
                        })()}
                      </span>
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>Urgency level: {formData.urgency.charAt(0).toUpperCase() + formData.urgency.slice(1)}</span>
                  </li>
                  {postingType && (
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span>Posting Type: {postingType.charAt(0).toUpperCase() + postingType.slice(1)}</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Next Button */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    setIsTermsModalOpen(true);
                  }}
                  className="w-full px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Conditions Modal */}
      {isLocationPickerOpen ? (
        <div className="fixed inset-0 z-[195] bg-black/35">
          <div className="relative flex h-full w-full flex-col bg-white dark:bg-darkBlue-013">
            <div className="relative flex-1">
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
              ) : postJobLocationMapLoadError ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-600 dark:text-gray-300">
                  Google Maps failed to load. Please try again.
                </div>
              ) : !isPostJobLocationMapLoaded ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                </div>
              ) : (
                <>
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={selectedMapPoint ?? DEFAULT_POST_JOB_MAP_CENTER}
                    zoom={15}
                    onClick={(event) => {
                      const lat = event.latLng?.lat();
                      const lng = event.latLng?.lng();
                      if (typeof lat !== "number" || typeof lng !== "number") return;
                      const point = { lat, lng };
                      setSelectedMapPoint(point);
                      void resolveMapPointAddress(point);
                    }}
                    options={googleMapOptionsForStyle(pickerMapStyle)}
                  >
                    {selectedMapPoint ? (
                      <Marker
                        position={selectedMapPoint}
                        icon={googleSelectedMarkerIcon()}
                      />
                    ) : null}
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
              addressLine={selectedMapAddress}
              isResolving={isResolvingMapAddress}
              onCancel={() => setIsLocationPickerOpen(false)}
              onConfirm={() => {
                if (!selectedMapPoint) return;
                setFormData((prev) => ({
                  ...prev,
                  location: selectedMapAddress || prev.location,
                }));
                clearError("location");
                setIsLocationPickerOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}
      {isTermsModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkBlue-013 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Job Posting Terms & Conditions
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Complete</span>
                <button
                  onClick={() => {
                    setIsTermsModalOpen(false);
                    setTermsAccepted(false);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-darkBlue-203 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Important Notice */}
              <div className="rounded-lg border border-[#D94856]/25 bg-[#D94856]/8 p-4 flex gap-3 dark:border-[#D94856]/35 dark:bg-[#C43D4C]">
                <Info className="h-5 w-5 text-[#D94856] dark:text-white flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[#D94856] dark:text-white mb-1">Important Notice</h3>
                  <p className="text-sm text-gray-900 dark:text-white">
                    These terms and conditions are governed by Canadian and United States laws and comply with applicable provincial, state, and federal regulations in both countries. By using TaskZing, you agree to be bound by these terms.
                  </p>
                </div>
              </div>

              {/* Warning Box */}
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-orange-800 dark:text-orange-400">
                  Please scroll down and read through all terms and conditions before accepting.
                </p>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">1. Job Posting Requirements</h3>
                  <p>
                    All job postings must comply with Canadian employment laws and anti-discrimination legislation. Jobs must be legal, ethical, and not violate any provincial or federal regulations. TaskZing reserves the right to reject or remove inappropriate job postings.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">2. Accurate Job Description</h3>
                  <p>
                    Job descriptions must accurately reflect the work required, including scope, timeline, and compensation. Misleading job postings will be removed and may result in account suspension. All job postings must include clear deliverables and expectations.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">3. Fair Compensation</h3>
                  <p>
                    All job postings must offer fair compensation that meets or exceeds applicable minimum wage laws in the relevant Canadian province or territory. Compensation must be clearly stated and cannot be discriminatory.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">4. Intellectual Property</h3>
                  <p>
                    Job postings must respect intellectual property rights. Clients retain ownership of their intellectual property unless explicitly transferred through a separate agreement. TaskZing is not responsible for IP disputes between parties.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">5. Safety Requirements</h3>
                  <p>
                    Jobs involving physical work must comply with Canadian Occupational Health and Safety regulations. Clients must provide safe working conditions and necessary safety equipment as required by law.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">6. Payment Terms</h3>
                  <p>
                    Payment terms must be clearly specified in job postings. All payments must comply with Canadian tax laws, including GST/HST requirements where applicable. TaskZing facilitates payments but is not responsible for payment disputes.
                  </p>
                </div>

                <div className="text-center text-gray-500 dark:text-gray-400 mt-6">
                  <p className="font-semibold">TaskZing Inc.</p>
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="flex items-start gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  id="terms-checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-5 w-5 text-red-500 border-gray-300 rounded focus:ring-red-500"
                />
                <label
                  htmlFor="terms-checkbox"
                  className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  I have read and agree to these terms and conditions
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-4">
              <button
                onClick={() => {
                  setIsTermsModalOpen(false);
                  setTermsAccepted(false);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-darkBlue-013 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-darkBlue-203 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={async (e) => {
                  if (!termsAccepted) {
                    alert("Please accept the terms and conditions to continue.");
                    return;
                  }
                  
                  setIsTermsModalOpen(false);
                  
                  // Submit immediately after terms acceptance.
                  const syntheticEvent = {
                    preventDefault: () => {},
                    target: e.currentTarget,
                    currentTarget: e.currentTarget,
                  } as unknown as React.FormEvent<HTMLFormElement>;
                  
                  await handleSubmit(syntheticEvent);
                }}
                disabled={!termsAccepted || isSubmitting}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-darkBlue-013 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-darkBlue-203 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Posting..." : "Accept"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isDraftValidationModalOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/55 p-4">
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
      )}
      {isSaveDraftModalOpen ? (
        <div className="fixed inset-0 z-[185] flex items-center justify-center bg-black/55 p-4">
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
              <div className="mb-4 mt-3 text-red-500">
                <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" aria-hidden>
                  <path d="M5 7h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-black dark:text-white">Save Job Post?</h3>
              <p className="mt-2 text-sm text-black/60 dark:text-white/70">
                You can save job post to send later from your drafts.
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
      {isPostSuccessModalOpen ? (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-blue-200 bg-white shadow-2xl dark:border-blue-400/30 dark:bg-darkBlue-013">
            <div className="border-b border-blue-100 px-5 py-4 dark:border-blue-400/20">
              <h3 className="text-lg font-bold text-[#1E3A8A] dark:text-blue-300">Job posted successfully</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-700 dark:text-gray-200">
                Your job has been posted. Press OK to refresh this page.
              </p>
            </div>
            <div className="flex justify-end border-t border-gray-100 px-5 py-3 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsPostSuccessModalOpen(false);
                  window.location.reload();
                }}
                className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] dark:bg-darkBlue-343 dark:hover:bg-darkBlue-203"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </DashboardLayout>
  );
}
