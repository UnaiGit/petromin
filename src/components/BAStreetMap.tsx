import { useEffect, useMemo, useRef } from "react";
import Map, { Layer, Marker, Source } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import type { MapLayerMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppStore } from "../state/useAppStore";
import { type LngLat, snapToBounds } from "../sim/baSimulation";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const routeLayer: mapboxgl.LineLayer = {
  id: "route-line",
  source: "ba-route",
  type: "line",
  paint: {
    "line-color": "#101010",
    "line-width": 5,
    "line-opacity": 0.82,
  },
};

export function BAStreetMap() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapViewState = useAppStore((state) => state.mapViewState);
  const mapVehicles = useAppStore((state) => state.mapVehicles);
  const mapSelectedVehicleId = useAppStore((state) => state.mapSelectedVehicleId);
  const mapDestination = useAppStore((state) => state.mapDestination);
  const mapRouteGeoJSON = useAppStore((state) => state.mapRouteGeoJSON);
  const mapRouteMeta = useAppStore((state) => state.mapRouteMeta);
  const mapDestinationLabel = useAppStore((state) => state.mapDestinationLabel);
  const getTypeById = useAppStore((state) => state.getTypeById);
  const setMapDestination = useAppStore((state) => state.setMapDestination);
  const selectMapVehicle = useAppStore((state) => state.selectMapVehicle);
  const computeMapRoute = useAppStore((state) => state.computeMapRoute);
  const startMapSimLoop = useAppStore((state) => state.startMapSimLoop);
  const vehicleUnits = useAppStore((state) => state.vehicleUnits);
  const vehicleTypes = useAppStore((state) => state.vehicleTypes);
  const vehicleCategory = useAppStore((state) => state.vehicleCategory);
  const isMapPickingDestination = useAppStore((state) => state.isMapPickingDestination);
  const mapFlyToTarget = useAppStore((state) => state.mapFlyToTarget);
  const consumeMapFlyToTarget = useAppStore((state) => state.consumeMapFlyToTarget);

  useEffect(() => {
    startMapSimLoop();
  }, [startMapSimLoop]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map.resize();
    map.triggerRepaint?.();
    const timeout = window.setTimeout(() => {
      map.resize();
      map.triggerRepaint?.();
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [isMapPickingDestination]);

  const onMapLoad = () => {
    const mapInstance = mapRef.current;
    if (!mapInstance) {
      return;
    }
    if (!mapInstance.getSource("mapbox-dem")) {
      mapInstance.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      mapInstance.setTerrain({ source: "mapbox-dem", exaggeration: 1.2 });
    }
    const layers = mapInstance.getStyle().layers;
    const labelLayerId = layers?.find((layer) => layer.type === "symbol" && layer.layout && layer.layout["text-field"]);
    if (!labelLayerId) {
      return;
    }
    if (!mapInstance.getLayer("add-3d-buildings")) {
      mapInstance.addLayer(
        {
          id: "add-3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#d1d5db",
            "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 15, 0, 15.05, ["get", "height"]],
            "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 15, 0, 15.05, ["get", "min_height"]],
            "fill-extrusion-opacity": 0.5,
          },
        },
        labelLayerId.id
      );
    }

    const setPaint = (layerId: string, property: string, value: unknown) => {
      if (!mapInstance.getLayer(layerId)) {
        return;
      }
      try {
        mapInstance.setPaintProperty(layerId as string, property as any, value as any);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to style layer ${layerId}`, error);
      }
    };

    setPaint("background", "background-color", "#f3f4f6");
    setPaint("land", "fill-color", "#f5f5f5");
    ["landcover", "landuse", "hillshade", "contour"].forEach((layer) => setPaint(layer, "fill-color", "#f7f7f7"));
    ["water", "waterway", "water-shadow"].forEach((layer) => {
      setPaint(layer, "line-color", "#bcd8f4");
      setPaint(layer, "fill-color", "#bcd8f4");
    });
    ["park", "national-park", "landcover"].forEach((layer) => setPaint(layer, "fill-color", "#dce8d9"));
  };

  const onMapClick = (event: MapLayerMouseEvent) => {
    const nextPoint: LngLat = { lng: event.lngLat.lng, lat: event.lngLat.lat };
    setMapDestination(snapToBounds(nextPoint));
    if (mapSelectedVehicleId) {
      void computeMapRoute();
    }
  };

  const units = useMemo(() => {
    const allowedTypeIds = new Set(
      vehicleTypes.filter((type) => type.category === vehicleCategory).map((type) => type.id)
    );
    return vehicleUnits.filter((unit) => allowedTypeIds.has(unit.typeId));
  }, [vehicleUnits, vehicleTypes, vehicleCategory]);

  const vehicleStateMap = useMemo(
    () =>
      mapVehicles.reduce<Record<string, { heading: number; state: string }>>((acc, vehicle) => {
        acc[vehicle.id] = { heading: vehicle.heading, state: vehicle.state };
        return acc;
      }, {}),
    [mapVehicles]
  );

  useEffect(() => {
    if (!mapFlyToTarget || !mapRef.current) {
      return;
    }
    const currentZoom = mapRef.current.getZoom();
    mapRef.current.flyTo({
      center: [mapFlyToTarget.lng, mapFlyToTarget.lat],
      zoom: mapFlyToTarget.zoom ?? currentZoom,
      speed: 0.9,
    });
    consumeMapFlyToTarget();
  }, [mapFlyToTarget, consumeMapFlyToTarget]);

  if (!MAPBOX_TOKEN) {
    return <div style={{ height: "100%", background: "#111", color: "#f4f4f4", display: "grid", placeItems: "center" }}>Missing Mapbox token</div>;
  }

  return (
    <div className="ba-street-map">
      <Map
        ref={(instance) => {
          mapRef.current = instance?.getMap() ?? null;
        }}
        mapLib={mapboxgl}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={mapViewState}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onLoad={onMapLoad}
        onClick={onMapClick}
        dragRotate
        touchPitch
        antialias
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >

        {mapDestination ? (
          <Marker longitude={mapDestination.lng} latitude={mapDestination.lat} anchor="bottom">
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                background: "#111",
                border: "3px solid #f9fafb",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
              }}
            />
          </Marker>
        ) : null}

        {units.map((unit) => {
          const asset = getTypeById(unit.typeId);
          const vehicleState = vehicleStateMap[unit.id];
          return (
            <Marker
              key={unit.id}
              longitude={unit.lng}
              latitude={unit.lat}
              anchor="center"
              onClick={(event) => {
                event.originalEvent.stopPropagation();
                if (!isMapPickingDestination) {
                  selectMapVehicle(unit.id);
                  void computeMapRoute();
                }
              }}
            >
              <div
                style={{
                  width: (asset.markerSize ?? 28) + 18,
                  height: (asset.markerSize ?? 28) + 18,
                  borderRadius: 20,
                  background: mapSelectedVehicleId === unit.id ? "rgba(0,0,0,0.32)" : "rgba(0,0,0,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 6,
                  boxShadow: "0 10px 22px rgba(0, 0, 0, 0.28)",
                  transition: "transform 0.2s ease",
                  transform: mapSelectedVehicleId === unit.id ? "scale(1.05)" : "scale(1)",
                }}
              >
                <img
                  src={asset.iconUrl}
                  alt={asset.title}
                  style={{
                    width: asset.markerSize ?? 28,
                    height: "auto",
                    filter: vehicleState?.state === "arrived" ? "drop-shadow(0 0 6px rgba(0,0,0,0.45))" : "drop-shadow(0 6px 12px rgba(0,0,0,0.28))",
                  }}
                />
              </div>
            </Marker>
          );
        })}

        {mapRouteGeoJSON ? (
          <Source id="ba-route" type="geojson" data={mapRouteGeoJSON}>
            <Layer {...routeLayer} />
          </Source>
        ) : null}

        {mapRouteMeta && mapDestination && !isMapPickingDestination ? (
          <Marker longitude={mapDestination.lng} latitude={mapDestination.lat} anchor="bottom">
            <div className="map-eta-bubble">
              <strong>{formatMinutes(mapRouteMeta.durationMinutes)}</strong>
              <span>{mapRouteMeta.distanceKm.toFixed(1)} km away</span>
              {mapDestinationLabel ? <span className="map-eta-bubble__label">{mapDestinationLabel}</span> : null}
            </div>
          </Marker>
        ) : null}

        {!mapDestination && mapSelectedVehicleId ? (
          (() => {
            const unit = units.find((item) => item.id === mapSelectedVehicleId);
            if (!unit) {
              return null;
            }
            return (
              <Marker longitude={unit.lng} latitude={unit.lat} anchor="bottom">
                <div style={{ width: 12, height: 12, borderRadius: 999, background: "#111", border: "2px solid #f9fafb" }} />
              </Marker>
            );
          })()
        ) : null}
      </Map>
    </div>
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
