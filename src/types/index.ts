export type VehicleCategory =
  | "automatic"
  | "electric"
  | "manual"
  | "suv"
  | "excavator"
  | "van"
  | "pickup";

export interface VehiclePricing {
  destinationId: string;
  pricePerDay: number;
  minDays: number;
  mileagePolicy?: string;
  deposit?: number;
}

export interface Vehicle {
  id: string;
  category: VehicleCategory;
  make: string;
  model: string;
  powerKw: number;
  consumption: string;
  distanceText: string;
  plate: string;
  driverId?: string;
  passengers?: number;
  heroImage?: string;
  gallery?: string[];
  description?: string;
  pricing?: VehiclePricing[];
  position: {
    x: number;
    y: number;
  };
  heading: number;
  etaSeconds: number;
  speed: number;
}

export interface Driver {
  id: string;
  name: string;
  rating: number;
  avatarUrl: string;
}

export type RideStatus =
  | "idle"
  | "viewing"
  | "preconfirm"
  | "matching"
  | "arriving"
  | "waiting_pickup"
  | "ongoing"
  | "payment"
  | "receipt";

export interface RideEstimate {
  currency: string;
  value: number;
}

export interface Ride {
  id: string;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  status: RideStatus;
  etaSec: number;
  priceEst: RideEstimate | null;
  driverId?: string;
  vehicleId?: string;
  distanceMeters?: number;
  durationSec?: number;
  startedAt?: number;
  completedAt?: number;
}

export interface QuoteBreakdownItem {
  label: string;
  value: string;
}

export interface RideHistoryItem {
  id: string;
  from: string;
  to: string;
  total: string;
  date: string;
}

export interface SimulationConfig {
  seed: number;
  carCount: number;
  citySize: number;
}

export interface PathPoint {
  x: number;
  y: number;
}

export interface RideRoute {
  phase: "pickup" | "ride";
  points: PathPoint[];
  progress: number;
  duration: number;
}

export type CorporateMode = "consumer" | "corporate" | "admin";

export type AdminNavSection = "overview" | "fleet" | "rentals" | "finance" | "automation";

export type NetPaymentTerm = "NET30" | "NET60";

export type CompanyVerificationStatus = "unstarted" | "pending" | "approved" | "rejected";

export interface CompanyBillingContact {
  name: string;
  email: string;
  phone: string;
}

export interface CompanyDocumentAsset {
  id: string;
  kind: "tax_id" | "articles" | "power_of_attorney" | "representative_id" | "other";
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewData: string;
  uploadedAt: string;
}

export interface CompanyPaymentTerms {
  type: NetPaymentTerm;
  iban?: string;
  creditLimit?: number;
  defaultPurchaseOrder?: string;
}

export interface SignaturePayload {
  signedAt: string;
  imageData: string;
  ip: string;
  userAgent: string;
  signerName?: string;
  signerEmail?: string;
}

export interface CompanyContract {
  version: string;
  signedAt?: string;
  provider: "demo" | "docusign" | "adobesign" | "dropboxsign" | "custom";
  signatureId?: string;
  pdfUrl?: string;
  signature?: SignaturePayload;
}

export interface CompanyProfile {
  id: string;
  legalName: string;
  taxId: string;
  billingAddress: string;
  country: string;
  billingContact: CompanyBillingContact;
  documents: CompanyDocumentAsset[];
  paymentTerms: CompanyPaymentTerms;
  verificationStatus: CompanyVerificationStatus;
  verificationReason?: string;
  contract: CompanyContract;
  creditLimit?: number;
  creditUsed?: number;
}

export interface CompanyOnboardingDraft {
  step: 1 | 2 | 3;
  legalName: string;
  taxId: string;
  billingAddress: string;
  country: string;
  billingContact: CompanyBillingContact;
  documents: CompanyDocumentAsset[];
  paymentTerms?: CompanyPaymentTerms;
  contractAccepted: boolean;
  signature?: SignaturePayload;
  status: "idle" | "submitting" | "completed";
  error?: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  currency: string;
  timezone?: string;
  heroImage?: string;
}

export type OrderStatus = "review" | "approved" | "rejected" | "delivered";

export interface OrderArtifactLinks {
  requestPdfUrl?: string;
  contractPdfUrl?: string;
}

export interface OrderPurchase {
  id: string;
  companyId: string;
  vehicleId: string;
  destinationId: string;
  dateFrom: string;
  dateTo: string;
  days: number;
  pricePerDay: number;
  total: number;
  po?: string;
  paymentTerm: NetPaymentTerm;
  signature: SignaturePayload | null;
  status: OrderStatus;
  artifacts: OrderArtifactLinks;
  submittedAt: string;
  approvedAt?: string;
  notes?: string;
}

export type OrderFilterStatus = OrderStatus | "all";

export interface CatalogFilters {
  destinationId: string;
  dateFrom: string | null;
  dateTo: string | null;
  category: VehicleCategory | "all";
  passengers: number | null;
}

export type CorporateNavSection = "home" | "catalog" | "orders" | "company" | "help";

export type AnalyticsEvent =
  | { type: "b2b_onboarding_step_view"; step: number }
  | { type: "b2b_contract_signed"; version: string }
  | { type: "catalog_view"; destinationId: string; filters: Partial<CatalogFilters> }
  | { type: "order_submitted"; vehicleId: string; days: number; total: number; netTerms: NetPaymentTerm }
  | { type: "order_pdf_downloaded"; orderId: string };

export interface OrderFilters {
  status: OrderFilterStatus;
  destinationId: string | "all";
  dateFrom: string | null;
  dateTo: string | null;
}
