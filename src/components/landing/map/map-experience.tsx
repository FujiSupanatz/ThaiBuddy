"use client";

import { useEffect, useRef, useState } from "react";
import type { MapAction, UserLocation } from "../types";

type Category = "cafe" | "museum" | "library" | "toilet";
type Vibe = "cozy" | "work" | "social" | "modern";
type Gimmick = "" | "hidden gem" | "pet friendly" | "instagrammable";
type ApiStatus =
  | "loading-config"
  | "loading-script"
  | "connected"
  | "setup-required"
  | "auth-error"
  | "load-error";

type DebugEntry = {
  id: number;
  text: string;
  isError: boolean;
};

type TravelInfo = {
  distanceText?: string;
  distanceValue?: number;
  durationText?: string;
};

type PlaceResult = {
  id: string;
  name: string;
  vicinity: string;
  rating?: number;
  position: { lat: number; lng: number };
  rawPlace: any;
  travelInfo?: TravelInfo;
};

type Coordinates = {
  lat: number;
  lng: number;
};

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
    __thaiBuddyMapsInit?: () => void;
  }
}

const DEFAULT_CENTER: Coordinates = { lat: 13.7563, lng: 100.5018 };
const SCRIPT_ID = "thai-buddy-google-maps-script";

const CATEGORY_OPTIONS: Array<{ id: Category; label: string }> = [
  { id: "cafe", label: "Cafe" },
  { id: "museum", label: "Art Cafe" },
  { id: "library", label: "Library" },
  { id: "toilet", label: "Restroom" },
];

const VIBE_OPTIONS: Array<{ id: Vibe; label: string }> = [
  { id: "cozy", label: "Cozy" },
  { id: "work", label: "Quiet/Work" },
  { id: "social", label: "Social" },
  { id: "modern", label: "Modern" },
];

const GIMMICK_OPTIONS: Array<{ id: Gimmick; label: string }> = [
  { id: "hidden gem", label: "Hidden Gem" },
  { id: "pet friendly", label: "Pet Friendly" },
  { id: "instagrammable", label: "Instagrammable" },
  { id: "", label: "None" },
];

interface MapExperienceProps {
  initialLocation: UserLocation | null;
  initialLocationDraft: string;
  mapAction?: MapAction | null;
  onLocationChange: (location: UserLocation) => void;
  onLocationDraftChange: (value: string) => void;
}

export default function MapExperience({
  initialLocation,
  initialLocationDraft,
  mapAction,
  onLocationChange,
  onLocationDraftChange,
}: MapExperienceProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const mapRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const resultMarkersRef = useRef<any[]>([]);

  const [apiStatus, setApiStatus] = useState<ApiStatus>("loading-config");
  const [apiWarning, setApiWarning] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [startLocation, setStartLocation] = useState(
    initialLocationDraft || initialLocation?.label || "",
  );
  const [userPos, setUserPos] = useState<Coordinates>({
    lat: initialLocation?.lat ?? DEFAULT_CENTER.lat,
    lng: initialLocation?.lng ?? DEFAULT_CENTER.lng,
  });
  const [selectedCategory, setSelectedCategory] = useState<Category>("cafe");
  const [selectedVibe, setSelectedVibe] = useState<Vibe>("cozy");
  const [selectedGimmick, setSelectedGimmick] = useState<Gimmick>("");
  const [distanceKm, setDistanceKm] = useState(5);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [emptyMessage, setEmptyMessage] = useState("");
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([]);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const reportLocationChange = (location: UserLocation) => {
    onLocationChange(location);
  };

  const logDebug = (text: string, isError = false) => {
    setDebugEntries((current) => [
      ...current.slice(-39),
      { id: Date.now() + Math.random(), text, isError },
    ]);
  };

  const clearResultMarkers = () => {
    for (const marker of resultMarkersRef.current) {
      marker.setMap(null);
    }
    resultMarkersRef.current = [];
  };

  const updateUserMarker = (position: Coordinates) => {
    const googleMaps = window.google?.maps;
    if (!googleMaps || !mapRef.current) {
      return;
    }

    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = new googleMaps.Marker({
      position,
      map: mapRef.current,
      icon: {
        path: googleMaps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#3b82f6",
        fillOpacity: 1,
        strokeWeight: 4,
        strokeColor: "white",
      },
    });
  };

  const renderResults = (places: PlaceResult[]) => {
    const googleMaps = window.google?.maps;
    if (!googleMaps || !mapRef.current) {
      return;
    }

    clearResultMarkers();
    setResults(places);
    setEmptyMessage("");

    const bounds = new googleMaps.LatLngBounds();
    bounds.extend(userPos);

    resultMarkersRef.current = places.map((place, index) => {
      const marker = new googleMaps.Marker({
        position: place.position,
        map: mapRef.current,
        label: String(index + 1),
        animation: googleMaps.Animation.DROP,
      });

      bounds.extend(place.position);
      return marker;
    });

    if (places.length > 0) {
      mapRef.current.fitBounds(bounds);
    }
  };

  const showMessage = (message: string) => {
    clearResultMarkers();
    setResults([]);
    setEmptyMessage(message);
  };

  const processResults = (rawResults: any[]) => {
    const googleMaps = window.google?.maps;
    if (!googleMaps || !mapRef.current) {
      return;
    }

    const filteredResults = rawResults.slice(0, 8);
    const matrixService = new googleMaps.DistanceMatrixService();
    const destinations = filteredResults.map((place) => place.geometry.location);

    matrixService.getDistanceMatrix(
      {
        origins: [userPos],
        destinations,
        travelMode: googleMaps.TravelMode.WALKING,
        unitSystem: googleMaps.UnitSystem.METRIC,
      },
      (response: any, status: string) => {
        if (status !== "OK") {
          logDebug(`Distance Matrix error: ${status}`, true);

          renderResults(
            filteredResults.map((place: any) => ({
              id: place.place_id ?? `${place.name}-${Math.random()}`,
              name: place.name,
              vicinity: place.vicinity ?? "Unknown location",
              rating: place.rating,
              position: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              },
              rawPlace: place,
            })),
          );
          return;
        }

        logDebug("Distances calculated.");

        const distances = response.rows[0].elements;
        const places = filteredResults
          .map((place: any, index: number) => ({
            id: place.place_id ?? `${place.name}-${index}`,
            name: place.name,
            vicinity: place.vicinity ?? "Unknown location",
            rating: place.rating,
            position: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            },
            rawPlace: place,
            travelInfo: {
              distanceText: distances[index]?.distance?.text,
              distanceValue: distances[index]?.distance?.value,
              durationText: distances[index]?.duration?.text,
            },
          }))
          .sort(
            (left, right) =>
              (left.travelInfo?.distanceValue ?? Number.MAX_SAFE_INTEGER) -
              (right.travelInfo?.distanceValue ?? Number.MAX_SAFE_INTEGER),
          );

        renderResults(places);
      },
    );
  };

  const searchPlaces = () => {
    const googleMaps = window.google?.maps;
    if (!googleMaps || !placesServiceRef.current || !mapRef.current) {
      return;
    }

    clearResultMarkers();
    setResults([]);
    setEmptyMessage("");

    logDebug(`Searching ${selectedCategory}...`);

    const radius = distanceKm * 1000;
    const keywordParts: string[] = [];
    let searchType = "cafe";

    if (selectedCategory === "toilet") {
      keywordParts.push("public toilet restroom");
      searchType = "establishment";
    } else if (selectedCategory === "museum") {
      keywordParts.push("art gallery museum cafe");
    } else if (selectedCategory === "library") {
      keywordParts.push("library book quiet cafe");
    }

    if (selectedCategory !== "toilet") {
      keywordParts.push(selectedVibe);
    }

    if (selectedGimmick) {
      keywordParts.push(selectedGimmick);
    }

    placesServiceRef.current.nearbySearch(
      {
        location: userPos,
        radius,
        type: searchType,
        keyword: keywordParts.join(" ").trim(),
      },
      (rawResults: any[] | null, status: string) => {
        if (status === googleMaps.places.PlacesServiceStatus.OK && rawResults) {
          logDebug(`Found ${rawResults.length} matches.`);
          processResults(rawResults);
          return;
        }

        if (status === googleMaps.places.PlacesServiceStatus.ZERO_RESULTS) {
          logDebug("Search returned 0 results.");
          showMessage("No results found. Try expanding the search radius.");
          return;
        }

        logDebug(`Places API error: ${status}`, true);
        showMessage(`Search error: ${status}`);
      },
    );
  };

  const runMapAction = (action: MapAction) => {
    const googleMaps = window.google?.maps;
    if (!googleMaps || !placesServiceRef.current || !mapRef.current) {
      return;
    }

    clearResultMarkers();
    setResults([]);
    setEmptyMessage("");
    logDebug(`Applying map action: ${action.query}`);

    placesServiceRef.current.textSearch(
      {
        query: action.query,
        location: new googleMaps.LatLng(userPos.lat, userPos.lng),
      },
      (rawResults: any[] | null, status: string) => {
        if (status !== googleMaps.places.PlacesServiceStatus.OK || !rawResults?.length) {
          logDebug(`Map action textSearch error: ${status}`, true);
          showMessage(`Unable to pin "${action.label}" on the map right now.`);
          return;
        }

        logDebug(`Map action pinned: ${action.label}`);
        processResults(rawResults.slice(0, 5));
      },
    );
  };

  const reverseGeocodeLabel = (
    position: Coordinates,
    fallbackLabel: string,
    onResolved: (label: string) => void,
  ) => {
    const googleMaps = window.google?.maps;
    if (!googleMaps || !geocoderRef.current) {
      onResolved(fallbackLabel);
      return;
    }

    geocoderRef.current.geocode(
      { location: position },
      (results: any[] | null, status: string) => {
        if (status === "OK" && results?.length) {
          const bestLabel =
            results[0]?.formatted_address ||
            results[1]?.formatted_address ||
            fallbackLabel;
          onResolved(bestLabel);
          return;
        }

        logDebug(`Reverse geocode fallback: ${status}`, true);
        onResolved(fallbackLabel);
      },
    );
  };

  const initMapExperience = () => {
    const googleMaps = window.google?.maps;
    if (!googleMaps || !mapElementRef.current || initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    try {
      mapRef.current = new googleMaps.Map(mapElementRef.current, {
        center: userPos,
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });

      infoWindowRef.current = new googleMaps.InfoWindow();
      placesServiceRef.current = new googleMaps.places.PlacesService(mapRef.current);
      geocoderRef.current = new googleMaps.Geocoder();

      mapRef.current.addListener("click", (event: any) => {
        const nextPos = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };
        const fallbackLabel = `${nextPos.lat.toFixed(4)}, ${nextPos.lng.toFixed(4)}`;

        setUserPos(nextPos);
        setStartLocation(fallbackLabel);
        onLocationDraftChange(fallbackLabel);
        reverseGeocodeLabel(nextPos, fallbackLabel, (resolvedLabel) => {
          setStartLocation(resolvedLabel);
          onLocationDraftChange(resolvedLabel);
          reportLocationChange({
            lat: nextPos.lat,
            lng: nextPos.lng,
            label: resolvedLabel,
            source: "map-click",
            updatedAt: Date.now(),
          });
        });
      });

      const autocompleteInput = document.getElementById("start-location");
      if (autocompleteInput && window.google?.maps?.places) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          autocompleteInput,
        );
        autocompleteRef.current.bindTo("bounds", mapRef.current);
        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace();
          if (!place?.geometry?.location) {
            return;
          }

          const nextPos = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          setUserPos(nextPos);
          const label = place.formatted_address ?? place.name ?? "";
          setStartLocation(label);
          onLocationDraftChange(label);
          mapRef.current.setCenter(nextPos);
          mapRef.current.setZoom(15);
          reportLocationChange({
            lat: nextPos.lat,
            lng: nextPos.lng,
            label,
            source: "search",
            updatedAt: Date.now(),
          });
        });
      }

      updateUserMarker(userPos);
      setApiStatus("connected");
      setApiWarning(false);
      logDebug("Map engine ready.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown map initialization error";
      setApiStatus("load-error");
      setApiWarning(true);
      logDebug(`Map init error: ${message}`, true);
    }
  };

  useEffect(() => {
    setStartLocation(initialLocationDraft || initialLocation?.label || "");
    if (
      initialLocation &&
      initialLocation.lat !== null &&
      initialLocation.lng !== null
    ) {
      setUserPos({
        lat: initialLocation.lat,
        lng: initialLocation.lng,
      });
    }
  }, [initialLocation, initialLocationDraft]);

  useEffect(() => {
    let cancelled = false;

    const loadApiKey = async () => {
      try {
        const response = await fetch("/api/v1/maps-config", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`status ${response.status}`);
        }

        const payload = (await response.json()) as { apiKey?: string };
        if (cancelled) {
          return;
        }

        if (!payload.apiKey) {
          setApiStatus("setup-required");
          setApiWarning(true);
          logDebug("Google Maps API key is missing.", true);
          return;
        }

        setApiKey(payload.apiKey);
        setApiStatus("loading-script");
        logDebug("Google Maps configuration loaded.");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setApiStatus("setup-required");
        setApiWarning(true);
        const message = error instanceof Error ? error.message : "unknown error";
        logDebug(`Failed loading maps config: ${message}`, true);
      }
    };

    loadApiKey();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    if (window.google?.maps) {
      initMapExperience();
      return;
    }

    setApiStatus("loading-script");

    window.gm_authFailure = () => {
      setApiStatus("auth-error");
      setApiWarning(true);
      logDebug("Google Maps authentication failure. Check billing or restrictions.", true);
    };

    window.__thaiBuddyMapsInit = () => {
      initMapExperience();
    };

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      return;
    }

    logDebug("Loading Google Maps script...");

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=__thaiBuddyMapsInit`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      setApiStatus("load-error");
      setApiWarning(true);
      logDebug("Failed to load script from Google servers.", true);
    };
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (!initializedRef.current || !mapRef.current) {
      return;
    }

    mapRef.current.setCenter(userPos);
    updateUserMarker(userPos);
    searchPlaces();
  }, [userPos]);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    searchPlaces();
  }, [selectedCategory, selectedVibe, selectedGimmick, distanceKm]);

  useEffect(() => {
    if (!mapAction || !initializedRef.current) {
      return;
    }

    runMapAction(mapAction);
  }, [mapAction]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      logDebug("Geolocation is not supported by this browser.", true);
      return;
    }

    logDebug("Requesting GPS...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const fallbackLabel = `${nextPos.lat.toFixed(4)}, ${nextPos.lng.toFixed(4)}`;

        setUserPos(nextPos);
        setStartLocation(fallbackLabel);
        onLocationDraftChange(fallbackLabel);
        mapRef.current?.setCenter(nextPos);
        mapRef.current?.setZoom(15);
        reverseGeocodeLabel(nextPos, fallbackLabel, (resolvedLabel) => {
          setStartLocation(resolvedLabel);
          onLocationDraftChange(resolvedLabel);
          reportLocationChange({
            lat: nextPos.lat,
            lng: nextPos.lng,
            label: resolvedLabel,
            source: "gps",
            updatedAt: Date.now(),
          });
        });
        logDebug("GPS lock acquired.");
      },
      () => {
        logDebug("GPS denied or unavailable.", true);
      },
    );
  };

  const handleResultClick = (place: PlaceResult, index: number) => {
    const googleMaps = window.google?.maps;
    if (!googleMaps || !mapRef.current || !infoWindowRef.current) {
      return;
    }

    mapRef.current.panTo(place.position);
    mapRef.current.setZoom(17);
    infoWindowRef.current.setContent(
      `<div style="padding:8px;font-weight:700;color:#0f172a;font-size:12px;">${index + 1}. ${place.name}</div>`,
    );

    const marker = resultMarkersRef.current[index];
    if (marker) {
      infoWindowRef.current.open(mapRef.current, marker);
    }
  };

  const statusBadge = (() => {
    if (apiStatus === "connected") {
      return {
        label: "Connected",
        className:
          "border border-green-200 bg-green-50 text-green-700",
      };
    }

    if (apiStatus === "auth-error") {
      return {
        label: "Auth Error",
        className: "border border-red-200 bg-red-50 text-red-700",
      };
    }

    if (apiStatus === "setup-required") {
      return {
        label: "Setup Required",
        className: "border border-amber-200 bg-amber-50 text-amber-700",
      };
    }

    if (apiStatus === "load-error") {
      return {
        label: "Load Error",
        className: "border border-red-200 bg-red-50 text-red-700",
      };
    }

    return {
      label: apiStatus === "loading-script" ? "Loading Map..." : "Checking API...",
      className: "border border-slate-200 bg-slate-100 text-slate-500",
    };
  })();

  return (
    <div className="absolute inset-0 z-0 flex flex-col overflow-hidden bg-slate-50 text-slate-900">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .map-custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .map-custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
            .map-custom-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 999px; }
          `,
        }}
      />

      <header className="safe-top z-20 hidden items-center justify-between border-b bg-white px-4 py-4 shadow-sm lg:flex">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-600 px-2 py-2 text-sm font-bold text-white">
            MAP
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">ThaiBuddy</h1>
            <p className="text-[11px] text-slate-500">Vibe Finder, find your perfect spot</p>
          </div>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-[11px] font-medium ${statusBadge.className}`}
        >
          {statusBadge.label}
        </div>
      </header>

      <main className="relative flex flex-1 overflow-hidden lg:flex-row">
        {isMobilePanelOpen ? (
          <button
            type="button"
            aria-label="Close map tools"
            onClick={() => setIsMobilePanelOpen(false)}
            className="absolute inset-0 z-20 bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
          />
        ) : null}
        <aside
          className={`absolute inset-y-0 right-0 z-30 flex w-[88vw] max-w-sm flex-col border-l border-slate-200 bg-white/95 shadow-2xl backdrop-blur transition-transform duration-300 lg:static lg:z-20 lg:w-[400px] lg:max-w-none lg:flex-shrink-0 lg:translate-x-0 lg:border-l-0 lg:border-b-0 lg:border-r lg:shadow-none ${
            isMobilePanelOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="safe-top flex items-center justify-between border-b px-4 pb-3 pt-5 lg:hidden">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">ThaiBuddy</h2>
              <p className="text-[11px] text-slate-500">
                Vipe Finder Find your perfect spot
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMobilePanelOpen(false)}
              className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600"
            >
              Close
            </button>
          </div>
          <div className="map-custom-scrollbar scroll-touch flex h-full flex-col gap-5 overflow-y-auto p-4 lg:max-h-none lg:flex-1">
            <section>
              <label
                htmlFor="start-location"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Starting Point
              </label>
              <input
                id="start-location"
                type="text"
                value={startLocation}
                onChange={(event) => {
                  const nextLabel = event.target.value;
                  setStartLocation(nextLabel);
                  onLocationDraftChange(nextLabel);
                }}
                placeholder="Enter address or click map..."
                className="w-full rounded-xl bg-slate-100 px-4 py-3 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Use Current GPS
                </button>
                <span className="text-[10px] italic text-slate-400">
                  Click map to set start point
                </span>
              </div>
            </section>

            <section>
              <label className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Select Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedCategory(option.id)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-all ${
                      selectedCategory === option.id
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-200 bg-white hover:border-blue-500"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section className={selectedCategory === "toilet" ? "opacity-30" : ""}>
              <label className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Choose Vibe
              </label>
              <div className="grid grid-cols-2 gap-2">
                {VIBE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={selectedCategory === "toilet"}
                    onClick={() => setSelectedVibe(option.id)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-all ${
                      selectedVibe === option.id
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-200 bg-white hover:border-blue-500"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <label className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                Add Gimmick
              </label>
              <div className="flex flex-wrap gap-2">
                {GIMMICK_OPTIONS.map((option) => (
                  <button
                    key={`${option.id || "none"}-gimmick`}
                    type="button"
                    onClick={() => setSelectedGimmick(option.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-all ${
                      selectedGimmick === option.id
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-blue-200 bg-white hover:border-blue-500"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  Search Radius
                </label>
                <span className="text-sm font-bold text-blue-600">{distanceKm} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={distanceKm}
                onChange={(event) => setDistanceKm(Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
              />
            </section>

            {(results.length > 0 || emptyMessage) && (
              <section className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-sm font-bold text-slate-800">Top Results</h3>
                <div className="space-y-3">
                  {results.map((place, index) => (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => {
                        handleResultClick(place, index);
                        setIsMobilePanelOpen(false);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left shadow-sm transition-all hover:border-blue-400 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-bold text-slate-900">
                            {place.name}
                          </h4>
                          <p className="mt-0.5 truncate text-[10px] text-slate-500">
                            {place.vicinity}
                          </p>
                        </div>
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                          {place.travelInfo?.distanceText ?? "N/A"}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-medium text-slate-400">
                          {place.travelInfo?.durationText
                            ? `${place.travelInfo.durationText} walk`
                            : "Walk info unavailable"}
                        </span>
                        <span className="rounded-full border border-yellow-100 bg-yellow-50 px-1.5 py-0.5 text-[10px] font-bold text-yellow-600">
                          ★ {place.rating ?? "New"}
                        </span>
                      </div>
                    </button>
                  ))}

                  {emptyMessage ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400">
                      {emptyMessage}
                    </div>
                  ) : null}
                </div>
              </section>
            )}

            {debugEntries.length > 0 ? (
              <section className="rounded-xl bg-slate-900 p-4 font-mono text-[10px] text-green-400">
                <div className="mb-2 flex items-center justify-between border-b border-slate-700 pb-1">
                  <span>API DEBUGGER</span>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="text-slate-400 hover:text-white"
                  >
                    Reload
                  </button>
                </div>
                <div className="space-y-1">
                  {debugEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={entry.isError ? "text-red-400" : ""}
                    >
                      {entry.text}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </aside>

        <section className="relative flex-1 p-0 pb-28 lg:p-4 lg:pb-4">
          <div className="safe-top absolute left-0 right-0 top-0 z-20 flex items-start justify-between px-4 pt-4 lg:hidden">
            <div className="rounded-2xl bg-white/92 px-4 py-3 shadow-lg backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-600 px-2 py-2 text-sm font-bold text-white">
                  MAP
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    ThaiBuddy
                  </h1>
                  <p className="text-[11px] text-slate-500">
                    Vipe Finder Find your perfect spot
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="rounded-full border border-blue-200 bg-white/92 px-4 py-2 text-[11px] font-semibold text-blue-700 shadow-lg backdrop-blur"
              >
                ThaiBuddy
              </div>
              <button
                type="button"
                onClick={() => setIsMobilePanelOpen(true)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/92 text-2xl font-bold text-slate-700 shadow-lg backdrop-blur"
                aria-label="Open map tools"
              >
                ⋯
              </button>
            </div>
          </div>
          <div
            ref={mapElementRef}
            className="relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-100 shadow-inner lg:rounded-xl"
          >
            {apiWarning ? (
              <div className="z-10 mx-4 max-w-lg rounded-3xl border border-slate-200 bg-white/95 p-8 text-center shadow-2xl backdrop-blur">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600">
                  !
                </div>
                <h2 className="mb-4 text-2xl font-bold text-slate-800">
                  Connection Setup Needed
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-slate-600">
                  To see the map and find places, the Google Maps API key must be
                  available to the app runtime.
                </p>
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                      1
                    </div>
                    <p className="text-xs text-slate-600">
                      Enable billing in your Google Cloud Console.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                      2
                    </div>
                    <p className="text-xs leading-tight text-slate-600">
                      Enable Maps JavaScript API, Places API, and Distance Matrix
                      API for the same key.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
