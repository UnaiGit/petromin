import { useMemo } from "react";
import { useAppStore } from "../state/useAppStore";

const statusCopy: Record<string, { title: string; subtitle: string }> = {
  enroute: { title: "Vehicle en route", subtitle: "Your selection is heading to the rendezvous." },
  arrived: { title: "Vehicle arrived", subtitle: "The unit is ready for handoff." },
};

export function RideStatusOverlay() {
  const mapRideStatus = useAppStore((state) => state.mapRideStatus);
  const resetMapRide = useAppStore((state) => state.resetMapRide);

  const copy = useMemo(() => statusCopy[mapRideStatus] ?? null, [mapRideStatus]);

  if (!copy || mapRideStatus === "idle") {
    return null;
  }

  return (
    <aside
      style={{
        position: "absolute",
        top: 32,
        left: "50%",
        transform: "translateX(-50%)",
        minWidth: 280,
        padding: "18px 22px",
        borderRadius: 18,
        background: "rgba(255, 255, 255, 0.92)",
        boxShadow: "0 14px 34px rgba(15, 23, 42, 0.18)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 8,
      }}
    >
      <span style={{ fontSize: 12, color: "#64748b", letterSpacing: 0.3 }}>Status</span>
      <strong style={{ fontSize: 18, color: "#0f172a" }}>{copy.title}</strong>
      <span style={{ fontSize: 14, color: "#475569" }}>{copy.subtitle}</span>
      <button
        type="button"
        onClick={resetMapRide}
        style={{
          alignSelf: "flex-start",
          marginTop: 8,
          border: "none",
          background: "none",
          color: "#224CFF",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {mapRideStatus === "arrived" ? "Reset" : "Cancel dispatch"}
      </button>
    </aside>
  );
}

export default RideStatusOverlay;
