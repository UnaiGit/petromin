import type { SimulationConfig, Vehicle } from "../types";

const METERS_PER_UNIT = 40;

const defaultConfig: SimulationConfig = {
  seed: 1,
  carCount: 12,
  citySize: 160,
};

type Orientation = "horizontal" | "vertical";

interface CarRuntime {
  direction: Orientation;
  lane: number;
  position: number;
  forward: boolean;
  speed: number;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km away`;
  }
  return `${Math.round(meters / 10) * 10} m away`;
}

function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (1664525 * state + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export class CitySimulation {
  private config: SimulationConfig;
  private random: () => number;
  private lanes: number[] = [];
  private runtime = new Map<string, CarRuntime>();
  private vehicles: Vehicle[];

  constructor(vehicles: Vehicle[], config?: Partial<SimulationConfig>) {
    this.config = { ...defaultConfig, ...config };
    this.random = createRandom(this.config.seed);
    this.vehicles = vehicles;
    this.configureLanes();
    this.bootstrapRuntime();
  }

  private configureLanes() {
    const half = this.config.citySize / 2;
    const laneCount = 5;
    const spacing = this.config.citySize / (laneCount + 1);
    this.lanes = Array.from({ length: laneCount }).map((_, idx) => -half + spacing * (idx + 1));
  }

  private bootstrapRuntime() {
    this.runtime.clear();
    this.vehicles.forEach((vehicle) => {
      this.runtime.set(vehicle.id, this.createRuntime(vehicle));
    });
  }

  private createRuntime(vehicle: Vehicle): CarRuntime {
    const direction: Orientation = this.random() > 0.5 ? "horizontal" : "vertical";
    const lane = this.lanes[Math.floor(this.random() * this.lanes.length)] ?? 0;
    const forward = this.random() > 0.5;
    const half = this.config.citySize / 2;
    const position = this.random() * this.config.citySize - half;
    return {
      direction,
      lane,
      position,
      forward,
      speed: vehicle.speed,
    };
  }

  tick(dt: number): Vehicle[] {
    const half = this.config.citySize / 2;
    const updated = this.vehicles.map((vehicle) => {
      const runtime = this.runtime.get(vehicle.id);
      if (!runtime) {
        return vehicle;
      }
      const speedUnits = runtime.speed / METERS_PER_UNIT;
      runtime.position += (runtime.forward ? 1 : -1) * speedUnits * dt;

      if (runtime.position > half) {
        runtime.position = -half;
        this.reseedRuntime(runtime);
      } else if (runtime.position < -half) {
        runtime.position = half;
        this.reseedRuntime(runtime);
      }

      const { x, y, heading } = this.computePose(runtime);
      const distanceMeters = Math.hypot(x, y) * METERS_PER_UNIT;
      const etaSeconds = Math.max(45, Math.round(distanceMeters / Math.max(runtime.speed, 1)));

      return {
        ...vehicle,
        position: { x, y },
        heading,
        distanceText: formatDistance(distanceMeters),
        etaSeconds,
      };
    });

    this.vehicles = updated;
    return updated;
  }

  private reseedRuntime(runtime: CarRuntime) {
    runtime.direction = this.random() > 0.5 ? "horizontal" : "vertical";
    runtime.lane = this.lanes[Math.floor(this.random() * this.lanes.length)] ?? 0;
    runtime.forward = this.random() > 0.5;
  }

  private computePose(runtime: CarRuntime) {
    if (runtime.direction === "horizontal") {
      const x = runtime.position;
      const y = runtime.lane;
      const heading = runtime.forward ? 0 : Math.PI;
      return { x, y, heading };
    }
    const x = runtime.lane;
    const y = runtime.position;
    const heading = runtime.forward ? Math.PI / 2 : (3 * Math.PI) / 2;
    return { x, y, heading };
  }

  randomize(seed?: number) {
    if (typeof seed === "number") {
      this.random = createRandom(seed);
    }
    this.bootstrapRuntime();
  }

  updateVehicles(vehicles: Vehicle[]) {
    this.vehicles = vehicles;
    this.bootstrapRuntime();
  }
}
