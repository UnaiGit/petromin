import { create } from "zustand";
import {
  corporateCompanies,
  demoOrders,
  destinations as destinationList,
  drivers as driverList,
  vehicles as baseVehicles,
} from "../data/mockData";
import { CitySimulation } from "../sim/citySimulation";
import { BA_CENTER, advanceVehicle, closestIntersection, initializeVehiclesFromUnits, snapToBounds } from "../sim/baSimulation";
import type { BAVehicle, LngLat, VehicleState } from "../sim/baSimulation";
import { VEHICLE_TYPES } from "../data/vehicleAssets";
import { VEHICLE_UNITS } from "../data/vehicleSeeds";
import type { VehicleCategory as FleetCategory, VehicleTypeAsset, VehicleTypeId, VehicleUnit } from "../types/vehicles";
import type {
  AdminNavSection,
  AnalyticsEvent,
  CatalogFilters,
  CompanyOnboardingDraft,
  CompanyProfile,
  CorporateMode,
  CorporateNavSection,
  Destination,
  Driver,
  OrderFilters,
  OrderPurchase,
  OrderStatus,
  QuoteBreakdownItem,
  Ride,
  RideHistoryItem,
  RideRoute,
  RideStatus,
  Vehicle,
  VehicleCategory as RideVehicleCategory,
} from "../types";

const METERS_PER_UNIT = 40;
const simulation = new CitySimulation(baseVehicles, { seed: 7, citySize: 160 });

type MapRideStatus = "idle" | "enroute" | "arrived";
type MapFlowStep = "catalog" | "vehicle_detail" | "quote" | "payment";

let mapSimTimer: number | null = null;

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const MAPBOX_DIRECTIONS_ENDPOINT = "https://api.mapbox.com/directions/v5/mapbox/driving";

const seededMapVehicles = initializeVehiclesFromUnits(VEHICLE_UNITS);
const seededUnitState: VehicleUnit[] = VEHICLE_UNITS.map((unit) => {
  const vehicle = seededMapVehicles.find((item) => item.id === unit.id);
  return vehicle
    ? { ...unit, lng: vehicle.pos.lng, lat: vehicle.pos.lat }
    : unit;
});

async function fetchMapboxRoute(origin: LngLat, destination: LngLat) {
  if (!MAPBOX_TOKEN) {
    throw new Error("Missing Mapbox token for directions.");
  }
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `${MAPBOX_DIRECTIONS_ENDPOINT}/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox directions error ${response.status}`);
  }
  const data = (await response.json()) as {
    routes?: Array<{
      geometry?: { coordinates?: [number, number][] };
      distance?: number;
      duration?: number;
    }>;
  };
  const route = data.routes?.[0];
  const coordinates = route?.geometry?.coordinates;
  if (!coordinates || coordinates.length === 0) {
    throw new Error("Mapbox directions returned no route");
  }
  const distanceKm = route?.distance ? route.distance / 1000 : 0;
  const durationMinutes = route?.duration ? route.duration / 60 : 0;
  return { coordinates, distanceKm, durationMinutes };
}

const driverMap: Record<string, Driver> = driverList.reduce(
  (acc, driver) => {
    acc[driver.id] = driver;
    return acc;
  },
  {} as Record<string, Driver>
);

const initialVehicles = simulation.tick(0.1);

const defaultQuote: QuoteBreakdownItem[] = [
  { label: "Base fare", value: "€4.20" },
  { label: "Distance", value: "€5.60" },
  { label: "Time", value: "€1.30" },
  { label: "Fees", value: "€1.30" },
];

const defaultCatalogFilters: CatalogFilters = {
  destinationId: destinationList[0]?.id ?? "",
  dateFrom: null,
  dateTo: null,
  category: "all",
  passengers: null,
};

const defaultOrderFilters: OrderFilters = {
  status: "all",
  destinationId: "all",
  dateFrom: null,
  dateTo: null,
};

const initialCompany = corporateCompanies[0] ?? null;

function createOnboardingDraft(): CompanyOnboardingDraft {
  return {
    step: 1,
    legalName: "",
    taxId: "",
    billingAddress: "",
    country: "",
    billingContact: { name: "", email: "", phone: "" },
    documents: [],
    paymentTerms: undefined,
    contractAccepted: false,
    signature: undefined,
    status: "idle",
    error: undefined,
  };
}

interface AppState {
  vehicles: Vehicle[];
  drivers: Record<string, Driver>;
  destinations: Destination[];
  company: CompanyProfile | null;
  corporateMode: CorporateMode;
  corporateTab: CorporateNavSection;
  adminSection: AdminNavSection;
  onboardingDraft: CompanyOnboardingDraft;
  catalogFilters: CatalogFilters;
  orders: OrderPurchase[];
  orderFilters: OrderFilters;
  selectedOrderId: string | null;
  analytics: AnalyticsEvent[];
  mapViewState: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
  mapVehicles: BAVehicle[];
  mapFilter: FleetCategory;
  mapSelectedVehicleId: string | null;
  mapDestination: LngLat | null;
  mapRouteGeoJSON: GeoJSON.FeatureCollection | null;
  mapRouteMeta: { distanceKm: number; durationMinutes: number } | null;
  mapFlyToTarget: { lng: number; lat: number; zoom?: number } | null;
  mapRideStatus: MapRideStatus;
  mapFlowStep: MapFlowStep;
  mapBookingStartDate: string | null;
  mapBookingEndDate: string | null;
  vehicleCategory: FleetCategory;
  vehicleType: VehicleTypeId | null;
  vehicleTypes: VehicleTypeAsset[];
  vehicleUnits: VehicleUnit[];
  selectedCategory: RideVehicleCategory;
  selectedVehicleId: string | null;
  ride: Ride | null;
  quote: QuoteBreakdownItem[];
  history: RideHistoryItem[];
  sheetExpanded: boolean;
  activeRideVehicleId: string | null;
  rideRoute: RideRoute | null;
  setCategory: (category: RideVehicleCategory) => void;
  selectVehicle: (vehicleId: string | null) => void;
  tickVehicles: (dt: number) => void;
  randomizeCity: (seed?: number) => void;
  updateRide: (next: Partial<Ride>) => void;
  setRideStatus: (status: RideStatus) => void;
  pushHistory: (entry: RideHistoryItem) => void;
  toggleSheet: (expanded: boolean) => void;
  setActiveRideVehicle: (vehicleId: string | null) => void;
  startRideRoute: (route: RideRoute) => void;
  clearRideRoute: () => void;
  resetRide: () => void;
  mapDestinationLabel: string | null;
  isMapPickingDestination: boolean;
  setMapDestinationLabel: (label: string | null) => void;
  setIsMapPickingDestination: (value: boolean) => void;
  requestMapFlyTo: (target: { lng: number; lat: number; zoom?: number }) => void;
  consumeMapFlyToTarget: () => void;
  setMapFilter: (filter: FleetCategory) => void;
  setMapFlowStep: (step: MapFlowStep) => void;
  selectMapVehicle: (id: string | null) => void;
  setMapDestination: (point: LngLat | null) => void;
  setMapBookingRange: (range: { start: string | null; end: string | null }) => void;
  computeMapRoute: () => Promise<void>;
  tickMapVehicles: () => void;
  startMapSimLoop: () => void;
  confirmMapRequest: () => Promise<void>;
  resetMapRide: () => void;
  clearMapSelection: () => void;
  setVehicleCategory: (category: FleetCategory) => void;
  setVehicleType: (type: VehicleTypeId | null) => void;
  addVehicleUnit: (unit: VehicleUnit) => void;
  getFilteredUnits: () => VehicleUnit[];
  getTypeById: (id: VehicleTypeId) => VehicleTypeAsset;
  setCorporateMode: (mode: CorporateMode) => void;
  setCorporateTab: (section: CorporateNavSection) => void;
  setAdminSection: (section: AdminNavSection) => void;
  updateCompany: (updater: (company: CompanyProfile | null) => CompanyProfile | null) => void;
  updateOnboardingDraft: (patch: Partial<CompanyOnboardingDraft>) => void;
  resetOnboarding: () => void;
  completeOnboarding: (company: CompanyProfile) => void;
  setCatalogFilters: (filters: Partial<CatalogFilters>) => void;
  setOrderFilters: (filters: Partial<OrderFilters>) => void;
  submitOrder: (order: Omit<OrderPurchase, "id" | "status" | "submittedAt" | "artifacts"> & { id?: string; artifacts?: OrderPurchase["artifacts"] }) => OrderPurchase;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus, notes?: string) => void;
  selectOrder: (orderId: string | null) => void;
  trackEvent: (event: AnalyticsEvent) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  vehicles: initialVehicles,
  drivers: driverMap,
  destinations: destinationList,
  company: initialCompany,
  corporateMode: "consumer",
  corporateTab: "home",
  adminSection: "overview",
  onboardingDraft: createOnboardingDraft(),
  catalogFilters: defaultCatalogFilters,
  orders: demoOrders,
  orderFilters: defaultOrderFilters,
  selectedOrderId: null,
  analytics: [],
  mapViewState: { longitude: BA_CENTER.lng, latitude: BA_CENTER.lat, zoom: 14.3, pitch: 60, bearing: -15 },
  mapVehicles: seededMapVehicles,
  mapFilter: "suv4x4",
  mapSelectedVehicleId: null,
  mapDestination: null,
  mapRouteGeoJSON: null,
  mapRouteMeta: null,
  mapFlyToTarget: null,
  mapRideStatus: "idle",
  mapFlowStep: "catalog",
  mapBookingStartDate: null,
  mapBookingEndDate: null,
  mapDestinationLabel: null,
  isMapPickingDestination: false,
  vehicleCategory: "suv4x4",
  vehicleType: null,
  vehicleTypes: VEHICLE_TYPES,
  vehicleUnits: seededUnitState,
  selectedCategory: "electric",
  selectedVehicleId: initialVehicles[0]?.id ?? null,
  ride: null,
  quote: defaultQuote,
  history: [],
  sheetExpanded: false,
  activeRideVehicleId: null,
  rideRoute: null,
  setCategory: (category) => {
    const { vehicles } = get();
    const firstMatch = vehicles.find((vehicle) => vehicle.category === category) ?? null;
    set({ selectedCategory: category, selectedVehicleId: firstMatch?.id ?? null });
  },
  selectVehicle: (vehicleId) => {
    set({ selectedVehicleId: vehicleId });
  },
  tickVehicles: (dt) => {
    const updated = simulation.tick(dt);
    const state = get();
    let vehicles = updated;
    let route = state.rideRoute;
    let rideUpdate: Ride | null = state.ride ? { ...state.ride } : null;
    let completedPhase: RideRoute["phase"] | null = null;

    if (route && state.activeRideVehicleId) {
      const currentRoute = route;
      const nextProgress = Math.min(1, currentRoute.progress + dt / Math.max(currentRoute.duration, 0.1));
      const pose = getRoutePose(currentRoute.points, nextProgress);
      const remainingMeters = computeRemainingDistance(currentRoute.points, nextProgress) * METERS_PER_UNIT;
      vehicles = updated.map((vehicle) =>
        vehicle.id === state.activeRideVehicleId
          ? {
              ...vehicle,
              position: { x: pose.x, y: pose.y },
              heading: pose.heading,
              distanceText: formatDistance(remainingMeters),
              etaSeconds: Math.max(30, Math.round((1 - nextProgress) * currentRoute.duration * 60)),
            }
          : vehicle
      );

      if (rideUpdate) {
        rideUpdate = {
          ...rideUpdate,
          etaSec: Math.max(30, Math.round((1 - nextProgress) * currentRoute.duration * 60)),
        };
      }

      if (nextProgress >= 1) {
        completedPhase = currentRoute.phase;
        route = null;
      } else {
        route = { ...currentRoute, progress: nextProgress };
      }
    }

    if (completedPhase && rideUpdate) {
      if (completedPhase === "pickup") {
        rideUpdate = { ...rideUpdate, status: "waiting_pickup", etaSec: 0 };
      } else {
        rideUpdate = { ...rideUpdate, status: "payment", etaSec: 0 };
      }
    }

    const { selectedVehicleId } = state;
    const nextSelected =
      selectedVehicleId && vehicles.some((vehicle) => vehicle.id === selectedVehicleId)
        ? selectedVehicleId
        : vehicles[0]?.id ?? null;

    set({
      vehicles,
      selectedVehicleId: nextSelected,
      rideRoute: route,
      ride: rideUpdate,
    });
  },
  randomizeCity: (seed) => {
    simulation.randomize(seed);
    const refreshed = simulation.tick(0.1);
    set({ vehicles: refreshed });
  },
  updateRide: (next) => {
    set(({ ride }) => ({ ride: { ...(ride ?? createEmptyRide()), ...next } }));
  },
  setRideStatus: (status) => {
    set(({ ride }) => ({ ride: { ...(ride ?? createEmptyRide()), status } }));
  },
  pushHistory: (entry) => {
    set(({ history }) => ({ history: [entry, ...history] }));
  },
  toggleSheet: (expanded) => set({ sheetExpanded: expanded }),
  setActiveRideVehicle: (vehicleId) => set({ activeRideVehicleId: vehicleId }),
  startRideRoute: (route) => set({ rideRoute: route }),
  clearRideRoute: () => set({ rideRoute: null }),
  resetRide: () => set({
    ride: createEmptyRide(),
    rideRoute: null,
    activeRideVehicleId: null,
  }),
  setMapFilter: (filter) => set({ mapFilter: filter }),
  setMapFlowStep: (step) => set({ mapFlowStep: step }),
  setMapDestinationLabel: (label) => set({ mapDestinationLabel: label }),
  setIsMapPickingDestination: (value) => set({ isMapPickingDestination: value }),
  requestMapFlyTo: (target) => set({ mapFlyToTarget: target }),
  consumeMapFlyToTarget: () => set({ mapFlyToTarget: null }),
  selectMapVehicle: (id) => {
    if (!id) {
      set({
        mapSelectedVehicleId: null,
        mapFlowStep: "catalog",
        mapDestination: null,
        mapRouteGeoJSON: null,
        mapRouteMeta: null,
        mapDestinationLabel: null,
        isMapPickingDestination: false,
      });
      return;
    }
    const state = get();
    const unit = state.vehicleUnits.find((item) => item.id === id);
    if (!unit) {
      return;
    }
    const asset = state.vehicleTypes.find((item) => item.id === unit.typeId);
    if (!asset) {
      return;
    }
    set({
      mapSelectedVehicleId: id,
      mapDestination: null,
      mapRouteGeoJSON: null,
      mapRouteMeta: null,
      mapBookingStartDate: null,
      mapBookingEndDate: null,
      mapRideStatus: "idle",
      mapFlowStep: "vehicle_detail",
      mapDestinationLabel: null,
      isMapPickingDestination: false,
      mapFlyToTarget: { lng: unit.lng, lat: unit.lat, zoom: 15.2 },
      vehicleCategory: asset.category,
      mapFilter: asset.category,
      vehicleType: null,
    });
  },
  setMapDestination: (point) => {
    const step = get().mapFlowStep;
    if (step !== "vehicle_detail") {
      return;
    }
    const destination = point ? snapToBounds(point) : null;
    set({ mapDestination: destination, mapRouteMeta: null });
    if (destination && get().mapSelectedVehicleId) {
      void get().computeMapRoute();
    } else if (!destination) {
      set({ mapRouteGeoJSON: null, mapDestinationLabel: null });
    }
  },
  setMapBookingRange: (range) => {
    const { start, end } = range;
    let nextStart = start;
    let nextEnd = end;
    if (nextStart && nextEnd && nextStart > nextEnd) {
      nextStart = end;
      nextEnd = start;
    }
    set({ mapBookingStartDate: nextStart ?? null, mapBookingEndDate: nextEnd ?? null });
  },
  computeMapRoute: async () => {
    const { mapSelectedVehicleId, mapDestination, mapVehicles, mapRideStatus, mapFlowStep } = get();
    if (mapRideStatus === "enroute" || mapFlowStep !== "vehicle_detail") {
      return;
    }
    if (!mapSelectedVehicleId || !mapDestination) {
      set({ mapRouteGeoJSON: null });
      return;
    }
    const vehicle = mapVehicles.find((item) => item.id === mapSelectedVehicleId);
    if (!vehicle) {
      return;
    }
    try {
      const { coordinates, distanceKm, durationMinutes } = await fetchMapboxRoute(vehicle.pos, mapDestination);
      const route: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates },
          },
        ],
      };
      set({ mapRouteGeoJSON: route, mapRouteMeta: { distanceKm, durationMinutes } });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to compute preview route", error);
      set({ mapRouteGeoJSON: null, mapRouteMeta: null });
    }
  },
  tickMapVehicles: () => {
    let arrived = false;
    const updated = get().mapVehicles.map((vehicle) => {
      const next = advanceVehicle(vehicle);
      if (vehicle.state === "enroute" && next.state === "arrived") {
        arrived = true;
      }
      return next;
    });
    const updatedUnits = get().vehicleUnits.map((unit) => {
      const vehicle = updated.find((item) => item.id === unit.id);
      return vehicle ? { ...unit, lng: vehicle.pos.lng, lat: vehicle.pos.lat } : unit;
    });
    set({ mapVehicles: updated, vehicleUnits: updatedUnits });
    if (arrived) {
      set({ mapRideStatus: "arrived", mapRouteGeoJSON: null });
    }
  },
  startMapSimLoop: () => {
    if (typeof window === "undefined") {
      return;
    }
    if (mapSimTimer) {
      return;
    }
    mapSimTimer = window.setInterval(() => {
      get().tickMapVehicles();
    }, 100);
  },
  confirmMapRequest: async () => {
    const { mapSelectedVehicleId, mapDestination, mapRouteMeta, mapFlowStep } = get();
    if (!mapSelectedVehicleId || !mapDestination) {
      return;
    }
    if (mapFlowStep !== "vehicle_detail") {
      return;
    }
    if (!mapRouteMeta) {
      await get().computeMapRoute();
    }
    set({ mapFlowStep: "quote", mapRideStatus: "idle", isMapPickingDestination: false });
  },
  resetMapRide: () => {
    set(({ mapVehicles, vehicleUnits }) => ({
      mapRideStatus: "idle",
      mapRouteGeoJSON: null,
      mapDestination: null,
      mapSelectedVehicleId: null,
      mapRouteMeta: null,
      mapDestinationLabel: null,
      isMapPickingDestination: false,
      mapFlyToTarget: null,
      mapBookingStartDate: null,
      mapBookingEndDate: null,
      mapVehicles: mapVehicles.map((vehicle) => ({ ...vehicle, waypoints: [], state: "idle" as VehicleState })),
      vehicleUnits: vehicleUnits.map((unit) => {
        const current = mapVehicles.find((vehicle) => vehicle.id === unit.id);
        return current ? { ...unit, lng: current.pos.lng, lat: current.pos.lat } : unit;
      }),
      mapFlowStep: "catalog",
    }));
  },
  clearMapSelection: () => {
    set({
      mapSelectedVehicleId: null,
      mapDestination: null,
      mapRouteGeoJSON: null,
      mapRouteMeta: null,
      mapRideStatus: "idle",
      mapFlowStep: "catalog",
      mapDestinationLabel: null,
      isMapPickingDestination: false,
      mapFlyToTarget: null,
      mapBookingStartDate: null,
      mapBookingEndDate: null,
    });
  },
  setVehicleCategory: (category) => {
    set({
      vehicleCategory: category,
      vehicleType: null,
      mapFilter: category,
      mapSelectedVehicleId: null,
      mapDestination: null,
      mapRouteGeoJSON: null,
      mapRouteMeta: null,
      mapRideStatus: "idle",
      mapFlowStep: "catalog",
      mapDestinationLabel: null,
      isMapPickingDestination: false,
      mapBookingStartDate: null,
      mapBookingEndDate: null,
    });
  },
  setVehicleType: (type) => set({ vehicleType: type }),
  addVehicleUnit: (unit) => {
    const vehicle: BAVehicle = {
      id: unit.id,
      typeId: unit.typeId,
      pos: closestIntersection(BA_CENTER),
      speed: 0.00005,
      heading: 0,
      waypoints: [],
      state: "idle",
    };
    set(({ vehicleUnits, mapVehicles }) => ({
      vehicleUnits: [...vehicleUnits, unit],
      mapVehicles: [...mapVehicles, vehicle],
    }));
  },
  getFilteredUnits: () => {
    const state = get();
    const allowedTypeIds = state.vehicleTypes
      .filter((item) => item.category === state.vehicleCategory)
      .map((item) => item.id);
    return state.vehicleUnits.filter((unit) => allowedTypeIds.includes(unit.typeId));
  },
  getTypeById: (id) => {
    const asset = get().vehicleTypes.find((item) => item.id === id);
    if (!asset) {
      throw new Error(`Unknown vehicle type ${id}`);
    }
    return asset;
  },
  setCorporateMode: (mode) => {
    if (mode === "corporate") {
      const company = get().company;
      const target: CorporateNavSection =
        company && company.verificationStatus === "approved"
          ? "catalog"
          : company
          ? "company"
          : "company";
      set({ corporateMode: mode, corporateTab: target });
    } else if (mode === "admin") {
      const currentAdminSection = get().adminSection ?? "overview";
      set({ corporateMode: mode, corporateTab: "home", adminSection: currentAdminSection });
    } else {
      set({ corporateMode: mode, corporateTab: "home" });
    }
  },
  setCorporateTab: (section) => set({ corporateTab: section }),
  setAdminSection: (section) => set({ adminSection: section }),
  updateCompany: (updater) => {
    set((state) => ({ company: updater(state.company) }));
  },
  updateOnboardingDraft: (patch) => {
    set(({ onboardingDraft }) => ({ onboardingDraft: { ...onboardingDraft, ...patch } }));
  },
  resetOnboarding: () => set({ onboardingDraft: createOnboardingDraft() }),
  completeOnboarding: (company) => {
    const track = get().trackEvent;
    if (company.contract?.version && company.contract.signedAt) {
      track({ type: "b2b_contract_signed", version: company.contract.version });
    }
    set({
      company,
      corporateMode: "corporate",
      corporateTab: "catalog",
      onboardingDraft: createOnboardingDraft(),
    });
  },
  setCatalogFilters: (filters) => {
    let destinationId = get().catalogFilters.destinationId;
    set(({ catalogFilters }) => {
      const next = { ...catalogFilters, ...filters };
      destinationId = next.destinationId;
      return { catalogFilters: next };
    });
    const track = get().trackEvent;
    track({ type: "catalog_view", destinationId, filters });
  },
  setOrderFilters: (filters) => {
    set(({ orderFilters }) => ({ orderFilters: { ...orderFilters, ...filters } }));
  },
  submitOrder: (input) => {
    const id = input.id ?? `o-${Date.now()}`;
    const submittedAt = new Date().toISOString();
    const order: OrderPurchase = {
      ...input,
      id,
      status: "review",
      submittedAt,
      artifacts: input.artifacts ?? {},
      signature: input.signature ?? null,
    };
    set(({ orders }) => ({ orders: [order, ...orders] }));
    const company = get().company;
    if (company) {
      const nextCreditUsed = (company.creditUsed ?? 0) + order.total;
      set({
        company: {
          ...company,
          creditUsed: nextCreditUsed,
        },
      });
    }
    get().trackEvent({
      type: "order_submitted",
      vehicleId: order.vehicleId,
      days: order.days,
      total: order.total,
      netTerms: order.paymentTerm,
    });
    return order;
  },
  updateOrderStatus: (orderId, nextStatus, notes) => {
    set(({ orders }) => ({
      orders: orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: nextStatus,
              approvedAt: nextStatus === "approved" ? new Date().toISOString() : order.approvedAt,
              notes: notes ?? order.notes,
            }
          : order
      ),
    }));
  },
  selectOrder: (orderId) => set({ selectedOrderId: orderId }),
  trackEvent: (event) => {
    set(({ analytics }) => ({ analytics: [...analytics, event] }));
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.info("[analytics]", event);
    }
  },
}));

function getRoutePose(points: RideRoute["points"], progress: number) {
  if (points.length < 2) {
    const point = points[0] ?? { x: 0, y: 0 };
    return { x: point.x, y: point.y, heading: 0 };
  }

  const clamped = Math.min(Math.max(progress, 0), 1);
  let totalLength = 0;
  const segments: number[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const length = Math.hypot(dx, dy);
    segments.push(length);
    totalLength += length;
  }

  let targetDistance = totalLength * clamped;
  let accumulated = 0;

  for (let i = 0; i < segments.length; i += 1) {
    const segmentLength = segments[i];
    const start = points[i];
    const end = points[i + 1];
    if (accumulated + segmentLength >= targetDistance) {
      const remainder = targetDistance - accumulated;
      const ratio = segmentLength === 0 ? 0 : remainder / segmentLength;
      const x = start.x + (end.x - start.x) * ratio;
      const y = start.y + (end.y - start.y) * ratio;
      const heading = Math.atan2(end.y - start.y, end.x - start.x);
      return { x, y, heading };
    }
    accumulated += segmentLength;
  }

  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return { x: last.x, y: last.y, heading: Math.atan2(last.y - prev.y, last.x - prev.x) };
}

function computeRemainingDistance(points: RideRoute["points"], progress: number) {
  if (points.length < 2) return 0;
  const clamped = Math.min(Math.max(progress, 0), 1);
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    totalLength += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return totalLength * (1 - clamped);
}

function formatDistance(meters: number) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km away`;
  }
  return `${Math.round(meters / 10) * 10} m away`;
}

function createEmptyRide(): Ride {
  return {
    id: "demo-ride",
    pickup: { lat: 0, lng: 0 },
    dropoff: { lat: 48, lng: -36 },
    status: "idle",
    etaSec: 0,
    priceEst: { currency: "EUR", value: 12.4 },
  };
}
