import type { VehicleTypeId } from "../types/vehicles";

export type LngLat = { lng: number; lat: number };

export const BA_CENTER: LngLat = { lng: -58.3816, lat: -34.6037 };
export const BOUNDS = { west: -58.52, south: -34.71, east: -58.31, north: -34.54 };

const LNG_STEP = 0.0085;
const LAT_STEP = 0.008;

const lngSegments = buildAxis(BOUNDS.west, BOUNDS.east, LNG_STEP);
const latSegments = buildAxis(BOUNDS.south, BOUNDS.north, LAT_STEP);

export type VehicleState = "idle" | "enroute" | "arrived";

export interface BAVehicle {
  id: string;
  typeId: VehicleTypeId;
  pos: LngLat;
  speed: number;
  heading: number;
  waypoints: LngLat[];
  state: VehicleState;
}

export const randBetween = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function snapToBounds(point: LngLat): LngLat {
  return {
    lng: clamp(point.lng, BOUNDS.west, BOUNDS.east),
    lat: clamp(point.lat, BOUNDS.south, BOUNDS.north),
  };
}

function buildAxis(from: number, to: number, step: number) {
  const values: number[] = [];
  let current = from;
  while (current <= to) {
    values.push(Number(current.toFixed(5)));
    current += step;
  }
  return values;
}

function nearestValue(value: number, axis: number[]): number {
  return axis.reduce((closest, candidate) =>
    Math.abs(candidate - value) < Math.abs(closest - value) ? candidate : closest
  );
}

export function closestIntersection(point: LngLat): LngLat {
  return {
    lng: nearestValue(point.lng, lngSegments),
    lat: nearestValue(point.lat, latSegments),
  };
}

export function stepTowards(current: LngLat, target: LngLat, stepDeg: number) {
  const dx = target.lng - current.lng;
  const dy = target.lat - current.lat;
  const distance = Math.hypot(dx, dy);
  if (distance <= stepDeg) {
    return { next: { ...target }, arrived: true };
  }
  return {
    next: {
      lng: current.lng + (dx / distance) * stepDeg,
      lat: current.lat + (dy / distance) * stepDeg,
    },
    arrived: false,
  };
}

export function advanceVehicle(vehicle: BAVehicle): BAVehicle {
  if (vehicle.state !== "enroute" || vehicle.waypoints.length === 0) {
    return vehicle;
  }
  const target = vehicle.waypoints[0];
  const { next, arrived } = stepTowards(vehicle.pos, target, vehicle.speed);
  const heading = Math.atan2(target.lat - vehicle.pos.lat, target.lng - vehicle.pos.lng);
  if (arrived) {
    const remaining = vehicle.waypoints.slice(1);
    if (remaining.length === 0) {
      return { ...vehicle, pos: target, heading, waypoints: [], state: "arrived" };
    }
    return { ...vehicle, pos: target, heading, waypoints: remaining };
  }
  return { ...vehicle, pos: next, heading };
}

export function lShapePath(from: LngLat, to: LngLat): [number, number][] {
  return [
    [from.lng, from.lat],
    [to.lng, from.lat],
    [to.lng, to.lat],
  ];
}

function axisIndex(value: number, axis: number[]) {
  const nearest = nearestValue(value, axis);
  return axis.indexOf(nearest);
}

export function pathToDestination(from: LngLat, to: LngLat): LngLat[] {
  const start = closestIntersection(from);
  const target = closestIntersection(to);
  const route: LngLat[] = [];

  const startLngIndex = axisIndex(start.lng, lngSegments);
  const targetLngIndex = axisIndex(target.lng, lngSegments);
  const startLatIndex = axisIndex(start.lat, latSegments);
  const targetLatIndex = axisIndex(target.lat, latSegments);

  let currentLngIndex = startLngIndex;
  let currentLatIndex = startLatIndex;

  const lngStepDirection = Math.sign(targetLngIndex - startLngIndex);
  while (currentLngIndex !== targetLngIndex) {
    currentLngIndex += lngStepDirection;
    route.push({ lng: lngSegments[currentLngIndex], lat: latSegments[currentLatIndex] });
  }

  const latStepDirection = Math.sign(targetLatIndex - startLatIndex);
  while (currentLatIndex !== targetLatIndex) {
    currentLatIndex += latStepDirection;
    route.push({ lng: lngSegments[currentLngIndex], lat: latSegments[currentLatIndex] });
  }

  if (route.length === 0 || route[route.length - 1].lng !== target.lng || route[route.length - 1].lat !== target.lat) {
    route.push(target);
  }

  return route;
}

export function initializeVehiclesFromUnits(units: { id: string; typeId: VehicleTypeId; lng: number; lat: number }[]): BAVehicle[] {
  return units.map((unit) => ({
    id: unit.id,
    typeId: unit.typeId,
    pos: closestIntersection({ lng: unit.lng, lat: unit.lat }),
    speed: randBetween(0.00004, 0.00007),
    heading: 0,
    waypoints: [],
    state: "idle",
  }));
}
