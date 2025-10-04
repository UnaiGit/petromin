import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "../state/useAppStore";
import type { Vehicle } from "../types";

const CITY_SIZE = 160;
const ROAD_WIDTH = 6;

export function CityCanvas() {
  const selectVehicle = useAppStore((state) => state.selectVehicle);
  const updateRide = useAppStore((state) => state.updateRide);
  const ride = useAppStore((state) => state.ride);
  const rideRoute = useAppStore((state) => state.rideRoute);

  const routePoints = useMemo(() => {
    if (rideRoute) {
      return rideRoute.points;
    }
    if (ride && ride.status && ride.status !== "idle") {
      return createRoutePoints(
        { x: ride.pickup.lat, y: ride.pickup.lng },
        { x: ride.dropoff.lat, y: ride.dropoff.lng }
      );
    }
    return null;
  }, [rideRoute, ride?.status, ride?.pickup, ride?.dropoff]);

  const handleGroundTap = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const { x, z } = event.point;
      updateRide({ pickup: { lat: x, lng: z } });
    },
    [updateRide]
  );

  return (
    <div className="city-canvas">
      <Canvas
        shadows
        dpr={[1, 1.8]}
        eventPrefix="client"
        camera={{ position: [110, 150, 110], fov: 38, near: 0.1, far: 600 }}
      >
        <SceneCamera />
        <color attach="background" args={["#EEF1F8"]} />
        <hemisphereLight args={[0xffffff, 0xdde3f8, 0.55]} />
        <directionalLight
          castShadow
          position={[120, 200, 80]}
          intensity={0.75}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <ambientLight intensity={0.35} />
        <Suspense fallback={null}>
          <Ground onTap={handleGroundTap} />
          <RoadGrid />
          <Buildings />
          <Trees />
          <Cars onSelect={selectVehicle} />
          <Pins pickup={ride?.pickup} dropoff={ride?.dropoff} />
          {routePoints ? (
            <RoutePath points={routePoints} progress={rideRoute?.progress} />
          ) : null}
        </Suspense>
      </Canvas>
    </div>
  );
}

function SceneCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(110, 150, 110);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

function Ground({ onTap }: { onTap: (event: ThreeEvent<PointerEvent>) => void }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onPointerDown={(event) => {
        event.stopPropagation();
        onTap(event);
      }}
    >
      <planeGeometry args={[CITY_SIZE + 40, CITY_SIZE + 40, 1, 1]} />
      <meshStandardMaterial color="#E6E8F2" />
    </mesh>
  );
}

function RoadGrid() {
  const lanes = useMemo(() => {
    const positions: number[] = [];
    for (let i = -2; i <= 2; i += 1) {
      positions.push((CITY_SIZE / 5) * i);
    }
    return positions;
  }, []);

  return (
    <group>
      {lanes.map((lane) => (
        <mesh key={`h-${lane}`} position={[0, 0.01, lane]} receiveShadow>
          <boxGeometry args={[CITY_SIZE, 0.05, ROAD_WIDTH]} />
          <meshStandardMaterial color="#D7DBE7" />
        </mesh>
      ))}
      {lanes.map((lane) => (
        <mesh key={`v-${lane}`} position={[lane, 0.02, 0]} receiveShadow>
          <boxGeometry args={[ROAD_WIDTH, 0.05, CITY_SIZE]} />
          <meshStandardMaterial color="#D7DBE7" />
        </mesh>
      ))}
    </group>
  );
}

interface BuildingData {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
}

function Buildings() {
  const buildings = useMemo<BuildingData[]>(() => {
    const rng = createRandom(13);
    const data: BuildingData[] = [];
    for (let x = -3; x <= 3; x += 1) {
      for (let z = -3; z <= 3; z += 1) {
        if (Math.abs(x) < 1 && Math.abs(z) < 1) continue;
        if (Math.abs(x) <= 1 && Math.abs(z) <= 1) continue;
        const size = 10 + rng() * 6;
        const height = 12 + rng() * 30;
        const offsetX = x * 24 + rng() * 4;
        const offsetZ = z * 24 + rng() * 4;
        data.push({
          position: [offsetX, height / 2, offsetZ],
          scale: [size, height, size],
          color: rng() > 0.5 ? "#FFFFFF" : "#F8FAFF",
        });
      }
    }
    return data;
  }, []);

  return (
    <group>
      {buildings.map((building, idx) => (
        <mesh
          key={`building-${idx}`}
          position={building.position}
          castShadow
          receiveShadow
        >
          <boxGeometry args={building.scale} />
          <meshStandardMaterial color={building.color} />
        </mesh>
      ))}
    </group>
  );
}

interface TreeData {
  position: [number, number, number];
  height: number;
}

function Trees() {
  const trees = useMemo<TreeData[]>(() => {
    const rng = createRandom(91);
    const data: TreeData[] = [];
    for (let i = 0; i < 40; i += 1) {
      const x = (rng() - 0.5) * (CITY_SIZE - 40);
      const z = (rng() - 0.5) * (CITY_SIZE - 40);
      const height = 6 + rng() * 2;
      data.push({ position: [x, height / 2, z], height });
    }
    return data;
  }, []);

  return (
    <group>
      {trees.map((tree, idx) => (
        <group key={`tree-${idx}`} position={tree.position}>
          <mesh position={[0, -tree.height / 2 + 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.6, 3.0, 8]} />
            <meshStandardMaterial color="#C2B09F" />
          </mesh>
          <mesh position={[0, 1.8, 0]} castShadow>
            <icosahedronGeometry args={[2.1, 0]} />
            <meshStandardMaterial color="#9ECF9A" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const categoryColors: Record<string, string> = {
  electric: "#224CFF",
  automatic: "#0B1B3A",
  manual: "#2F4159",
};

function Cars({ onSelect }: { onSelect: (vehicleId: string) => void }) {
  const vehicles = useAppStore((state) => state.vehicles);
  const selectedId = useAppStore((state) => state.selectedVehicleId);

  return (
    <group>
      {vehicles.map((vehicle) => (
        <CarMesh
          key={vehicle.id}
          vehicle={vehicle}
          selected={vehicle.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function CarMesh({
  vehicle,
  selected,
  onSelect,
}: {
  vehicle: Vehicle;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPosition = useRef(new THREE.Vector3(vehicle.position.x, 1.2, vehicle.position.y));
  const targetHeading = useRef(vehicle.heading);

  useEffect(() => {
    targetPosition.current.set(vehicle.position.x, 1.2, vehicle.position.y);
    targetHeading.current = vehicle.heading;
  }, [vehicle.position.x, vehicle.position.y, vehicle.heading]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    group.position.lerp(targetPosition.current, 1 - Math.pow(0.001, delta * 60));
    const desired = -targetHeading.current;
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, desired, 8, delta);
  });

  const bodyColor = categoryColors[vehicle.category] ?? "#1B2A44";

  return (
    <group
      ref={groupRef}
      position={[vehicle.position.x, 1.2, vehicle.position.y]}
      rotation={[0, -vehicle.heading, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(vehicle.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setCursor("pointer");
      }}
      onPointerOut={() => {
        setCursor("auto");
      }}
      scale={selected ? 1.08 : 1}
    >
      <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[3, 1, 6]} />
        <meshStandardMaterial color={bodyColor} metalness={0.2} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[2.4, 0.4, 4.6]} />
        <meshStandardMaterial color="#6E7FAF" opacity={0.9} transparent />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[selected ? 1.1 : 1, 8, 8]} />
        <meshStandardMaterial color={selected ? "#17A672" : "#E5E8F3"} />
      </mesh>
    </group>
  );
}

function Pins({
  pickup,
  dropoff,
}: {
  pickup?: { lat: number; lng: number };
  dropoff?: { lat: number; lng: number };
}) {
  return (
    <group>
      {pickup ? (
        <PinMesh position={[pickup.lat, 0, pickup.lng]} color="#224CFF" />
      ) : null}
      {dropoff ? (
        <PinMesh position={[dropoff.lat, 0, dropoff.lng]} color="#17A672" />
      ) : null}
    </group>
  );
}

function PinMesh({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh position={[0, 3, 0]}>
        <coneGeometry args={[1.2, 3.4, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.1, 24]} />
        <meshStandardMaterial color={color} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function setCursor(cursor: string) {
  if (typeof document !== "undefined") {
    document.body.style.cursor = cursor;
  }
}

function RoutePath({ points, progress }: { points: { x: number; y: number }[]; progress?: number }) {
  const curve = useMemo(() => {
    const vectors = points.map((point) => new THREE.Vector3(point.x, 0.15, point.y));
    return new THREE.CatmullRomCurve3(vectors, false, "catmullrom", 0);
  }, [points]);

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 40, 0.6, 8, false]} />
        <meshStandardMaterial color="#17A672" emissive="#17A672" emissiveIntensity={0.35} />
      </mesh>
      {typeof progress === "number" ? <RouteMarker curve={curve} progress={progress} /> : null}
    </group>
  );
}

function RouteMarker({ curve, progress }: { curve: THREE.CatmullRomCurve3; progress: number }) {
  const markerRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!markerRef.current) return;
    const point = curve.getPoint(Math.min(Math.max(progress, 0), 1));
    markerRef.current.position.set(point.x, point.y + 0.6, point.z);
  }, [curve, progress]);

  return (
    <mesh ref={markerRef}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial color="#17A672" emissive="#17A672" emissiveIntensity={0.45} />
    </mesh>
  );
}

function createRoutePoints(start: { x: number; y: number }, end: { x: number; y: number }) {
  const points: { x: number; y: number }[] = [start];
  if (Math.abs(start.x - end.x) > 5 && Math.abs(start.y - end.y) > 5) {
    points.push({ x: start.x, y: end.y });
  }
  points.push(end);
  return points;
}
