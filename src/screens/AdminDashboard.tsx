import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./AdminDashboard.css";
import { useAppStore } from "../state/useAppStore";
import type { AdminNavSection } from "../types";
import type { VehicleCategory, VehicleTypeAsset, VehicleTypeId } from "../types/vehicles";

const CATEGORY_LABEL: Record<VehicleCategory, string> = {
  suv4x4: "SUV 4x4",
  heavy: "Heavy Machinery",
  van: "Transport Van",
  pickup: "Pickup Truck",
};

const CATEGORY_ORDER: VehicleCategory[] = ["suv4x4", "heavy", "van", "pickup"];

const NAV_ITEMS: Array<{ id: AdminNavSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "fleet", label: "Fleet" },
  { id: "rentals", label: "Rentals" },
  { id: "finance", label: "Finance" },
  { id: "automation", label: "Automation" },
];

const SECTION_COPY: Record<AdminNavSection, { title: string; subtitle: string }> = {
  overview: {
    title: "Operations command center",
    subtitle: "Track business momentum and react quickly to today’s signals.",
  },
  fleet: {
    title: "Fleet intelligence",
    subtitle: "Deploy vehicles with confidence and keep utilization high across regions.",
  },
  rentals: {
    title: "Rental pipeline",
    subtitle: "Inspect every booking journey from lead to delivery and remove friction.",
  },
  finance: {
    title: "Financial signals",
    subtitle: "Monitor revenue, margin and receivables with a single glance.",
  },
  automation: {
    title: "Automation studio",
    subtitle: "Layer smart workflows, watch output, and discover the next big lever.",
  },
};

const OVERVIEW_KPIS = [
  {
    key: "revenue",
    label: "Total revenue",
    value: 482_400,
    delta: "+14.2% vs last month",
    variant: "glow" as const,
    format: formatCurrency,
  },
  {
    key: "approvals",
    label: "Pending approvals",
    value: 7,
    delta: "Needs review today",
    format: (value: number) => value.toString(),
  },
  {
    key: "contracts",
    label: "Approved contracts",
    value: 28,
    delta: "Deliveries scheduled",
    format: (value: number) => value.toString(),
  },
  {
    key: "rate",
    label: "Avg. rate / day",
    value: 28_390,
    delta: "Typical rental 6.4 days",
    format: (value: number) => `${formatCurrency(value)}`,
  },
] as const;

const REVENUE_SERIES = [
  { label: "May", value: 62_400 },
  { label: "Jun", value: 68_900 },
  { label: "Jul", value: 74_200 },
  { label: "Aug", value: 81_500 },
  { label: "Sep", value: 94_800 },
  { label: "Oct", value: 108_100 },
] as const;

const UPCOMING_RENTALS = [
  {
    company: "Axiom Build",
    vehicle: "Executive Premium SUV",
    start: "Sep 22",
    end: "Sep 27",
    status: "approved" as const,
    total: 6_240,
  },
  {
    company: "Lumen Energy",
    vehicle: "Heritage Trail 4x4",
    start: "Sep 25",
    end: "Sep 29",
    status: "review" as const,
    total: 4_980,
  },
  {
    company: "Helios Mining",
    vehicle: "Mobile Crane",
    start: "Oct 01",
    end: "Oct 08",
    status: "approved" as const,
    total: 18_600,
  },
  {
    company: "Clearline Logistics",
    vehicle: "Futuristic Electric Van",
    start: "Oct 04",
    end: "Oct 10",
    status: "delivered" as const,
    total: 7_320,
  },
  {
    company: "Atlas Retail",
    vehicle: "Heavy Duty Pickup",
    start: "Oct 08",
    end: "Oct 12",
    status: "review" as const,
    total: 3_480,
  },
] as const;

const RENTAL_PIPELINE = [
  { status: "review" as const, count: 6, percent: 15 },
  { status: "approved" as const, count: 18, percent: 45 },
  { status: "delivered" as const, count: 14, percent: 35 },
  { status: "rejected" as const, count: 2, percent: 5 },
] as const;

const FINANCE_METRICS = [
  { key: "total", label: "Total revenue", value: 482_400, delta: "All time", format: formatCurrency },
  { key: "locked", label: "Locked-in revenue", value: 362_800, delta: "Approved + delivered", format: formatCurrency },
  { key: "pending", label: "Pending review", value: 118_600, delta: "Awaiting confirmation", format: formatCurrency },
  {
    key: "rate",
    label: "Avg. daily rate",
    value: 28_390,
    delta: "Across confirmed rentals",
    format: (value: number) => formatCurrency(value),
  },
] as const;

const REVENUE_BY_STATUS = [
  { status: "review", total: 118_600 },
  { status: "approved", total: 192_200 },
  { status: "delivered", total: 170_600 },
  { status: "rejected", total: 21_400 },
] as const;

const TOP_COMPANIES = [
  { companyId: "exylon", orders: 12, average: 4_120, total: 49_440 },
  { companyId: "axiom", orders: 9, average: 3_860, total: 34_740 },
  { companyId: "helix", orders: 7, average: 5_420, total: 37_940 },
  { companyId: "lumen", orders: 5, average: 3_240, total: 16_200 },
  { companyId: "clearline", orders: 4, average: 4_780, total: 19_120 },
] as const;

const AUTOMATION_METRICS = [
  { key: "flows", label: "Live automations", value: 12, delta: "Playbooks active" },
  { key: "approvals", label: "Automated approvals", value: 48, delta: "This quarter" },
  { key: "coverage", label: "Coverage", value: 86, delta: "Requests auto-routed", suffix: "%" },
  { key: "handling", label: "Avg. handling time", value: 11, delta: "Minutes per rental", suffix: " min" },
] as const;

const AUTOMATION_IDEAS = [
  {
    title: "Auto-approve trusted companies",
    description: "Grant instant confirmations to partners with verified insurance and 5+ positive rentals.",
  },
  {
    title: "Dynamic surge pricing",
    description: "Lift SUV rates by up to 12% when utilization surpasses 85% in a metro.",
  },
  {
    title: "Maintenance window alerts",
    description: "Remind depot leads when heavy machinery approaches 180 engine hours without inspection.",
  },
  {
    title: "Revenue pacing",
    description: "Trigger growth campaigns if weekly bookings trail forecast by 15%.",
  },
] as const;

const AUTOMATION_ACTIVITY = [
  {
    title: "Auto approval triggered",
    status: "approved" as const,
    company: "Axiom Build",
    timestamp: "Sep 18",
    total: 4_200,
  },
  {
    title: "Delivery workflow completed",
    status: "delivered" as const,
    company: "Clearline Logistics",
    timestamp: "Sep 17",
    total: 7_950,
  },
  {
    title: "Review escalation fired",
    status: "review" as const,
    company: "Lumen Energy",
    timestamp: "Sep 16",
    total: 5_360,
  },
  {
    title: "Payment reminder sent",
    status: "approved" as const,
    company: "Helios Mining",
    timestamp: "Sep 15",
    total: 12_480,
  },
] as const;

const FLEET_SUMMARY = {
  totalVehicles: 128,
  averageRate: 268,
  occupancy: "87%",
  topCategory: "SUV 4x4",
  topCategoryCount: 46,
} as const;

const FLEET_CATEGORY_BASELINE: Array<{ category: VehicleCategory; count: number }> = [
  { category: "suv4x4", count: 46 },
  { category: "van", count: 32 },
  { category: "pickup", count: 28 },
  { category: "heavy", count: 22 },
];

const FLEET_RECENT = [
  {
    id: "SUV-908",
    title: "Executive Premium SUV",
    category: "suv4x4" as VehicleCategory,
    pricePerDay: 340,
    address: "Puerto Madero Hub, CABA",
  },
  {
    id: "VAN-742",
    title: "Futuristic Electric Van",
    category: "van" as VehicleCategory,
    pricePerDay: 260,
    address: "Palermo Logistics Yard",
  },
  {
    id: "PK-615",
    title: "Fleet Red Pickup",
    category: "pickup" as VehicleCategory,
    pricePerDay: 175,
    address: "Mataderos Service Depot",
  },
  {
    id: "EXC-204",
    title: "Classic Yellow Excavator",
    category: "heavy" as VehicleCategory,
    pricePerDay: 680,
    address: "Dock Sud Industrial Park",
  },
] as const;

type FormState = {
  category: VehicleCategory;
  typeId: VehicleTypeId;
  unitId: string;
  address: string;
  description: string;
  imageUrl: string;
};

type FormBanner = { tone: "success" | "error"; text: string } | null;

function determineInitialCategory(vehicleTypes: VehicleTypeAsset[]): VehicleCategory {
  return (vehicleTypes[0]?.category ?? "suv4x4") as VehicleCategory;
}

function determineInitialType(
  category: VehicleCategory,
  vehicleTypes: VehicleTypeAsset[]
): VehicleTypeId {
  const match = vehicleTypes.find((type) => type.category === category) ?? vehicleTypes[0];
  return (match?.id ?? "luxury_sport_suv") as VehicleTypeId;
}

function generateVehicleId(typeId: VehicleTypeId) {
  const prefix = typeId
    .split("_")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
  const suffix = Math.floor(Math.random() * 9000 + 1000).toString();
  return `${prefix}-${suffix}`;
}

function formatCurrency(value: number) {
  return `€${value.toLocaleString("es-ES", { maximumFractionDigits: 0 })}`;
}

export function AdminDashboard() {
  const vehicleUnits = useAppStore((state) => state.vehicleUnits);
  const vehicleTypes = useAppStore((state) => state.vehicleTypes);
  const adminSection = useAppStore((state) => state.adminSection);
  const setAdminSection = useAppStore((state) => state.setAdminSection);
  const setCorporateMode = useAppStore((state) => state.setCorporateMode);
  const addVehicleUnit = useAppStore((state) => state.addVehicleUnit);

  const [formState, setFormState] = useState<FormState>(() => {
    const category = determineInitialCategory(vehicleTypes);
    const typeId = determineInitialType(category, vehicleTypes);
    return {
      category,
      typeId,
      unitId: generateVehicleId(typeId),
      address: "",
      description: "",
      imageUrl: "",
    };
  });
  const [formBanner, setFormBanner] = useState<FormBanner>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const topMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const belongsToCategory = vehicleTypes.some(
      (item) => item.id === formState.typeId && item.category === formState.category
    );
    if (!belongsToCategory) {
      const fallback = vehicleTypes.find((item) => item.category === formState.category);
      if (fallback) {
        setFormState((prev) => ({
          ...prev,
          typeId: fallback.id as VehicleTypeId,
          unitId: generateVehicleId(fallback.id as VehicleTypeId),
        }));
      }
    }
  }, [formState.category, formState.typeId, vehicleTypes]);

  useEffect(() => {
    if (!formBanner) {
      return;
    }
    const timer = window.setTimeout(() => setFormBanner(null), 3600);
    return () => window.clearTimeout(timer);
  }, [formBanner]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!topMenuRef.current || topMenuRef.current.contains(event.target as Node)) {
        return;
      }
      setIsMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const typeMap = useMemo(() => {
    const map = new Map<VehicleTypeId, VehicleTypeAsset>();
    vehicleTypes.forEach((type) => map.set(type.id, type));
    return map;
  }, [vehicleTypes]);

  const availableTypes = useMemo(
    () => vehicleTypes.filter((type) => type.category === formState.category),
    [vehicleTypes, formState.category]
  );

  const categoryBreakdownDisplay = useMemo(() => {
    const counts = new Map<VehicleCategory, number>();
    FLEET_CATEGORY_BASELINE.forEach((item) => counts.set(item.category, item.count));
    vehicleUnits.forEach((unit) => {
      const asset = typeMap.get(unit.typeId);
      if (!asset) {
        return;
      }
      counts.set(asset.category, (counts.get(asset.category) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [vehicleUnits, typeMap]);

  const fleetInventoryDisplay = useMemo(() => {
    const enriched = vehicleUnits.map((unit) => {
      const asset = typeMap.get(unit.typeId);
      return {
        id: unit.id,
        title: asset?.title ?? unit.typeId,
        category: asset?.category ?? "suv4x4",
        pricePerDay: asset?.pricePerDay ?? null,
        address: unit.address,
      };
    });
    const combined = [...enriched.slice(-3).reverse(), ...FLEET_RECENT];
    const seen = new Set<string>();
    return combined.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    }).slice(0, 7);
  }, [vehicleUnits, typeMap]);

  const fleetSummaryDisplay = useMemo(
    () => ({
      totalVehicles: FLEET_SUMMARY.totalVehicles + vehicleUnits.length,
      averageRate: FLEET_SUMMARY.averageRate,
      occupancy: FLEET_SUMMARY.occupancy,
      topCategory: FLEET_SUMMARY.topCategory,
      topCategoryCount: FLEET_SUMMARY.topCategoryCount,
    }),
    [vehicleUnits.length]
  );

  const navItem = NAV_ITEMS.find((item) => item.id === adminSection) ?? NAV_ITEMS[0];
  const copy = SECTION_COPY[adminSection] ?? SECTION_COPY.overview;

  const handleFormChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateVehicle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.address.trim()) {
      setFormBanner({ tone: "error", text: "Add a pickup location to create the unit." });
      return;
    }

    addVehicleUnit({
      id: formState.unitId.trim() || generateVehicleId(formState.typeId),
      typeId: formState.typeId,
      lat: 0,
      lng: 0,
      address: formState.address.trim(),
      displayDescription: formState.description.trim() || undefined,
      imageUrl: formState.imageUrl.trim() || undefined,
    });

    setFormBanner({
      tone: "success",
      text: `Vehicle ${formState.unitId || formState.typeId.toUpperCase()} added to ${CATEGORY_LABEL[formState.category]}.`,
    });

    setFormState((prev) => ({
      ...prev,
      unitId: generateVehicleId(prev.typeId),
      address: "",
      description: "",
      imageUrl: "",
    }));
  };

  const renderRevenueChart = () => {
    const values = REVENUE_SERIES.map((item) => item.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = Math.max(1, maxValue - minValue);
    return (
      <div className="admin-chart" role="img" aria-label="Monthly revenue in euros">
        {REVENUE_SERIES.map((item) => (
          <div key={item.label} className="admin-chart__bar">
            <div className="admin-chart__bar-track">
              <span className="admin-chart__value-bubble">{formatCurrency(item.value)}</span>
              <div
                className="admin-chart__bar-fill"
                style={{
                  height: `${Math.round(30 + ((item.value - minValue) / range) * 70)}%`,
                }}
                aria-hidden="true"
              />
            </div>
            <span className="admin-chart__label">{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderOverview = () => (
    <>
      <section className="admin-grid" aria-label="Key performance indicators">
        {OVERVIEW_KPIS.map((kpi) => (
          <article
            key={kpi.key}
           className={`admin-card${kpi.variant === "glow" ? " admin-card--glow" : ""}`}
         >
           <h3>{kpi.label}</h3>
           <p className="admin-card__value">
              {"format" in kpi && typeof kpi.format === "function"
                ? kpi.format(kpi.value)
                : kpi.value.toLocaleString()}
            </p>
            <span className="admin-card__delta">{kpi.delta}</span>
          </article>
        ))}
      </section>

      <section className="admin-panels">
        <article className="admin-panel admin-panel--wide" aria-label="Revenue trend">
          <header className="admin-panel__header">
            <div>
              <h3>Revenue trajectory</h3>
              <p>Momentum across the last six months. Targets adjust live with every booking.</p>
            </div>
            <button type="button" className="admin-pill">Export insights</button>
          </header>
          {renderRevenueChart()}
        </article>

        <article className="admin-panel" aria-label="Category mix">
          <header className="admin-panel__header">
            <div>
              <h3>Category mix</h3>
              <p>Where vehicles are concentrated today.</p>
            </div>
          </header>
          <ul className="admin-list">
            {categoryBreakdownDisplay.map(([category, count]) => (
              <li key={category}>
                <span>{CATEGORY_LABEL[category]}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="admin-panels">
        <article className="admin-panel admin-panel--stacked" aria-label="Upcoming rentals">
          <header className="admin-panel__header">
            <div>
              <h3>Upcoming rentals</h3>
              <p>Fast snapshot of the next deliveries.</p>
            </div>
            <button type="button" className="admin-pill admin-pill--muted">View all requests</button>
          </header>
          <div className="admin-table" role="table">
            <div className="admin-table__row admin-table__row--head" role="row">
              <span role="columnheader">Company</span>
              <span role="columnheader">Vehicle</span>
              <span role="columnheader">Dates</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Total</span>
            </div>
            {UPCOMING_RENTALS.map((rental) => (
              <div key={`${rental.company}-${rental.start}`} className="admin-table__row" role="row">
                <span role="cell">{rental.company}</span>
                <span role="cell">{rental.vehicle}</span>
                <span role="cell">{rental.start} → {rental.end}</span>
                <span role="cell" className={`admin-status admin-status--${rental.status}`}>
                  {rental.status}
                </span>
                <span role="cell">{formatCurrency(rental.total)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-panel--stacked" aria-label="Automation highlights">
          <header className="admin-panel__header">
            <div>
              <h3>Automation highlights</h3>
              <p>Top workflows nudging the numbers this week.</p>
            </div>
          </header>
          <ul className="admin-ideas">
            {AUTOMATION_IDEAS.slice(0, 2).map((idea) => (
              <li key={idea.title}>
                <h4>{idea.title}</h4>
                <p>{idea.description}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </>
  );

  const renderFleet = () => (
    <>
      <section className="admin-grid" aria-label="Fleet metrics">
        <article className="admin-card admin-card--glow">
          <h3>Total vehicles</h3>
          <p className="admin-card__value">{fleetSummaryDisplay.totalVehicles}</p>
          <span className="admin-card__delta">Across all categories</span>
        </article>
        <article className="admin-card">
          <h3>Average daily rate</h3>
          <p className="admin-card__value">{formatCurrency(fleetSummaryDisplay.averageRate)}</p>
          <span className="admin-card__delta">Blended across active assets</span>
        </article>
        <article className="admin-card">
          <h3>Fleet occupancy</h3>
          <p className="admin-card__value">{fleetSummaryDisplay.occupancy}</p>
          <span className="admin-card__delta">Goal 90% by EOM</span>
        </article>
      </section>

      <section className="admin-panels">
        <article className="admin-panel admin-panel--form" aria-label="Create vehicle unit">
          <header className="admin-panel__header">
            <div>
              <h3>Quick vehicle creator</h3>
              <p>Drop new assets into the marketplace without leaving the dashboard.</p>
            </div>
          </header>
          {formBanner ? (
            <div className={`admin-banner admin-banner--${formBanner.tone}`} role="status">
              {formBanner.text}
            </div>
          ) : null}
          <form className="admin-form" onSubmit={handleCreateVehicle}>
            <label className="admin-form__field">
              <span>Category</span>
              <select
                value={formState.category}
                onChange={(event) => handleFormChange("category", event.target.value as VehicleCategory)}
              >
                {CATEGORY_ORDER.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABEL[category]}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-form__field">
              <span>Vehicle type</span>
              <select
                value={formState.typeId}
                onChange={(event) => handleFormChange("typeId", event.target.value as VehicleTypeId)}
              >
                {availableTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-form__field">
              <span>Unit ID</span>
              <input
                type="text"
                value={formState.unitId}
                onChange={(event) => handleFormChange("unitId", event.target.value)}
                placeholder="e.g. SUV-9812"
              />
            </label>

            <label className="admin-form__field admin-form__field--full">
              <span>Pickup address</span>
              <input
                type="text"
                value={formState.address}
                onChange={(event) => handleFormChange("address", event.target.value)}
                placeholder="Avenida 9 de Julio 1200, Buenos Aires"
              />
            </label>

            <label className="admin-form__field admin-form__field--full">
              <span>Display description</span>
              <textarea
                value={formState.description}
                onChange={(event) => handleFormChange("description", event.target.value)}
                placeholder="Short marketing copy that appears on the client card"
                rows={3}
              />
            </label>

            <label className="admin-form__field admin-form__field--full">
              <span>Image URL</span>
              <input
                type="url"
                value={formState.imageUrl}
                onChange={(event) => handleFormChange("imageUrl", event.target.value)}
                placeholder="https://..."
              />
            </label>

            <button type="submit" className="admin-btn admin-btn--primary">
              Create vehicle
            </button>
          </form>
        </article>

        <article className="admin-panel" aria-label="Fleet breakdown">
          <header className="admin-panel__header">
            <div>
              <h3>Fleet breakdown</h3>
              <p>See where inventory concentrates across categories.</p>
            </div>
          </header>
          <ul className="admin-list">
            {categoryBreakdownDisplay.map(([category, count]) => (
              <li key={category}>
                <span>{CATEGORY_LABEL[category]}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="admin-panels">
        <article className="admin-panel admin-panel--stacked" aria-label="Fleet inventory">
          <header className="admin-panel__header">
            <div>
              <h3>Active inventory</h3>
              <p>Most recent vehicles added to the network.</p>
            </div>
          </header>
          <table className="admin-table admin-table--grid" role="table">
            <thead>
              <tr>
                <th scope="col">Unit</th>
                <th scope="col">Vehicle</th>
                <th scope="col">Category</th>
                <th scope="col">Rate</th>
                <th scope="col">Location</th>
              </tr>
            </thead>
            <tbody>
              {fleetInventoryDisplay.map((unit) => (
                <tr key={unit.id}>
                  <td>{unit.id}</td>
                  <td>{unit.title}</td>
                  <td>{CATEGORY_LABEL[unit.category as VehicleCategory]}</td>
                  <td>{unit.pricePerDay ? `${formatCurrency(unit.pricePerDay)}/day` : "—"}</td>
                  <td>{unit.address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </>
  );

  const renderRentals = () => (
    <>
      <section className="admin-grid" aria-label="Rental health">
        <article className="admin-card admin-card--glow">
          <h3>Total requests</h3>
          <p className="admin-card__value">{RENTAL_PIPELINE.reduce((acc, item) => acc + item.count, 0)}</p>
          <span className="admin-card__delta">Pipeline this quarter</span>
        </article>
        <article className="admin-card">
*** End Patch
          <h3>In review</h3>
          <p className="admin-card__value">{RENTAL_PIPELINE.find((item) => item.status === "review")?.count ?? 0}</p>
          <span className="admin-card__delta">{RENTAL_PIPELINE.find((item) => item.status === "review")?.percent ?? 0}% of pipeline</span>
        </article>
        <article className="admin-card">
          <h3>Approved</h3>
          <p className="admin-card__value">{RENTAL_PIPELINE.find((item) => item.status === "approved")?.count ?? 0}</p>
          <span className="admin-card__delta">{RENTAL_PIPELINE.find((item) => item.status === "approved")?.percent ?? 0}% conversion</span>
        </article>
        <article className="admin-card">
          <h3>Delivered</h3>
          <p className="admin-card__value">{RENTAL_PIPELINE.find((item) => item.status === "delivered")?.count ?? 0}</p>
          <span className="admin-card__delta">{RENTAL_PIPELINE.find((item) => item.status === "delivered")?.percent ?? 0}% fulfilled</span>
        </article>
      </section>

      <section className="admin-panels">
        <article className="admin-panel" aria-label="Status pipeline">
          <header className="admin-panel__header">
            <div>
              <h3>Pipeline health</h3>
              <p>Distribution of requests by lifecycle state.</p>
            </div>
          </header>
          <ul className="admin-status-bars">
            {RENTAL_PIPELINE.map((stage) => (
              <li key={stage.status}>
                <div className="admin-status-bars__label">
                  <span>{stage.status}</span>
                  <span>{stage.count}</span>
                </div>
                <div className="admin-status-bars__track">
                  <div
                    className={`admin-status-bars__fill admin-status-bars__fill--${stage.status}`}
                    style={{ width: `${stage.percent}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="admin-panel admin-panel--stacked" aria-label="Upcoming rentals">
          <header className="admin-panel__header">
            <div>
              <h3>Upcoming rentals</h3>
              <p>Keep deliveries on schedule.</p>
            </div>
            <button type="button" className="admin-pill admin-pill--muted">Open board</button>
          </header>
          <div className="admin-table" role="table">
            <div className="admin-table__row admin-table__row--head" role="row">
              <span role="columnheader">Company</span>
              <span role="columnheader">Vehicle</span>
              <span role="columnheader">Dates</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Total</span>
            </div>
            {UPCOMING_RENTALS.map((rental) => (
              <div key={`${rental.company}-${rental.start}-rentals`} className="admin-table__row" role="row">
                <span role="cell">{rental.company}</span>
                <span role="cell">{rental.vehicle}</span>
                <span role="cell">{rental.start} → {rental.end}</span>
                <span role="cell" className={`admin-status admin-status--${rental.status}`}>
                  {rental.status}
                </span>
                <span role="cell">{formatCurrency(rental.total)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-panel--stacked" aria-label="Recent activity">
          <header className="admin-panel__header">
            <div>
              <h3>Recent activity</h3>
              <p>Latest submissions and their progress.</p>
            </div>
          </header>
          <ul className="admin-activity">
            {AUTOMATION_ACTIVITY.slice(0, 4).map((item) => (
              <li key={`${item.title}-${item.timestamp}`}>
                <div>
                  <strong>{item.company}</strong>
                  <span> · {item.timestamp}</span>
                </div>
                <div className="admin-activity__meta">
                  <span className={`admin-status admin-status--${item.status}`}>{item.status}</span>
                  <span>{item.title}</span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </>
  );

  const renderFinance = () => (
    <>
      <section className="admin-grid" aria-label="Finance metrics">
        {FINANCE_METRICS.map((metric, index) => (
          <article
            key={metric.key}
            className={`admin-card${index === 0 ? " admin-card--glow" : ""}`}
          >
            <h3>{metric.label}</h3>
            <p className="admin-card__value">
              {"format" in metric && typeof metric.format === "function"
                ? metric.format(metric.value)
                : metric.value.toLocaleString()}
            </p>
            <span className="admin-card__delta">{metric.delta}</span>
          </article>
        ))}
      </section>

      <section className="admin-panels">
        <article className="admin-panel admin-panel--wide" aria-label="Revenue trend">
          <header className="admin-panel__header">
            <div>
              <h3>Revenue trend</h3>
              <p>Forecast trajectory for the next quarter.</p>
            </div>
            <button type="button" className="admin-pill">Download CSV</button>
          </header>
          {renderRevenueChart()}
        </article>

        <article className="admin-panel" aria-label="Revenue by status">
          <header className="admin-panel__header">
            <div>
              <h3>Revenue by status</h3>
              <p>Where cash is locked, pending, or lost.</p>
            </div>
          </header>
          <ul className="admin-list">
            {REVENUE_BY_STATUS.map((item) => (
              <li key={item.status}>
                <span>{item.status}</span>
                <strong>{formatCurrency(item.total)}</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="admin-panel admin-panel--stacked" aria-label="Top companies">
        <header className="admin-panel__header">
          <div>
            <h3>Top companies</h3>
            <p>Highest lifetime spend so far.</p>
          </div>
        </header>
        <table className="admin-table admin-table--grid" role="table">
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col">Orders</th>
              <th scope="col">Average</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {TOP_COMPANIES.map((company) => (
              <tr key={company.companyId}>
                <td>{company.companyId.toUpperCase()}</td>
                <td>{company.orders}</td>
                <td>{formatCurrency(Math.round(company.average))}</td>
                <td>{formatCurrency(company.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );

  const renderAutomation = () => (
    <>
      <section className="admin-grid" aria-label="Automation metrics">
        {AUTOMATION_METRICS.map((metric, index) => (
          <article
            key={metric.key}
            className={`admin-card${index === 0 ? " admin-card--glow" : ""}`}
          >
            <h3>{metric.label}</h3>
            <p className="admin-card__value">
              {metric.key === "coverage"
                ? `${metric.value}${metric.suffix ?? ""}`
                : metric.key === "handling"
                  ? `${metric.value} ${metric.suffix ?? ""}`
                  : metric.value}
            </p>
            <span className="admin-card__delta">{metric.delta}</span>
          </article>
        ))}
      </section>

      <section className="admin-panels">
        <article className="admin-panel admin-panel--stacked" aria-label="Automation playbook">
          <header className="admin-panel__header">
            <div>
              <h3>Automation playbook</h3>
              <p>Layer smart triggers to keep teams focused on high-impact moves.</p>
            </div>
          </header>
          <ul className="admin-ideas">
            {AUTOMATION_IDEAS.map((idea) => (
              <li key={idea.title}>
                <h4>{idea.title}</h4>
                <p>{idea.description}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="admin-panel admin-panel--stacked" aria-label="Recent automation activity">
          <header className="admin-panel__header">
            <div>
              <h3>Recent workflow activity</h3>
              <p>Latest automations that executed.</p>
            </div>
          </header>
          <ul className="admin-activity">
            {AUTOMATION_ACTIVITY.map((item) => (
              <li key={`${item.title}-${item.timestamp}`}>
                <div>
                  <strong>{item.title}</strong>
                  <span> · {item.timestamp}</span>
                </div>
                <div className="admin-activity__meta">
                  <span className={`admin-status admin-status--${item.status}`}>{item.status}</span>
                  <span>{item.company}</span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </>
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-topbar">
        <div className="admin-topbar__brand">
          <span className="admin-topbar__badge">PETROMIN</span>
          <h1 className="admin-topbar__title">Admin Console</h1>
        </div>
        <div className="admin-topbar__actions">
          <button
            type="button"
            className="admin-topbar__button"
            onClick={() => setCorporateMode("consumer")}
          >
            Return to explorer
          </button>
          <div className="admin-topmenu" ref={topMenuRef}>
            <button
              type="button"
              className="admin-topmenu__trigger"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label="Open admin sections"
            >
              <span />
              <span />
              <span />
            </button>
            {isMenuOpen ? (
              <div className="admin-topmenu__dropdown" role="menu">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`admin-topmenu__item${adminSection === item.id ? " is-active" : ""}`}
                    onClick={() => {
                      setAdminSection(item.id);
                      setIsMenuOpen(false);
                    }}
                    role="menuitem"
                  >
                    <span className="admin-topmenu__item-label">{item.label}</span>
                    <span className="admin-topmenu__item-description">{SECTION_COPY[item.id].subtitle}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="admin-main" aria-live="polite">
        <header className="admin-header">
          <div>
            <p className="admin-header__eyebrow">{navItem.label.toUpperCase()}</p>
            <h2 className="admin-header__title">{copy.title}</h2>
            <p className="admin-header__subtitle">{copy.subtitle}</p>
          </div>
          <div className="admin-header__actions">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setCorporateMode("corporate")}>
              Corporate portal
            </button>
            <button type="button" className="admin-btn admin-btn--primary">
              Launch action plan
            </button>
          </div>
        </header>

        {adminSection === "overview" ? renderOverview() : null}
        {adminSection === "fleet" ? renderFleet() : null}
        {adminSection === "rentals" ? renderRentals() : null}
        {adminSection === "finance" ? renderFinance() : null}
        {adminSection === "automation" ? renderAutomation() : null}
      </main>
    </div>
  );
}

export default AdminDashboard;
