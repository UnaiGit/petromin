import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, ChangeEvent, FormEvent } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useAppStore } from "../state/useAppStore";
import VehicleListPanel from "./VehicleListPanel";
import type { VehicleCategory as FleetCategory, VehicleTypeAsset, VehicleUnit } from "../types/vehicles";
import type { LngLat } from "../sim/baSimulation";

const CATEGORY_ICONS: Record<FleetCategory, string> = {
  suv4x4: new URL("../images/4x4suv.webp", import.meta.url).href,
  heavy: new URL("../images/excavator.webp", import.meta.url).href,
  van: new URL("../images/van.webp", import.meta.url).href,
  pickup: new URL("../images/pickuptruck.webp", import.meta.url).href,
};

const CATEGORY_LABEL: Record<FleetCategory, string> = {
  suv4x4: "SUVs 4x4",
  heavy: "Heavy Machinery",
  van: "Transport Vans",
  pickup: "Pickup Trucks",
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const DISPLACEMENT_RATE_PER_KM = 1.2;

const PROFILE_MENU_ITEMS: Array<{
  id: ProfileMenuAction;
  label: string;
  description: string;
  variant?: "highlight" | "danger";
}> = [
  { id: "profile", label: "View profile", description: "Personal details & preferences" },
  { id: "settings", label: "Settings", description: "Notifications, payments, security" },
  {
    id: "switch-admin",
    label: "Switch to admin",
    description: "Open the operations console",
    variant: "highlight",
  },
  {
    id: "logout",
    label: "Sign out",
    description: "End current session",
    variant: "danger",
  },
];

interface GeocodeFeature {
  id: string;
  place_name: string;
  center: [number, number];
  text?: string;
}

type FlowStep = "catalog" | "vehicle_detail" | "quote" | "payment";

type PaymentMethod = "credit" | "debit" | "company";
type IvaStatus = "Responsable Inscripto" | "Monotributista" | "Exento" | "Consumidor Final";

interface PaymentBookingContext {
  vehicleTypeId: VehicleTypeAsset["id"];
  vehicleTitle: string;
  bookingStartDate: string | null;
  bookingEndDate: string | null;
  distanceKm: number;
  estimatedDays: number;
  estimatedTotal: number;
}

interface CardPaymentPayload {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

interface CompanyBillingPayload {
  razonSocial: string;
  cuit: string;
  invoiceType: "A" | "B";
  ivaStatus: IvaStatus;
  fiscalAddress: string;
  billingEmail: string;
  contactPhone?: string;
  purchaseOrder?: string;
  paymentTerm?: string;
  notes?: string;
  acceptTerms: boolean;
}

type PaymentSubmissionPayload =
  | {
      method: Exclude<PaymentMethod, "company">;
      booking: PaymentBookingContext;
      card: CardPaymentPayload;
    }
  | {
      method: "company";
      booking: PaymentBookingContext;
      company: CompanyBillingPayload;
    };

type ProfileMenuAction = "profile" | "settings" | "switch-admin" | "logout";

export function CarSelectorSheet() {
  const mapSelectedVehicleId = useAppStore((state) => state.mapSelectedVehicleId);
  const mapDestination = useAppStore((state) => state.mapDestination);
  const mapRouteMeta = useAppStore((state) => state.mapRouteMeta);
  const mapDestinationLabel = useAppStore((state) => state.mapDestinationLabel);
  const mapRideStatus = useAppStore((state) => state.mapRideStatus);
  const mapFlowStep = useAppStore((state) => state.mapFlowStep as FlowStep);
  const confirmMapRequest = useAppStore((state) => state.confirmMapRequest);
  const resetMapRide = useAppStore((state) => state.resetMapRide);
  const clearMapSelection = useAppStore((state) => state.clearMapSelection);
  const setMapDestination = useAppStore((state) => state.setMapDestination);
  const setMapDestinationLabel = useAppStore((state) => state.setMapDestinationLabel);
  const isMapPickingDestination = useAppStore((state) => state.isMapPickingDestination);
  const setIsMapPickingDestination = useAppStore((state) => state.setIsMapPickingDestination);
  const setMapFlowStep = useAppStore((state) => state.setMapFlowStep);
  const requestMapFlyTo = useAppStore((state) => state.requestMapFlyTo);
  const mapBookingStartDate = useAppStore((state) => state.mapBookingStartDate);
  const mapBookingEndDate = useAppStore((state) => state.mapBookingEndDate);
  const setMapBookingRange = useAppStore((state) => state.setMapBookingRange);
  const vehicleCategory = useAppStore((state) => state.vehicleCategory);
  const setVehicleCategory = useAppStore((state) => state.setVehicleCategory);
  const vehicleUnits = useAppStore((state) => state.vehicleUnits);
  const vehicleTypes = useAppStore((state) => state.vehicleTypes);
  const getTypeById = useAppStore((state) => state.getTypeById);
  const setCorporateMode = useAppStore((state) => state.setCorporateMode);
  const setAdminSection = useAppStore((state) => state.setAdminSection);

  const handleBookingRangeChange = useCallback(
    (start: string | null, end: string | null) => {
      setMapBookingRange({ start, end });
    },
    [setMapBookingRange]
  );

  const handleProceedToPayment = useCallback(() => {
    setMapFlowStep("payment");
  }, [setMapFlowStep]);

  const filteredUnits = useMemo(() => {
    const allowedTypeIds = new Set(
      vehicleTypes.filter((item) => item.category === vehicleCategory).map((item) => item.id)
    );
    return vehicleUnits.filter((unit) => allowedTypeIds.has(unit.typeId));
  }, [vehicleUnits, vehicleTypes, vehicleCategory]);

  const selectedUnit = useMemo(
    () => vehicleUnits.find((unit) => unit.id === mapSelectedVehicleId) ?? null,
    [vehicleUnits, mapSelectedVehicleId]
  );
  const selectedType = selectedUnit ? getTypeById(selectedUnit.typeId) : null;

  const hasDestination = Boolean(mapDestination);
  const hasBookingRange = Boolean(mapBookingStartDate && mapBookingEndDate);
  const canGetQuote = hasDestination && Boolean(mapRouteMeta) && hasBookingRange;

  const [searchValue, setSearchValue] = useState(mapDestinationLabel ?? "");
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeFeature[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleProfileAction = useCallback(
    (action: ProfileMenuAction) => {
      switch (action) {
        case "switch-admin":
          setToastMessage("Switching to admin console…");
          setAdminSection("overview");
          setCorporateMode("admin");
          break;
        case "profile":
          setToastMessage("Opening your profile…");
          break;
        case "settings":
          setToastMessage("Opening settings…");
          break;
        case "logout":
          setToastMessage("Signed out successfully.");
          break;
        default:
          break;
      }
    },
    [setAdminSection, setCorporateMode, setToastMessage]
  );

  const handlePaymentSubmission = useCallback(
    (payload: PaymentSubmissionPayload) => {
      if (payload.method === "company") {
        return;
      }
      setToastMessage("Payment confirmed. Your vehicle is booked.");
    },
    [setToastMessage]
  );

  const handlePaymentCompletion = useCallback(
    ({ method }: { method: PaymentMethod }) => {
      resetMapRide();
      if (method === "company") {
        setToastMessage("Request submitted. You'll receive the invoice by email.");
      }
    },
    [resetMapRide, setToastMessage]
  );

  const geocodeAbortRef = useRef<AbortController | null>(null);
  const previousDestination = useRef<LngLat | null>(null);

  useEffect(() => {
    if (!isEditingAddress) {
      setSearchValue(mapDestinationLabel ?? "");
    }
  }, [mapDestinationLabel, isEditingAddress]);

  useEffect(() => {
    if (!isEditingAddress) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }
    const query = searchValue.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      setSuggestionError(null);
      return;
    }
    if (!MAPBOX_TOKEN) {
      setSuggestionError("Missing Mapbox token");
      setIsLoadingSuggestions(false);
      return;
    }
    const controller = new AbortController();
    geocodeAbortRef.current?.abort();
    geocodeAbortRef.current = controller;
    setIsLoadingSuggestions(true);
    setSuggestionError(null);
    const timer = window.setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Geocoding error ${response.status}`);
        }
        const data = (await response.json()) as { features?: GeocodeFeature[] };
        setSuggestions(data.features ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // eslint-disable-next-line no-console
          console.warn("Autocomplete failed", error);
          setSuggestionError("Could not load suggestions");
        }
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchValue, isEditingAddress]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timer = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!mapDestination) {
      previousDestination.current = null;
      return;
    }
    if (!isMapPickingDestination) {
      previousDestination.current = mapDestination;
      return;
    }
    if (
      previousDestination.current &&
      previousDestination.current.lat === mapDestination.lat &&
      previousDestination.current.lng === mapDestination.lng
    ) {
      return;
    }
    previousDestination.current = mapDestination;
    if (!MAPBOX_TOKEN) {
      const label = `${mapDestination.lat.toFixed(4)}, ${mapDestination.lng.toFixed(4)}`;
      setMapDestinationLabel(label);
      setSearchValue(label);
      setToastMessage(`Destination set: ${label}`);
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${mapDestination.lng},${mapDestination.lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Reverse geocoding error ${response.status}`);
        }
        const data = (await response.json()) as { features?: GeocodeFeature[] };
        const label = data.features?.[0]?.place_name ?? `${mapDestination.lat.toFixed(4)}, ${mapDestination.lng.toFixed(4)}`;
        setMapDestinationLabel(label);
        setSearchValue(label);
        setToastMessage(`Destination set: ${data.features?.[0]?.text ?? label}`);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // eslint-disable-next-line no-console
          console.warn("Reverse geocoding failed", error);
          const fallback = `${mapDestination.lat.toFixed(4)}, ${mapDestination.lng.toFixed(4)}`;
          setMapDestinationLabel(fallback);
          setSearchValue(fallback);
          setToastMessage(`Destination set: ${fallback}`);
        }
      }
    })();
    return () => controller.abort();
  }, [mapDestination, isMapPickingDestination, setIsMapPickingDestination, setMapDestinationLabel]);

  const showBackButton = mapFlowStep !== "catalog" && Boolean(selectedUnit && selectedType);

  const handleBack = () => {
    if (isMapPickingDestination) {
      setIsMapPickingDestination(false);
      return;
    }
    if (mapFlowStep === "payment") {
      setMapFlowStep("quote");
      return;
    }
    if (mapFlowStep === "quote") {
      setMapFlowStep("vehicle_detail");
      return;
    }
    if (mapRideStatus !== "idle") {
      resetMapRide();
      return;
    }
    clearMapSelection();
  };

  const handleSuggestionSelection = (feature: GeocodeFeature) => {
    setIsEditingAddress(false);
    setSuggestions([]);
    setMapDestinationLabel(feature.place_name);
    setSearchValue(feature.place_name);
    setMapDestination({ lng: feature.center[0], lat: feature.center[1] });
    setToastMessage(`Destination set: ${feature.text ?? feature.place_name}`);
  };


  const handleFocusCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setToastMessage("Location not supported on this device");
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setToastMessage("Enable HTTPS to share your location");
      return;
    }
    const requestPosition = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          requestMapFlyTo({ lng: position.coords.longitude, lat: position.coords.latitude, zoom: 15 });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setToastMessage("Allow location access in your browser settings.");
            return;
          }
          setToastMessage("Unable to retrieve current location");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };
    if (navigator.permissions?.query) {
      const permissionName = "geolocation" as PermissionName;
      navigator.permissions
        .query({ name: permissionName })
        .then((status) => {
          if (status.state === "denied") {
            setToastMessage("Location access is blocked. Update your settings to enable it.");
            return;
          }
          requestPosition();
        })
        .catch(requestPosition);
      return;
    }
    requestPosition();
  };

  const handleGetQuote = () => {
    setIsEditingAddress(false);
    setSuggestions([]);
    void confirmMapRequest();
  };

  const handleChangeDestination = () => {
    setMapFlowStep("vehicle_detail");
  };

  const pickupLabel = selectedUnit?.address ?? "Pickup location";
  const canUseGeolocation = typeof navigator !== "undefined" && Boolean(navigator.geolocation);

  const destinationSearch = (
    <DestinationSearch
      pickupLabel={pickupLabel}
      onUsePickup={canUseGeolocation ? handleFocusCurrentLocation : undefined}
      value={searchValue}
      onChange={(value) => {
        setIsEditingAddress(true);
        setSearchValue(value);
      }}
      onFocus={() => setIsEditingAddress(true)}
      onBlur={() => window.setTimeout(() => setIsEditingAddress(false), 120)}
      onSelectSuggestion={handleSuggestionSelection}
      suggestions={suggestions}
      isLoading={isLoadingSuggestions}
      error={suggestionError}
      onBeginMapPick={() => {
        setIsEditingAddress(false);
        setSuggestions([]);
        setIsMapPickingDestination(true);
      }}
      readonly={false}
    />
  );

  const profileMenu = <ProfileMenu items={PROFILE_MENU_ITEMS} onAction={handleProfileAction} />;

  if (isMapPickingDestination) {
    return (
      <>
        {profileMenu}
        {showBackButton ? (
          <FloatingBackButton onClick={handleBack} />
        ) : null}
        <div className="map-pick-overlay">
          <DestinationSearch
            pickupLabel={pickupLabel}
            onUsePickup={canUseGeolocation ? handleFocusCurrentLocation : undefined}
            value={searchValue}
            onChange={(value) => {
              setIsEditingAddress(true);
              setSearchValue(value);
            }}
            onFocus={() => setIsEditingAddress(true)}
            onBlur={() => window.setTimeout(() => setIsEditingAddress(false), 120)}
            onSelectSuggestion={handleSuggestionSelection}
            suggestions={suggestions}
            isLoading={isLoadingSuggestions}
            error={suggestionError}
            readonly={false}
            showMapButton={false}
            showConfirmButton={Boolean(mapDestination)}
            onConfirm={() => setIsMapPickingDestination(false)}
          />
        </div>
        {toastMessage ? <Toast message={toastMessage} /> : null}
      </>
    );
  }

  const paddingTop = 20;

  const sheetStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "calc(env(safe-area-inset-bottom) + 16px)",
    background: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: `${paddingTop}px 22px 28px`,
    boxShadow: "0 -10px 32px rgba(0, 0, 0, 0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  };

  if (mapFlowStep === "catalog") {
    sheetStyle.maxHeight = "min(520px, 50vh)";
    sheetStyle.overflowY = "auto";
  }

  return (
    <>
      {profileMenu}
      {showBackButton ? (
        <FloatingBackButton onClick={handleBack} />
      ) : null}
      <div
        className={`sheet-container ${
          mapFlowStep === "quote" || mapFlowStep === "payment"
            ? "sheet-container--quote"
            : mapFlowStep === "vehicle_detail"
              ? "sheet-container--detail"
              : "sheet-container--catalog"
        }`}
        style={sheetStyle}
      >
        {mapFlowStep === "catalog" ? (
          <>
            <CategorySelector active={vehicleCategory} onSelect={setVehicleCategory} />
            <VehicleListPanel units={filteredUnits} />
          </>
        ) : mapFlowStep === "vehicle_detail" && selectedUnit && selectedType ? (
          <VehicleDetailPanel
            unit={selectedUnit}
            type={selectedType}
            searchInput={destinationSearch}
            suggestions={suggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            suggestionError={suggestionError}
            hasDestination={hasDestination}
            mapRouteMeta={mapRouteMeta}
            bookingStartDate={mapBookingStartDate}
            bookingEndDate={mapBookingEndDate}
            onUpdateBookingRange={handleBookingRangeChange}
            onGetQuote={handleGetQuote}
            canGetQuote={canGetQuote}
          />
        ) : mapFlowStep === "quote" && selectedUnit && selectedType ? (
          <QuoteSheet
            unit={selectedUnit}
            type={selectedType}
            destinationLabel={mapDestinationLabel}
            routeMeta={mapRouteMeta}
            bookingStartDate={mapBookingStartDate}
            bookingEndDate={mapBookingEndDate}
            onChangeDestination={handleChangeDestination}
            onProceedToPayment={handleProceedToPayment}
          />
        ) : mapFlowStep === "payment" && selectedUnit && selectedType ? (
          <PaymentSheet
            type={selectedType}
            bookingStartDate={mapBookingStartDate}
            bookingEndDate={mapBookingEndDate}
            routeMeta={mapRouteMeta}
            onSubmit={handlePaymentSubmission}
            onComplete={handlePaymentCompletion}
          />
        ) : (
          <div
            style={{
              background: "#f5f5f5",
              borderRadius: 18,
              padding: "14px 16px",
              fontSize: 13,
              color: "#616161",
            }}
          >
            Select a vehicle to continue.
          </div>
        )}
      </div>
      {toastMessage ? <Toast message={toastMessage} /> : null}
    </>
  );
}

export default CarSelectorSheet;

function ProfileMenu({
  items,
  onAction,
}: {
  items: Array<{ id: ProfileMenuAction; label: string; description: string; variant?: "highlight" | "danger" }>;
  onAction: (action: ProfileMenuAction) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSelect = (action: ProfileMenuAction) => {
    onAction(action);
    setIsOpen(false);
  };

  return (
    <div className="profile-menu" ref={containerRef}>
      <button
        type="button"
        className="profile-menu__trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Open profile menu"
      >
        <img
          className="profile-menu__avatar-image"
          src="/avatars/user-generated.jpg"
          alt="Profile avatar"
          loading="lazy"
        />
      </button>
      {isOpen ? (
        <div className="profile-menu__dropdown" role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`profile-menu__item${item.variant ? ` profile-menu__item--${item.variant}` : ""}`}
              onClick={() => handleSelect(item.id)}
              role="menuitem"
            >
              <span className="profile-menu__item-label">{item.label}</span>
              <span className="profile-menu__item-description">{item.description}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FloatingBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "absolute",
        top: 22,
        left: 24,
        width: 46,
        height: 46,
        borderRadius: 999,
        border: "none",
        background: "rgba(255,255,255,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 26px rgba(0, 0, 0, 0.16)",
        cursor: "pointer",
        zIndex: 20,
      }}
      aria-label="Back"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 6L4 12L10 18" stroke="#1f1f1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 12H5" stroke="#1f1f1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 150,
        left: 0,
        right: 0,
        margin: "0 auto",
        width: "fit-content",
        maxWidth: "90%",
        background: "rgba(24,24,24,0.92)",
        color: "#f5f5f5",
        padding: "10px 16px",
        borderRadius: 999,
        fontSize: 13,
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
      }}
    >
      {message}
    </div>
  );
}

function DestinationSearch({
  pickupLabel,
  onUsePickup,
  value,
  onChange,
  onFocus,
  onBlur,
  onSelectSuggestion,
  suggestions,
  isLoading,
  error,
  onBeginMapPick,
  readonly,
  showMapButton = true,
  showConfirmButton = false,
  onConfirm,
}: {
  pickupLabel: string;
  onUsePickup?: () => void;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSelectSuggestion: (feature: GeocodeFeature) => void;
  suggestions: GeocodeFeature[];
  isLoading: boolean;
  error: string | null;
  onBeginMapPick?: () => void;
  readonly: boolean;
  showMapButton?: boolean;
  showConfirmButton?: boolean;
  onConfirm?: () => void;
}) {
  const pickupText = pickupLabel.trim() ? middleTruncate(pickupLabel.trim(), 56) : "Pickup location";
  return (
    <div className="destination-search">
      <div className="destination-search__row destination-search__row--start">
        <span className="destination-search__icon destination-search__icon--pickup" aria-hidden="true">
          <span />
        </span>
        <div className="destination-search__main">
          <span className="destination-search__title">Pickup</span>
          <span className="destination-search__text" title={pickupText}>
            {pickupText}
          </span>
        </div>
        {onUsePickup ? (
          <button
            type="button"
            className="destination-search__button destination-search__button--ghost"
            onClick={onUsePickup}
            aria-label="Use current location"
          >
            <TargetIcon />
          </button>
        ) : null}
      </div>
      <span className="destination-search__connector" aria-hidden="true" />
      <div className={`destination-search__row destination-search__row--destination${showConfirmButton ? " is-confirm-visible" : ""}`}>
        <span className="destination-search__icon destination-search__icon--destination" aria-hidden="true">
          <span />
        </span>
        <div className="destination-search__main">
          <span className="destination-search__title destination-search__title--primary">Destination</span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder="Enter destination"
            readOnly={readonly}
            className="destination-search__input-field"
          />
        </div>
        {showConfirmButton && onConfirm ? (
          <div className="destination-search__confirm-wrap">
            <button
              type="button"
              onClick={onConfirm}
              className="destination-search__confirm"
              title="Confirm destination"
              aria-label="Confirm destination"
            >
              <SendIcon />
            </button>
          </div>
        ) : showMapButton && onBeginMapPick ? (
          <button
            type="button"
            onClick={onBeginMapPick}
            className="destination-search__map-button"
            title="Select on map"
            disabled={readonly}
          >
            <PinIcon />
            <span>Select on map</span>
          </button>
        ) : null}
      </div>
      <SuggestionPanel suggestions={suggestions} isLoading={isLoading} error={error} onSelect={onSelectSuggestion} />
    </div>
  );
}

function middleTruncate(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }
  const keep = Math.max(0, maxLength - 1);
  const start = Math.ceil(keep / 2);
  const end = Math.floor(keep / 2);
  return `${text.slice(0, start)}…${text.slice(text.length - end)}`;
}

function TargetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" stroke="currentColor" />
      <path d="M12 5V2" stroke="currentColor" />
      <path d="M12 22V19" stroke="currentColor" />
      <path d="M5 12H2" stroke="currentColor" />
      <path d="M22 12H19" stroke="currentColor" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.5c-3.6 0-6.5 2.8-6.5 6.2 0 3.1 2.2 5.6 4.8 8.2l1.7 1.7a.9.9 0 001.3 0l1.7-1.7c2.6-2.6 4.8-5.1 4.8-8.2 0-3.4-2.9-6.2-6.5-6.2zm0 8.9a2.7 2.7 0 110-5.4 2.7 2.7 0 010 5.4z"
        fill="currentColor"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SuggestionPanel({
  suggestions,
  isLoading,
  error,
  onSelect,
}: {
  suggestions: GeocodeFeature[];
  isLoading: boolean;
  error: string | null;
  onSelect: (feature: GeocodeFeature) => void;
}) {
  if (error) {
    return <div style={{ fontSize: 12, color: "#444444" }}>{error}</div>;
  }
  if (suggestions.length > 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: 14,
          background: "#ffffff",
          boxShadow: "0 18px 28px rgba(0,0,0,0.14)",
          overflow: "hidden",
          maxHeight: 220,
          overflowY: "auto",
        }}
      >
        {suggestions.map((item) => (
          <button
            key={item.id}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(item)}
            style={{
              textAlign: "left",
              border: "none",
              background: "transparent",
              padding: "12px 14px",
              fontSize: 13,
              color: "#1f1f1f",
              cursor: "pointer",
            }}
          >
            {item.place_name}
          </button>
        ))}
      </div>
    );
  }
  if (isLoading) {
    return <div style={{ fontSize: 12, color: "#555555" }}>Loading suggestions…</div>;
  }
  return null;
}

function CategorySelector({
  active,
  onSelect,
}: {
  active: FleetCategory;
  onSelect: (category: FleetCategory) => void;
}) {
  const ordered: FleetCategory[] = ["suv4x4", "heavy", "van", "pickup"];
  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
      {ordered.map((category) => {
        const selected = active === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            aria-label={CATEGORY_LABEL[category]}
            style={{
              border: selected ? "1.5px solid #1f2937" : "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              background: "#ffffff",
              boxShadow: "none",
              transition: "border-color 0.2s ease, background 0.2s ease",
            }}
          >
            <img
              src={CATEGORY_ICONS[category]}
              alt={CATEGORY_LABEL[category]}
              style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }}
            />
          </button>
        );
      })}
    </div>
  );
}

function VehicleDetailPanel({
  unit,
  type,
  searchInput,
  suggestions,
  isLoadingSuggestions,
  suggestionError,
  hasDestination,
  mapRouteMeta,
  bookingStartDate,
  bookingEndDate,
  onUpdateBookingRange,
  onGetQuote,
  canGetQuote,
}: {
  unit: VehicleUnit;
  type: VehicleTypeAsset;
  searchInput: ReactNode;
  suggestions: GeocodeFeature[];
  isLoadingSuggestions: boolean;
  suggestionError: string | null;
  hasDestination: boolean;
  mapRouteMeta: { distanceKm: number; durationMinutes: number } | null;
  bookingStartDate: string | null;
  bookingEndDate: string | null;
  onUpdateBookingRange: (start: string | null, end: string | null) => void;
  onGetQuote: () => void;
  canGetQuote: boolean;
}) {
  const priceText = type.pricePerDay ? `€${type.pricePerDay.toLocaleString()}/day` : "—";
  const hpText = type.horsepower ? `${type.horsepower}hp` : "—";
  const capacityText = type.capacity ? `${type.capacity}` : "—";
  const routeMessage = hasDestination ? (mapRouteMeta ? "Route prepared for dispatch." : "Calculating route…") : null;
  const routeMessageColor = mapRouteMeta ? "#444444" : "#555555";

  return (
    <div className="vehicle-detail-panel" style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: "#7f7f7f" }}>
            Unit {unit.id}
          </span>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#111111", marginBottom: 2 }}>{type.title}</div>
          <div style={{ fontSize: 14, color: "#555555", maxWidth: "120%" }}>{type.description}</div>
          <div style={{ fontSize: 12, color: "#222222", opacity: 0.85 }}>{unit.address}</div>
        </div>
        <div
          style={{
            flexShrink: 0,
            width: "min(220px, 44vw)",
            height: "min(140px, 28vw)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "visible",
            marginRight: -24,
          }}
        >
          <img
            src={type.iconUrl}
            alt={type.title}
            style={{ width: "120%", height: "auto", objectFit: "contain", transform: "translateX(24%)" }}
          />
        </div>
      </div>

      <div className="vehicle-detail-panel__stats" style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center", paddingLeft: 12 }}>
        <StatBadge icon={<PriceIcon />} label={priceText} />
        <StatBadge icon={<PeopleIcon />} label={`${capacityText} seats`} />
        <StatBadge icon={<EngineIcon />} label={hpText} />
      </div>

      <span style={{ fontSize: 15, fontWeight: 700, color: "#111111" }}>Select your destination on the map or enter an address.</span>

      {searchInput}

      {suggestionError && suggestions.length === 0 && !isLoadingSuggestions ? (
        <div style={{ fontSize: 12, color: "#444444" }}>{suggestionError}</div>
      ) : null}

      <DateRangeCalendar
        startDate={bookingStartDate}
        endDate={bookingEndDate}
        onChange={onUpdateBookingRange}
      />

      {routeMessage ? <div style={{ fontSize: 12, color: routeMessageColor }}>{routeMessage}</div> : null}

      <button
        type="button"
        onClick={onGetQuote}
        disabled={!canGetQuote}
        style={{
          marginTop: 8,
          border: "none",
          borderRadius: 16,
          padding: "16px",
          fontSize: 16,
          fontWeight: 700,
          background: canGetQuote ? "#111111" : "#d4d4d4",
          color: "#f5f5f5",
          cursor: canGetQuote ? "pointer" : "not-allowed",
          boxShadow: canGetQuote ? "0 16px 30px rgba(0,0,0,0.25)" : "none",
          transition: "background 0.2s ease",
        }}
      >
        Get Quote
      </button>
    </div>
  );
}

const DAY_TILE_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const WEEKDAY_TILE_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const UPCOMING_DAY_COUNT = 21;
const DRAG_HANDLE_OFFSET = 14;
const DRAG_HANDLE_WIDTH = 64;

function DateRangeCalendar({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
}) {
  const today = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  }, []);

  const days = useMemo(() => {
    return Array.from({ length: UPCOMING_DAY_COUNT }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const iso = formatISODate(date);
      return {
        iso,
        label: DAY_TILE_FORMATTER.format(date),
        weekday: WEEKDAY_TILE_FORMATTER.format(date),
      };
    });
  }, [today]);

  const daysSelected = startDate && endDate ? inclusiveDaysBetween(startDate, endDate) : null;
  const selectionHeadline = daysSelected ?? 0;
  const handleSelect = (iso: string) => {
    if (!startDate || (startDate && endDate)) {
      onChange(iso, null);
      return;
    }
    if (iso < startDate) {
      onChange(iso, startDate);
      return;
    }
    onChange(startDate, iso);
  };

  const handleClear = () => {
    if (!startDate && !endDate) {
      return;
    }
    onChange(null, null);
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 18,
        padding: "14px 16px",
        display: "grid",
        gap: 12,
        boxShadow: "0 24px 48px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 14, color: "#2a2a2a" }}>
          Booked <span style={{ fontWeight: 700 }}>{selectionHeadline}</span> days
        </span>
        <button
          type="button"
          onClick={handleClear}
          disabled={!startDate && !endDate}
          style={{
            border: "none",
            background: "none",
            color: "#444444",
            fontSize: 12,
            fontWeight: 600,
            cursor: startDate || endDate ? "pointer" : "not-allowed",
            opacity: startDate || endDate ? 1 : 0.35,
            padding: 0,
          }}
        >
          Clear
        </button>
      </div>
      <div
        className="date-range-strip"
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "nowrap",
          overflowX: "auto",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 2,
        }}
      >
        {days.map((day) => {
          const isSelectedStart = startDate === day.iso;
          const isSelectedEnd = endDate === day.iso;
          const isWithinRange = startDate && endDate ? day.iso > startDate && day.iso < endDate : false;
          const background = isSelectedStart || isSelectedEnd ? "#111111" : isWithinRange ? "#dcdcdc" : "#ffffff";
          const color = isSelectedStart || isSelectedEnd ? "#f5f5f5" : "#1f1f1f";
          const borderColor = isSelectedStart || isSelectedEnd ? "#111111" : isWithinRange ? "#dcdcdc" : "#e0e0e0";
          return (
            <button
              key={day.iso}
              type="button"
              onClick={() => handleSelect(day.iso)}
              style={{
                minWidth: 76,
                padding: "8px 12px",
                borderRadius: 12,
                border: `1px solid ${borderColor}`,
                background,
                color,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                alignItems: "flex-start",
                cursor: "pointer",
                fontSize: 12,
                boxShadow: isSelectedStart || isSelectedEnd ? "0 6px 16px rgba(0,0,0,0.18)" : "none",
                transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, opacity: isSelectedStart || isSelectedEnd ? 0.82 : 0.58 }}>
                {day.weekday}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{day.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function inclusiveDaysBetween(start: string, end: string) {
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  const startUtc = Date.UTC(ys ?? 0, (ms ?? 1) - 1, ds ?? 1);
  const endUtc = Date.UTC(ye ?? 0, (me ?? 1) - 1, de ?? 1);
  const diff = Math.max(0, Math.round((endUtc - startUtc) / 86400000)) + 1;
  return diff;
}

function formatCuit(value: string) {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 11);
  const first = digits.slice(0, 2);
  const middle = digits.slice(2, 10);
  const last = digits.slice(10, 11);
  let formatted = first;
  if (middle) {
    formatted = formatted ? `${formatted}-${middle}` : middle;
  }
  if (last) {
    formatted = formatted ? `${formatted}-${last}` : last;
  }
  return formatted ?? "";
}

function validateCuit(raw: string) {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length !== 11) {
    return false;
  }
  const coefficients = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = coefficients.reduce((acc, coefficient, index) => {
    return acc + coefficient * Number(digits[index] ?? 0);
  }, 0);
  const mod = 11 - (sum % 11);
  const checkDigit = mod === 11 ? 0 : mod === 10 ? 9 : mod;
  return checkDigit === Number(digits[10]);
}

function formatCardNumber(raw: string) {
  if (!raw) {
    return "";
  }
  const groups: string[] = [];
  for (let index = 0; index < raw.length; index += 4) {
    groups.push(raw.slice(index, index + 4));
  }
  return groups.join(" ").trim();
}

function getCardPreviewNumber(raw: string) {
  const padded = (raw + "••••••••••••••••").slice(0, 16);
  const groups: string[] = [];
  for (let index = 0; index < 16; index += 4) {
    groups.push(padded.slice(index, index + 4));
  }
  return groups.join(" ");
}

function QuoteSheet({
  unit,
  type,
  destinationLabel,
  routeMeta,
  bookingStartDate,
  bookingEndDate,
  onChangeDestination,
  onProceedToPayment,
}: {
  unit: VehicleUnit;
  type: VehicleTypeAsset;
  destinationLabel: string | null;
  routeMeta: { distanceKm: number; durationMinutes: number } | null;
  onChangeDestination: () => void;
  bookingStartDate: string | null;
  bookingEndDate: string | null;
  onProceedToPayment: () => void;
}) {
  const pricePerDay = type.pricePerDay ?? 0;
  const distanceKm = routeMeta?.distanceKm ?? 0;
  const durationMinutes = routeMeta?.durationMinutes ?? 0;
  const displacementCost = distanceKm * DISPLACEMENT_RATE_PER_KM;
  const rentalDays = bookingStartDate && bookingEndDate ? inclusiveDaysBetween(bookingStartDate, bookingEndDate) : 0;
  const rentalCost = rentalDays > 0 ? pricePerDay * rentalDays : 0;
  const subtotal = rentalCost + displacementCost;
  const dayLabel = rentalDays === 1 ? "day" : "days";
  const rentalDaysDisplay = rentalDays > 0 ? `${rentalDays} ${dayLabel}` : "—";
  const formattedSubtotal = `€${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedRentalCost = rentalCost > 0
    ? `€${pricePerDay.toLocaleString()}/day × ${rentalDays} ${dayLabel} = €${rentalCost.toFixed(2)}`
    : "Select dates to calculate";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <img
          src={type.iconUrl}
          alt={type.title}
          style={{ width: 72, height: "auto", borderRadius: 16, background: "#f1f1f1" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontWeight: 800, color: "#111111", fontSize: 18 }}>{type.title}</div>
          <div style={{ fontSize: 13, color: "#555555" }}>{type.description}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#2a2a2a" }}>
            {CATEGORY_LABEL[type.category]} · €{pricePerDay.toLocaleString()}/day
          </div>
          <div style={{ fontSize: 12, color: "#555555" }}>Currently in: {unit.address}</div>
        </div>
      </div>

      <div
        style={{
          background: "#f5f5f5",
          borderRadius: 16,
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 700, color: "#111111" }}>Destination</span>
          <span style={{ fontSize: 13, color: "#555555" }}>{destinationLabel ?? "Not set"}</span>
        </div>
        <button
          type="button"
          onClick={onChangeDestination}
          style={{
            border: "none",
            background: "none",
            color: "#2a2a2a",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Change
        </button>
      </div>

      {routeMeta ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <QuoteSummaryStat
            icon={<SummaryClockIcon />}
            label="Arrival"
            value={formatMinutes(durationMinutes)}
            detail={distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : undefined}
          />
          <QuoteSummaryStat
            icon={<SummaryCalendarIcon />}
            label="Days"
            value={rentalDaysDisplay}
          />
          <QuoteSummaryStat
            icon={<SummaryCurrencyIcon />}
            label="Total"
            value={formattedSubtotal}
            detail={displacementCost > 0 ? `+ €${displacementCost.toFixed(2)}` : undefined}
          />
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#444444" }}>We couldn&apos;t compute the route. Please retry.</div>
      )}

      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: "16px",
          boxShadow: "0 20px 36px rgba(0,0,0,0.12)",
          display: "grid",
          gap: 10,
          fontSize: 14,
          color: "#111111",
        }}
      >
        <Row label="Rental price" value={formattedRentalCost} />
        <Row
          label="Displacement cost"
          value={`€${DISPLACEMENT_RATE_PER_KM.toFixed(2)}/km × ${distanceKm.toFixed(1)} km = €${displacementCost.toFixed(2)}`}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          <span>Total estimate (pre-tax)</span>
          <span>{formattedSubtotal}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onProceedToPayment}
        style={{
          border: "none",
          borderRadius: 16,
          padding: "16px",
          fontSize: 16,
          fontWeight: 700,
          background: "#111111",
          color: "#f5f5f5",
          cursor: "pointer",
          boxShadow: "0 16px 30px rgba(0,0,0,0.28)",
        }}
      >
        Proceed to Payment
      </button>
    </div>
  );
}

const IVA_OPTIONS: IvaStatus[] = [
  "Responsable Inscripto",
  "Monotributista",
  "Exento",
  "Consumidor Final",
];

const PAYMENT_TERM_OPTIONS = ["Contado", "15 días", "30 días", "45 días", "60 días"] as const;

const COMPANY_STEP_REQUIRED_FIELDS: CompanyField[][] = [
  ["razonSocial", "cuit"],
  ["fiscalAddress", "billingEmail"],
  ["acceptTerms"],
];

const COMPANY_STEP_META: Array<{ title: string; description: string }> = [
  { title: "Datos fiscales", description: "Identificá la empresa" },
  { title: "Contacto de facturación", description: "¿Dónde enviamos la factura?" },
  { title: "Detalles finales", description: "Opcionales y confirmación" },
];

const CONSUMER_FINAL_GENERIC_CUIT = "20000000000";

type CompanyField =
  | "razonSocial"
  | "cuit"
  | "fiscalAddress"
  | "billingEmail"
  | "contactPhone"
  | "purchaseOrder"
  | "paymentTerm"
  | "notes"
  | "acceptTerms";

function PaymentSheet({
  type,
  bookingStartDate,
  bookingEndDate,
  routeMeta,
  onSubmit,
  onComplete,
}: {
  type: VehicleTypeAsset;
  bookingStartDate: string | null;
  bookingEndDate: string | null;
  routeMeta: { distanceKm: number; durationMinutes: number } | null;
  onSubmit?: (payload: PaymentSubmissionPayload) => void;
  onComplete: (result: { method: PaymentMethod }) => void;
}) {
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>("company");
  const [viewMode, setViewMode] = useState<"form" | "success">("form");

  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const [companyLegalName, setCompanyLegalName] = useState("");
  const [companyCuitDigits, setCompanyCuitDigits] = useState("");
  const [companyIvaStatus, setCompanyIvaStatus] = useState<IvaStatus>("Responsable Inscripto");
  const [companyFiscalAddress, setCompanyFiscalAddress] = useState("");
  const [companyBillingEmail, setCompanyBillingEmail] = useState("");
  const [companyContactPhone, setCompanyContactPhone] = useState("");
  const [companyPurchaseOrder, setCompanyPurchaseOrder] = useState("");
  const [companyPaymentTerm, setCompanyPaymentTerm] = useState<string>("Contado");
  const [companyNotes, setCompanyNotes] = useState("");
  const [companyAcceptTerms, setCompanyAcceptTerms] = useState(false);
  const [companyTouched, setCompanyTouched] = useState<Partial<Record<CompanyField, boolean>>>({});
  const [companySubmitted, setCompanySubmitted] = useState(false);
  const [companyStep, setCompanyStep] = useState(0);
  const [companyIvaPickerOpen, setCompanyIvaPickerOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const previousNonConsumerCuitRef = useRef<string>("");
  const [cardHalfHeight, setCardHalfHeight] = useState(120);

  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node) {
      return;
    }

    const update = () => {
      setCardHalfHeight(node.offsetHeight / 2);
    };

    update();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => update());
      observer.observe(node);
      return () => observer.disconnect();
    }

    const id = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(id);
  }, [activeMethod]);

  useEffect(() => {
    if (companyIvaStatus === "Consumidor Final") {
      if (companyCuitDigits !== CONSUMER_FINAL_GENERIC_CUIT) {
        if (companyCuitDigits) {
          previousNonConsumerCuitRef.current = companyCuitDigits.replace(/[^0-9]/g, "");
        }
        setCompanyCuitDigits(CONSUMER_FINAL_GENERIC_CUIT);
      }
      return;
    }

    if (companyCuitDigits === CONSUMER_FINAL_GENERIC_CUIT) {
      const restored = previousNonConsumerCuitRef.current;
      if (restored !== companyCuitDigits) {
        setCompanyCuitDigits(restored);
      }
      return;
    }

    if (companyCuitDigits) {
      previousNonConsumerCuitRef.current = companyCuitDigits.replace(/[^0-9]/g, "");
    }
  }, [companyIvaStatus, companyCuitDigits]);

  const pricePerDay = type.pricePerDay ?? 0;
  const distanceKm = routeMeta?.distanceKm ?? 0;
  const displacementCost = distanceKm * DISPLACEMENT_RATE_PER_KM;
  const rentalDays = bookingStartDate && bookingEndDate ? inclusiveDaysBetween(bookingStartDate, bookingEndDate) : 0;
  const rentalCost = rentalDays > 0 ? pricePerDay * rentalDays : 0;
  const total = rentalCost + displacementCost;

  const bookingContext = useMemo<PaymentBookingContext>(
    () => ({
      vehicleTypeId: type.id,
      vehicleTitle: type.title,
      bookingStartDate,
      bookingEndDate,
      distanceKm,
      estimatedDays: rentalDays,
      estimatedTotal: total,
    }),
    [type, bookingStartDate, bookingEndDate, distanceKm, rentalDays, total]
  );

  const totalFormatted = `€${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const cardMethodLabel = activeMethod === "debit" ? "Debit Card" : "Credit Card";

  const formattedCardNumber = formatCardNumber(cardNumber);
  const previewNumber = getCardPreviewNumber(cardNumber);
  const previewName = cardholderName ? cardholderName.toUpperCase() : "CARDHOLDER NAME";
  const previewExpiry = expiry || "MM/YY";
  const previewCvv = cvv ? cvv.replace(/\d/g, "•") : "•••";

  const isCardFormValid =
    cardNumber.length === 16 &&
    cardholderName.trim().length > 2 &&
    /^\d{2}\/\d{2}$/.test(expiry) &&
    cvv.length >= 3;

  const companyInvoiceType = companyIvaStatus === "Responsable Inscripto" ? "A" : "B";
  const totalCompanySteps = COMPANY_STEP_META.length;
  const companyProgress = ((companyStep + 1) / totalCompanySteps) * 100;

  const companyErrors = useMemo(() => {
    const errors: Partial<Record<CompanyField, string>> = {};
    if (!companyLegalName.trim()) {
      errors.razonSocial = "Completa este campo.";
    }
    const sanitizedCuit = companyCuitDigits.replace(/[^0-9]/g, "");
    if (companyIvaStatus === "Consumidor Final") {
      if (sanitizedCuit !== CONSUMER_FINAL_GENERIC_CUIT) {
        errors.cuit = "Para consumidor final usa el CUIT genérico 20-00000000-0.";
      }
    } else if (!validateCuit(companyCuitDigits)) {
      errors.cuit = "CUIT inválido. Verifica los 11 dígitos.";
    }
    if (!companyFiscalAddress.trim()) {
      errors.fiscalAddress = "Completa este campo.";
    }
    const emailTrimmed = companyBillingEmail.trim();
    if (!emailTrimmed) {
      errors.billingEmail = "Completa este campo.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errors.billingEmail = "Email inválido. Verifica el formato.";
    }
    if (!companyAcceptTerms) {
      errors.acceptTerms = "Acepta términos y privacidad.";
    }
    return errors;
  }, [companyLegalName, companyCuitDigits, companyIvaStatus, companyFiscalAddress, companyBillingEmail, companyAcceptTerms]);

  const isCompanyFormValid = Object.keys(companyErrors).length === 0;

  const markCompanyTouched = useCallback((field: CompanyField) => {
    setCompanyTouched((previous) => {
      if (previous[field]) {
        return previous;
      }
      return { ...previous, [field]: true };
    });
  }, []);

  const shouldShowCompanyError = useCallback(
    (field: CompanyField) => {
      const message = companyErrors[field];
      return Boolean(message) && (companySubmitted || companyTouched[field]);
    },
    [companyErrors, companySubmitted, companyTouched]
  );

  const resetCompanyForm = useCallback(() => {
    setCompanyLegalName("");
    setCompanyCuitDigits("");
    setCompanyIvaStatus("Responsable Inscripto");
    setCompanyFiscalAddress("");
    setCompanyBillingEmail("");
    setCompanyContactPhone("");
    setCompanyPurchaseOrder("");
    setCompanyPaymentTerm("Contado");
    setCompanyNotes("");
    setCompanyAcceptTerms(false);
    setCompanyTouched({});
    setCompanySubmitted(false);
    setCompanyStep(0);
    setCompanyIvaPickerOpen(false);
  }, []);

  const confirmCardPayment = useCallback(() => {
    if (!isCardFormValid || activeMethod === "company") {
      return;
    }
    const payload: PaymentSubmissionPayload = {
      method: activeMethod,
      booking: bookingContext,
      card: {
        cardholderName: cardholderName.trim(),
        cardNumber,
        expiry,
        cvv,
      },
    };
    onSubmit?.(payload);
    onComplete({ method: activeMethod });
  }, [
    activeMethod,
    bookingContext,
    cardNumber,
    cardholderName,
    cvv,
    expiry,
    isCardFormValid,
    onComplete,
    onSubmit,
  ]);

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeMethod === "company") {
      if (companyStep < totalCompanySteps - 1) {
        handleCompanyNext();
        return;
      }
      (COMPANY_STEP_REQUIRED_FIELDS[companyStep] ?? []).forEach((field) => markCompanyTouched(field));
      setCompanySubmitted(true);
      if (!isCompanyFormValid) {
        return;
      }
      const payload: PaymentSubmissionPayload = {
        method: "company",
        booking: bookingContext,
        company: {
          razonSocial: companyLegalName.trim(),
          cuit: companyCuitDigits,
          invoiceType: companyInvoiceType,
          ivaStatus: companyIvaStatus,
          fiscalAddress: companyFiscalAddress.trim(),
          billingEmail: companyBillingEmail.trim(),
          contactPhone: companyContactPhone.trim() ? companyContactPhone.trim() : undefined,
          purchaseOrder: companyPurchaseOrder.trim() ? companyPurchaseOrder.trim() : undefined,
          paymentTerm: companyPaymentTerm ? companyPaymentTerm : undefined,
          notes: companyNotes.trim() ? companyNotes.trim() : undefined,
          acceptTerms: companyAcceptTerms,
        },
      };
      onSubmit?.(payload);
      setViewMode("success");
      return;
    }
    confirmCardPayment();
  };

  const handleMethodChange = (method: PaymentMethod) => {
    setActiveMethod(method);
    setViewMode("form");
    setCompanyIvaPickerOpen(false);
    if (method !== "company") {
      setCompanySubmitted(false);
      setCompanyTouched({});
      setCompanyStep(0);
    }
    if (method === "company") {
      setCompanyStep(0);
    }
  };

  const handleCardNumberInput = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/[^0-9]/g, "").slice(0, 16);
    setCardNumber(digits);
  };

  const handleExpiryInput = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/[^0-9]/g, "").slice(0, 4);
    if (raw.length === 0) {
      setExpiry("");
      return;
    }
    if (raw.length <= 2) {
      setExpiry(raw);
      return;
    }
    setExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
  };

  const handleCvvInput = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/[^0-9]/g, "").slice(0, 4);
    setCvv(digits);
  };

  const handleNameInput = (event: ChangeEvent<HTMLInputElement>) => {
    setCardholderName(event.target.value);
  };

  const handleCompanyCuitInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (companyIvaStatus === "Consumidor Final") {
      return;
    }
    const digits = event.target.value.replace(/[^0-9]/g, "").slice(0, 11);
    setCompanyCuitDigits(digits);
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #d6d6d6",
    background: "#f9f9f9",
    padding: "14px 14px",
    fontSize: 14,
    color: "#111111",
  };

  const errorStyle: CSSProperties = {
    fontSize: 12,
    color: "#d14343",
  };

  useEffect(() => {
    if (companyStep < totalCompanySteps - 1 && companySubmitted) {
      setCompanySubmitted(false);
    }
  }, [companyStep, companySubmitted, totalCompanySteps]);

  const methodOptions: Array<{ value: PaymentMethod; label: string }> = [
    { value: "credit", label: "Credit" },
    { value: "debit", label: "Debit" },
    { value: "company", label: "Company" },
  ];

  const handleCompanyNext = useCallback(() => {
    const requiredFields = COMPANY_STEP_REQUIRED_FIELDS[companyStep] ?? [];
    requiredFields.forEach((field) => markCompanyTouched(field));
    const hasErrors = requiredFields.some((field) => Boolean(companyErrors[field]));
    if (hasErrors) {
      return;
    }
    setCompanyIvaPickerOpen(false);
    setCompanyStep((previous) => Math.min(previous + 1, totalCompanySteps - 1));
  }, [companyErrors, companyStep, markCompanyTouched, totalCompanySteps]);

  const handleCompanyBack = useCallback(() => {
    setCompanyIvaPickerOpen(false);
    setCompanyStep((previous) => Math.max(previous - 1, 0));
  }, []);

  const segmentedControl = (
    <div
      style={{
        display: "flex",
        width: "100%",
        background: "#f5f5f5",
        borderRadius: 16,
        padding: 6,
        gap: 6,
        boxSizing: "border-box",
      }}
    >
      {methodOptions.map((option) => {
        const active = activeMethod === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleMethodChange(option.value)}
            style={{
              flex: 1,
              borderRadius: 12,
              border: "none",
              padding: "12px 0",
              fontSize: 13,
              fontWeight: 600,
              background: active ? "#111111" : "transparent",
              color: active ? "#f5f5f5" : "#515151",
              cursor: "pointer",
              transition: "background 0.2s ease, color 0.2s ease",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  const cardFields = (
    <div style={{ display: "grid", gap: 16 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, color: "#555555", textTransform: "uppercase", letterSpacing: 0.8 }}>Card number</span>
        <input
          value={formattedCardNumber}
          onChange={handleCardNumberInput}
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          style={inputStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, color: "#555555", textTransform: "uppercase", letterSpacing: 0.8 }}>Card holder</span>
        <input
          value={cardholderName}
          onChange={handleNameInput}
          autoComplete="cc-name"
          placeholder="Full name as on card"
          style={inputStyle}
        />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#555555", textTransform: "uppercase", letterSpacing: 0.8 }}>Expiry</span>
          <input
            value={expiry}
            onChange={handleExpiryInput}
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#555555", textTransform: "uppercase", letterSpacing: 0.8 }}>CVV</span>
          <input
            value={cvv}
            onChange={handleCvvInput}
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            style={inputStyle}
          />
        </label>
      </div>
    </div>
  );

  const stepMeta = COMPANY_STEP_META[Math.min(companyStep, totalCompanySteps - 1)] ?? COMPANY_STEP_META[0];
  const advanceReady = (COMPANY_STEP_REQUIRED_FIELDS[companyStep] ?? []).every((field) => !companyErrors[field]);

  const backButtonStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    border: "1px solid #d7d7d7",
    padding: "14px 20px",
    fontSize: 14,
    fontWeight: 600,
    background: "#ffffff",
    color: "#333333",
    cursor: "pointer",
  };

  const primaryPillStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 999,
    border: "none",
    padding: "16px 24px",
    fontSize: 15,
    fontWeight: 700,
    background: "#111111",
    color: "#f5f5f5",
    cursor: "pointer",
    transition: "background 0.2s ease, color 0.2s ease, opacity 0.2s ease",
  };

  const renderCompanyStepFields = () => {
    switch (companyStep) {
      case 0:
        return (
          <div style={{ display: "grid", gap: 18 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: "#555555" }}>Razón social</span>
              <input
                value={companyLegalName}
                onChange={(event) => setCompanyLegalName(event.target.value)}
                onBlur={() => markCompanyTouched("razonSocial")}
                placeholder="Nombre legal de la empresa"
                style={inputStyle}
              />
              {shouldShowCompanyError("razonSocial") ? <span style={errorStyle}>{companyErrors.razonSocial}</span> : null}
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: "#555555" }}>CUIT</span>
              <input
                value={formatCuit(companyCuitDigits)}
                onChange={handleCompanyCuitInput}
                onBlur={() => markCompanyTouched("cuit")}
                inputMode="numeric"
                readOnly={companyIvaStatus === "Consumidor Final"}
                aria-readonly={companyIvaStatus === "Consumidor Final"}
                placeholder="00-00000000-0"
                style={inputStyle}
              />
              {shouldShowCompanyError("cuit") ? <span style={errorStyle}>{companyErrors.cuit}</span> : null}
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
              <span style={{ fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: "#555555" }}>Condición IVA</span>
              <button
                type="button"
                onClick={() => setCompanyIvaPickerOpen((previous) => !previous)}
                aria-haspopup="listbox"
                aria-expanded={companyIvaPickerOpen}
                style={{
                  ...inputStyle,
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  paddingRight: 16,
                }}
              >
                <span>{companyIvaStatus}</span>
                <span
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderTop: "7px solid #333333",
                    transform: companyIvaPickerOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>
              {companyIvaPickerOpen ? (
                <div
                  role="listbox"
                  style={{
                    marginTop: 8,
                    borderRadius: 14,
                    border: "1px solid rgba(17,17,17,0.08)",
                    background: "#ffffff",
                    boxShadow: "0 18px 32px rgba(0,0,0,0.14)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  {IVA_OPTIONS.map((option) => {
                    const active = option === companyIvaStatus;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setCompanyIvaStatus(option);
                          setCompanyIvaPickerOpen(false);
                        }}
                        role="option"
                        aria-selected={active}
                        style={{
                          textAlign: "left",
                          padding: "12px 18px",
                          background: active ? "rgba(17,17,17,0.06)" : "transparent",
                          border: "none",
                          fontSize: 13,
                          fontWeight: active ? 600 : 500,
                          color: "#1f1f1f",
                          cursor: "pointer",
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        );
      case 1:
        return (
          <div style={{ display: "grid", gap: 18 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: "#555555" }}>Domicilio fiscal</span>
              <input
                value={companyFiscalAddress}
                onChange={(event) => setCompanyFiscalAddress(event.target.value)}
                onBlur={() => markCompanyTouched("fiscalAddress")}
                placeholder="Calle, número, localidad, provincia, CP"
                style={inputStyle}
              />
              {shouldShowCompanyError("fiscalAddress") ? <span style={errorStyle}>{companyErrors.fiscalAddress}</span> : null}
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: "#555555" }}>Email de facturación</span>
              <input
                value={companyBillingEmail}
                onChange={(event) => setCompanyBillingEmail(event.target.value)}
                onBlur={() => markCompanyTouched("billingEmail")}
                placeholder="empresa@correo.com"
                style={inputStyle}
              />
              {shouldShowCompanyError("billingEmail") ? <span style={errorStyle}>{companyErrors.billingEmail}</span> : null}
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: "#555555" }}>
                Teléfono de contacto (opcional)
              </span>
              <input
                value={companyContactPhone}
                onChange={(event) => setCompanyContactPhone(event.target.value)}
                placeholder="+54 9 …"
                style={inputStyle}
              />
            </label>
          </div>
        );
      default:
        return (
          <div style={{ display: "grid", gap: 18 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: "#555555" }}>
                Orden de compra (OC) (opcional)
              </span>
              <input
                value={companyPurchaseOrder}
                onChange={(event) => setCompanyPurchaseOrder(event.target.value)}
                placeholder=""
                style={inputStyle}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: "#555555" }}>Plazo de pago (opcional)</span>
              <select
                value={companyPaymentTerm}
                onChange={(event) => setCompanyPaymentTerm(event.target.value)}
                style={{
                  ...inputStyle,
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              >
                {PAYMENT_TERM_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: "#555555" }}>Notas (opcional)</span>
              <textarea
                value={companyNotes}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setCompanyNotes(event.target.value)}
                placeholder="Detalles adicionales para la factura"
                style={{ ...inputStyle, minHeight: 96, resize: "vertical" }}
              />
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 14,
                background: "#f5f5f5",
              }}
            >
              <input
                type="checkbox"
                checked={companyAcceptTerms}
                onChange={(event) => setCompanyAcceptTerms(event.target.checked)}
                onBlur={() => markCompanyTouched("acceptTerms")}
                style={{ width: 20, height: 20, marginTop: 2 }}
              />
              <span style={{ fontSize: 13, color: "#333333" }}>Acepto términos y privacidad</span>
            </label>
            {shouldShowCompanyError("acceptTerms") ? <span style={errorStyle}>{companyErrors.acceptTerms}</span> : null}
          </div>
        );
    }
  };

  const renderCompanyStepActions = () => {
    if (companyStep === totalCompanySteps - 1) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button type="button" onClick={handleCompanyBack} style={backButtonStyle}>
            ← Volver
          </button>
          <button
            type="submit"
            style={{
              ...primaryPillStyle,
              background: isCompanyFormValid ? "#111111" : "#c7c7c7",
              color: isCompanyFormValid ? "#f5f5f5" : "#555555",
              cursor: isCompanyFormValid ? "pointer" : "not-allowed",
            }}
            disabled={!isCompanyFormValid}
            aria-disabled={!isCompanyFormValid}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Generar solicitud de factura
          </button>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", justifyContent: companyStep === 0 ? "flex-end" : "space-between", gap: 12 }}>
        {companyStep > 0 ? (
          <button type="button" onClick={handleCompanyBack} style={backButtonStyle}>
            ← Volver
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleCompanyNext}
          style={{
            ...primaryPillStyle,
            opacity: advanceReady ? 1 : 0.65,
          }}
          aria-disabled={!advanceReady}
        >
          Continuar
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  };

  const companyFields = (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, color: "#777777" }}>
          Paso {companyStep + 1} de {totalCompanySteps}
        </span>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#111111" }}>{stepMeta.title}</div>
        <span style={{ fontSize: 13, color: "#555555" }}>{stepMeta.description}</span>
        <div style={{ height: 6, borderRadius: 999, background: "#ececec", overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.min(Math.max(companyProgress, 0), 100)}%`,
              height: "100%",
              borderRadius: 999,
              background: "#111111",
              transition: "width 0.25s ease",
            }}
          />
        </div>
      </div>
      {renderCompanyStepFields()}
      {renderCompanyStepActions()}
    </div>
  );

  const paddingTop = 20;
  const cardHalf = Math.max(cardHalfHeight, 80);
  const isCompanyMethod = activeMethod === "company";
  const formMarginTop = cardHalf + (isCompanyMethod ? 0 : 40);
  const formPaddingTop = 20;

  if (viewMode === "success") {
    const handleClose = () => {
      resetCompanyForm();
      setActiveMethod("company");
      setViewMode("form");
      const result: { method: PaymentMethod } = { method: "company" };
      onComplete(result);
    };
    return <BillingSuccessScreen onClose={handleClose} />;
  }

  const renderPaymentHeader = () => {
    const headerTop = -(cardHalf + paddingTop);

    const baseStyle: CSSProperties = {
      position: "absolute",
      top: headerTop,
      left: 12,
      right: 12,
      borderRadius: 20,
      padding: "22px 26px",
      color: "#f5f5f5",
      boxShadow: "0 20px 44px rgba(0,0,0,0.24)",
      background: "linear-gradient(135deg, #2f2f2f, #555555)",
    };

    if (activeMethod === "company") {
      return (
        <motion.div
          ref={cardRef}
          key="header-company"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          style={{ ...baseStyle, background: "linear-gradient(135deg, #1c1c1c, #343434)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ textTransform: "uppercase", letterSpacing: 1.6, fontSize: 12 }}>Company Billing</span>
            <motion.span
              key={companyInvoiceType}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.16)",
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              Invoice: {companyInvoiceType}
            </motion.span>
          </div>
          <span style={{ display: "block", marginTop: 18, fontSize: 14, color: "rgba(245,245,245,0.82)" }}>
            Completa los datos fiscales para generar la factura electrónica.
          </span>
        </motion.div>
      );
    }

    return (
      <motion.div
        ref={cardRef}
        key={`header-${activeMethod}`}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        style={baseStyle}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, letterSpacing: 1.4 }}>
          <span style={{ textTransform: "uppercase" }}>{cardMethodLabel}</span>
          <span>{previewExpiry}</span>
        </div>
        <div style={{ width: 42, height: 26, borderRadius: 10, background: "rgba(255,255,255,0.16)", marginTop: 18 }} />
        <div style={{ marginTop: 20, fontSize: 18, letterSpacing: 2.4, fontWeight: 700 }}>{previewNumber}</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2 }}>Card holder</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{previewName}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "right" }}>
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2 }}>CVV</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{previewCvv}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: "100%" }}>
      <div style={{ position: "relative" }}>
        <AnimatePresence mode="wait">{renderPaymentHeader()}</AnimatePresence>
        <form
          onSubmit={handleFormSubmit}
          style={{
            marginTop: formMarginTop,
            background: "#ffffff",
            borderRadius: 20,
            padding: `${formPaddingTop}px 18px 22px`,
            boxShadow: "0 20px 40px rgba(0,0,0,0.14)",
            display: "grid",
            gap: 22,
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
          }}
        >
          {segmentedControl}
          <AnimatePresence mode="wait">
            {activeMethod === "company" ? (
              <motion.div
                key={`company-fields-${companyStep}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                style={{ display: "flex", flexDirection: "column", gap: 22 }}
              >
                {companyFields}
              </motion.div>
            ) : (
              <motion.div
                key={`card-fields-${activeMethod}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {cardFields}
              </motion.div>
            )}
          </AnimatePresence>
          {activeMethod !== "company" ? <button type="submit" style={{ display: "none" }} aria-hidden="true" /> : null}
        </form>
      </div>
      {activeMethod !== "company" ? (
        <>
          <DragToPayControl amountLabel={totalFormatted} onConfirm={confirmCardPayment} disabled={!isCardFormValid} />
        </>
      ) : (
        null
      )}
    </div>
  );
}

function BillingSuccessScreen({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 22,
        background: "#ffffff",
        borderRadius: 24,
        padding: "56px 24px 36px",
        boxShadow: "0 24px 48px rgba(0,0,0,0.12)",
      }}
    >
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 999,
          background: "#eaf6ec",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="#2d7a36" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "center" }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#111111" }}>Solicitud enviada</span>
        <span style={{ fontSize: 14, color: "#4a4a4a" }}>
          Emitiremos la factura electrónica y la recibirás por email.
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{
          borderRadius: 999,
          border: "none",
          padding: "14px 28px",
          fontSize: 15,
          fontWeight: 700,
          background: "#111111",
          color: "#f5f5f5",
          cursor: "pointer",
        }}
      >
        Volver al inicio
      </button>
    </div>
  );
}

function DragToPayControl({
  amountLabel,
  onConfirm,
  disabled,
}: {
  amountLabel: string;
  onConfirm: () => void;
  disabled: boolean;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const [maxDrag, setMaxDrag] = useState(0);
  const [progress, setProgress] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [handleWidth, setHandleWidth] = useState(0);

  const updateBounds = useCallback(() => {
    const track = trackRef.current;
    const handle = handleRef.current;
    if (!track || !handle) {
      setMaxDrag(0);
      setTrackWidth(0);
      setHandleWidth(0);
      return;
    }
    const trackWidthValue = track.clientWidth;
    const handleWidthValue = handle.offsetWidth || DRAG_HANDLE_WIDTH;
    const innerWidth = Math.max(trackWidthValue - DRAG_HANDLE_OFFSET * 2, 0);
    setTrackWidth(trackWidthValue);
    setHandleWidth(handleWidthValue);
    const nextMax = Math.max(innerWidth - handleWidthValue, 0);
    setMaxDrag(nextMax);
    const current = x.get();
    if (current > nextMax) {
      x.set(nextMax);
    }
  }, [x]);

  useEffect(() => {
    updateBounds();
    const handleResize = () => updateBounds();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateBounds]);

  useEffect(() => {
    const current = x.get();
    if (current > maxDrag) {
      x.set(maxDrag);
    }
  }, [maxDrag, x]);

  useEffect(() => {
    const unsubscribe = x.on("change", (latest) => {
      if (maxDrag <= 0) {
        setProgress(0);
        return;
      }
      const ratio = Math.min(Math.max(latest / maxDrag, 0), 1);
      setProgress(ratio);
    });
    return () => unsubscribe();
  }, [x, maxDrag]);

  useEffect(() => {
    if (disabled) {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }, [disabled, x]);

  const handleDragEnd = () => {
    if (disabled || maxDrag <= 0) {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      return;
    }
    const current = x.get();
    if (current >= maxDrag * 0.88) {
      animate(x, maxDrag, { type: "spring", stiffness: 600, damping: 40 }).finished.then(onConfirm);
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

  const textColor = disabled ? "#7f7f7f" : progress > 0.65 ? "#f5f5f5" : "#111111";
  const fillWidth = useTransform(x, (latest) => {
    const trackInner = Math.max(trackWidth - DRAG_HANDLE_OFFSET * 2, 0);
    const effectiveHandle = handleWidth || DRAG_HANDLE_WIDTH;
    const clamped = Math.min(Math.max(latest, 0), maxDrag);
    const fill = Math.min(clamped + effectiveHandle, trackInner);
    return `${Math.max(fill, 0)}px`;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        ref={trackRef}
        role="button"
        aria-disabled={disabled}
        style={{
          position: "relative",
          width: "100%",
          height: 60,
          borderRadius: 20,
          background: disabled ? "#e3e3e3" : "#ebebeb",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          userSelect: "none",
          padding: `0 ${DRAG_HANDLE_OFFSET}px`,
          boxSizing: "border-box",
        }}
      >
        <motion.div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: DRAG_HANDLE_OFFSET,
            width: fillWidth,
            background: "#111111",
            borderRadius: 20,
          }}
        />
        <span style={{ position: "relative", zIndex: 1, fontSize: 14, fontWeight: 600, color: textColor }}>
          {disabled ? "Complete card details" : `Drag to pay ${amountLabel}`}
        </span>
        <motion.div
          ref={handleRef}
          drag={disabled ? false : "x"}
          dragConstraints={{ left: 0, right: maxDrag }}
          style={{
            x,
            position: "absolute",
            top: 0,
            bottom: 0,
            left: DRAG_HANDLE_OFFSET,
            width: DRAG_HANDLE_WIDTH,
            borderRadius: 20,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 700,
            color: "#111111",
            boxShadow: "0 16px 32px rgba(0,0,0,0.18)",
            border: "1px solid #c4c4c4",
            cursor: disabled ? "not-allowed" : "grab",
            touchAction: "pan-y",
          }}
          onDragEnd={handleDragEnd}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}

function QuoteSummaryStat({
  icon,
  label,
  value,
  detail,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 0", minWidth: 120 }}>
      {icon ? (
        <span
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            borderRadius: 10,
            background: "#111111",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f8f8f8",
          }}
        >
          {icon}
        </span>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, color: "#6f6f6f" }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111111", lineHeight: 1.2, wordBreak: "break-word" }}>{value}</span>
        {detail ? <span style={{ fontSize: 11.5, color: "#555555", whiteSpace: "nowrap" }}>{detail}</span> : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function StatBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontWeight: 700,
        fontSize: 16,
        color: "#111111",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#111111",
        }}
      >
        {icon}
      </div>
      <span>{label}</span>
    </div>
  );
}

function PriceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 3C7.864 3 4.5 6.364 4.5 10.5C4.5 14.636 7.864 18 12 18C16.136 18 19.5 14.636 19.5 10.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 7V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 9.5H13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.75 19C4.25 15.5 6.5 13.75 9 13.75C11.5 13.75 13.75 15.5 14.25 19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16.25 19.25C16.625 17.125 17.875 15.875 19.5 15.875"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EngineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="7" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 7V5H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 17V19H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 12H22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M2 12H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SummaryClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7V12L15.5 13.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SummaryCalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 4V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 4V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 10H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SummaryCurrencyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 7C9 5.343 10.343 4 12 4C13.657 4 15 5.343 15 7C15 8.657 13.657 10 12 10H11C9.343 10 8 11.343 8 13C8 14.657 9.343 16 11 16H14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 2V22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function formatMinutes(minutes: number) {
  if (!minutes || Number.isNaN(minutes)) {
    return "—";
  }
  const rounded = Math.round(minutes);
  if (rounded < 60) {
    return `${rounded} min`;
  }
  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}
