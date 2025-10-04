import type { VehicleTypeAsset } from "../types/vehicles";

const iconLuxurySuv = new URL("../images/vehicles_type/luxury_suv.webp", import.meta.url).href;
const iconOffroadSuv = new URL("../images/vehicles_type/4x4suv_offroad.webp", import.meta.url).href;
const iconExecutiveSuv = new URL("../images/vehicles_type/executive_suv.webp", import.meta.url).href;
const iconExcavator = new URL("../images/vehicles_type/excavator.webp", import.meta.url).href;
const iconBulldozer = new URL("../images/vehicles_type/bulldozer.webp", import.meta.url).href;
const iconCrane = new URL("../images/vehicles_type/crane.webp", import.meta.url).href;
const iconUrbanVan = new URL("../images/vehicles_type/urban_van.webp", import.meta.url).href;
const iconExecutiveVan = new URL("../images/vehicles_type/executive_van.webp", import.meta.url).href;
const iconElectricVan = new URL("../images/vehicles_type/electric_van.webp", import.meta.url).href;
const iconStandardPickup = new URL("../images/pickuptruck.webp", import.meta.url).href;
const iconHeavyPickup = new URL("../images/vehicles_type/electric_pickup.webp", import.meta.url).href;
const iconFuturisticPickup = new URL("../images/vehicles_type/electric_pickup.webp", import.meta.url).href;
const iconClassicSuv = new URL("../images/4x4suv.webp", import.meta.url).href;
const iconCargoVan = new URL("../images/van.webp", import.meta.url).href;
const iconRedPickup = new URL("../images/vehicles_type/red_pickup_truck.webp", import.meta.url).href;

export const VEHICLE_TYPES: VehicleTypeAsset[] = [
  {
    id: "luxury_sport_suv",
    category: "suv4x4",
    title: "Luxury Sport SUV",
    description: "Metallic black, chrome wheels, LED headlights.",
    iconUrl: iconLuxurySuv,
    pricePerDay: 320,
    horsepower: 540,
    capacity: 5,
  },
  {
    id: "extreme_offroad_suv",
    category: "suv4x4",
    title: "Extreme Off-Road SUV",
    description: "Sand color, roof rack, rugged bumpers, oversized tires.",
    iconUrl: iconOffroadSuv,
    pricePerDay: 280,
    horsepower: 470,
    capacity: 5,
  },
  {
    id: "executive_premium_suv",
    category: "suv4x4",
    title: "Executive Premium SUV",
    description: "Pearl white, tinted windows, elegant chrome details.",
    iconUrl: iconExecutiveSuv,
    pricePerDay: 340,
    horsepower: 520,
    capacity: 7,
  },
  {
    id: "heritage_trail_suv",
    category: "suv4x4",
    title: "Heritage Trail 4x4",
    description: "Graphite grey, steel bumpers, classic analog gauges.",
    iconUrl: iconClassicSuv,
    pricePerDay: 245,
    horsepower: 430,
    capacity: 5,
  },
  {
    id: "classic_excavator",
    category: "heavy",
    title: "Classic Yellow Excavator",
    description: "Hydraulic arm extended, Caterpillar-style.",
    iconUrl: iconExcavator,
    markerSize: 34,
    pricePerDay: 680,
    horsepower: 410,
    capacity: 1,
  },
  {
    id: "industrial_bulldozer",
    category: "heavy",
    title: "Industrial Bulldozer",
    description: "Large front blade, steel details.",
    iconUrl: iconBulldozer,
    markerSize: 34,
    pricePerDay: 720,
    horsepower: 510,
    capacity: 1,
  },
  {
    id: "mobile_crane",
    category: "heavy",
    title: "Mobile Crane",
    description: "Compact cab, telescopic boom extended.",
    iconUrl: iconCrane,
    markerSize: 34,
    pricePerDay: 760,
    horsepower: 560,
    capacity: 2,
  },
  {
    id: "modern_urban_van",
    category: "van",
    title: "Modern Urban Van",
    description: "White Sprinter-style, large windows.",
    iconUrl: iconUrbanVan,
    pricePerDay: 180,
    horsepower: 280,
    capacity: 9,
  },
  {
    id: "executive_luxury_van",
    category: "van",
    title: "Executive Luxury Van",
    description: "Metallic gray, panoramic tinted windows.",
    iconUrl: iconExecutiveVan,
    pricePerDay: 240,
    horsepower: 320,
    capacity: 8,
  },
  {
    id: "futuristic_electric_van",
    category: "van",
    title: "Futuristic Electric Van",
    description: "Blue pearl, aerodynamic, LED light bar.",
    iconUrl: iconElectricVan,
    pricePerDay: 260,
    horsepower: 360,
    capacity: 10,
  },
  {
    id: "cargo_panel_van",
    category: "van",
    title: "Cargo Panel Van",
    description: "High roof, extended body, optimized for logistics routes.",
    iconUrl: iconCargoVan,
    pricePerDay: 210,
    horsepower: 300,
    capacity: 3,
  },
  {
    id: "standard_pickup",
    category: "pickup",
    title: "Standard Pickup",
    description: "Red body, open cargo bed.",
    iconUrl: iconStandardPickup,
    pricePerDay: 150,
    horsepower: 290,
    capacity: 5,
  },
  {
    id: "heavy_duty_pickup",
    category: "pickup",
    title: "Heavy Duty Pickup",
    description: "Matte gray, oversized tires, industrial design.",
    iconUrl: iconHeavyPickup,
    pricePerDay: 210,
    horsepower: 360,
    capacity: 5,
  },
  {
    id: "futuristic_electric_pickup",
    category: "pickup",
    title: "Futuristic Electric Pickup",
    description: "Silver, angular Cybertruck-style.",
    iconUrl: iconFuturisticPickup,
    pricePerDay: 260,
    horsepower: 480,
    capacity: 5,
  },
  {
    id: "fleet_red_pickup",
    category: "pickup",
    title: "Fleet Red Pickup",
    description: "Crimson finish, 4x4 drivetrain, heavy-duty towing package.",
    iconUrl: iconRedPickup,
    pricePerDay: 175,
    horsepower: 310,
    capacity: 5,
  },
];
