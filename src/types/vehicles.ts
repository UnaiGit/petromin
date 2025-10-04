export type VehicleCategory = "suv4x4" | "heavy" | "van" | "pickup";

export type VehicleTypeId =
  | "luxury_sport_suv"
  | "extreme_offroad_suv"
  | "executive_premium_suv"
  | "heritage_trail_suv"
  | "classic_excavator"
  | "industrial_bulldozer"
  | "mobile_crane"
  | "modern_urban_van"
  | "executive_luxury_van"
  | "futuristic_electric_van"
  | "cargo_panel_van"
  | "standard_pickup"
  | "heavy_duty_pickup"
  | "futuristic_electric_pickup"
  | "fleet_red_pickup";

export interface VehicleTypeAsset {
  id: VehicleTypeId;
  category: VehicleCategory;
  title: string;
  description: string;
  iconUrl: string;
  markerSize?: number;
  pricePerDay?: number;
  horsepower?: number;
  capacity?: number;
}

export interface VehicleUnit {
  id: string;
  typeId: VehicleTypeId;
  lng: number;
  lat: number;
  address: string;
  displayDescription?: string;
  imageUrl?: string;
}
