import { BAStreetMap } from "../components/BAStreetMap";
import { CarSelectorSheet } from "../components/CarSelectorSheet";
import RideStatusOverlay from "../components/RideStatusOverlay";
import { useAppStore } from "../state/useAppStore";

export function HomeScreen() {
  const isMapPickingDestination = useAppStore((state) => state.isMapPickingDestination);
  return (
    <div className={`home-screen${isMapPickingDestination ? " home-screen--picking" : ""}`}>
      <div className={`home-map-container${isMapPickingDestination ? " home-map-container--expanded" : ""}`}>
        <BAStreetMap />
      </div>
      <CarSelectorSheet />
      <RideStatusOverlay />
    </div>
  );
}

export default HomeScreen;
