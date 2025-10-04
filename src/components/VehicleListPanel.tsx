import { useAppStore } from "../state/useAppStore";
import type { VehicleCategory as FleetCategory, VehicleUnit } from "../types/vehicles";

const CATEGORY_LABEL: Record<FleetCategory, string> = {
  suv4x4: "SUVs 4x4",
  heavy: "Heavy Machinery",
  van: "Transport Vans",
  pickup: "Pickup Trucks",
};

export function VehicleListPanel({ units }: { units: VehicleUnit[] }) {
  const getTypeById = useAppStore((state) => state.getTypeById);
  const selectMapVehicle = useAppStore((state) => state.selectMapVehicle);
  const selectedVehicleId = useAppStore((state) => state.mapSelectedVehicleId);

  return (
    <div style={{ display: "grid", gap: 12, maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
      {units.map((unit) => {
        const asset = getTypeById(unit.typeId);
        const active = unit.id === selectedVehicleId;
        const priceText = asset.pricePerDay ? `€${asset.pricePerDay.toLocaleString()}/day` : "—";
        const displayDescription = unit.displayDescription ?? asset.description;
        const imageSrc = unit.imageUrl ?? asset.iconUrl;
        return (
          <button
            key={unit.id}
            type="button"
            onClick={() => selectMapVehicle(unit.id)}
            className={`vehicle-card-button${active ? " is-active" : ""}`}
            style={{
              gridTemplateColumns: "76px 1fr",
              background: active ? "rgba(0,0,0,0.12)" : "#f1f1f1",
              boxShadow: active ? "0 12px 24px rgba(0,0,0,0.16)" : "none",
            }}
          >
            <img
              src={imageSrc}
              alt={asset.title}
              style={{ width: 72, height: "auto", borderRadius: 16, background: "#ffffff", objectFit: "cover" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontWeight: 800, color: "#111111", fontSize: 16 }}>{asset.title}</div>
              <div style={{ fontSize: 12, color: "#555555" }}>{displayDescription}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
                <span style={{ color: "#2a2a2a" }}>{CATEGORY_LABEL[asset.category]}</span>
                <span style={{ color: "#111111" }}>{priceText}</span>
              </div>
              <div style={{ fontSize: 12, color: "#1f1f1f" }}>Currently in: {unit.address}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default VehicleListPanel;
