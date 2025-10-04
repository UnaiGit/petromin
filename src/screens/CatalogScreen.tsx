import { useMemo } from "react";
import { useAppStore } from "../state/useAppStore";
import type { Vehicle, VehiclePricing } from "../types";

interface CatalogScreenProps {
  onSelectVehicle: (selection: CatalogSelection) => void;
  onRequireOnboarding?: () => void;
}

export interface CatalogSelection {
  vehicle: Vehicle;
  pricing: VehiclePricing;
  destinationId: string;
  dateFrom: string | null;
  dateTo: string | null;
  days: number;
}

export function CatalogScreen({ onSelectVehicle, onRequireOnboarding }: CatalogScreenProps) {
  const vehicles = useAppStore((state) => state.vehicles);
  const destinations = useAppStore((state) => state.destinations);
  const filters = useAppStore((state) => state.catalogFilters);
  const setFilters = useAppStore((state) => state.setCatalogFilters);
  const company = useAppStore((state) => state.company);

  const destination = destinations.find((item) => item.id === filters.destinationId);
  const rentalDays = computeRentalDays(filters.dateFrom, filters.dateTo);
  const canAccessCatalog = company?.verificationStatus === "approved";

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((vehicle) => {
        if (!vehicle.pricing) return false;
        const pricing = vehicle.pricing.find((item) => item.destinationId === filters.destinationId);
        if (!pricing) return false;
        if (filters.category !== "all" && vehicle.category !== filters.category) {
          return false;
        }
        if (filters.passengers && vehicle.passengers && vehicle.passengers < filters.passengers) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const priceA = a.pricing?.find((item) => item.destinationId === filters.destinationId)?.pricePerDay ?? Number.MAX_SAFE_INTEGER;
        const priceB = b.pricing?.find((item) => item.destinationId === filters.destinationId)?.pricePerDay ?? Number.MAX_SAFE_INTEGER;
        return priceA - priceB;
      });
  }, [vehicles, filters.destinationId, filters.category, filters.passengers]);

  const handleDestinationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ destinationId: event.target.value });
  };

  const handleDateChange = (key: "dateFrom" | "dateTo", value: string) => {
    if (key === "dateFrom" && filters.dateTo && value && value > filters.dateTo) {
      setFilters({ dateFrom: value, dateTo: value });
      return;
    }
    if (key === "dateTo" && filters.dateFrom && value && value < filters.dateFrom) {
      setFilters({ dateFrom: value, dateTo: value });
      return;
    }
    setFilters({ [key]: value } as Partial<typeof filters>);
  };

  if (!canAccessCatalog) {
    return (
      <section className="catalog catalog--locked">
        <div className="catalog__locked-card">
          <h2>Complete onboarding to access the corporate catalog</h2>
          <p>Finish the company verification process to browse vehicles and request purchases.</p>
          <button type="button" className="primary-button" onClick={onRequireOnboarding}>
            Open onboarding
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="catalog catalog--business">
      <header className="catalog__header">
        <div>
          <h1>Corporate catalog</h1>
          <p>Premium fleet by destination with business pricing and minimum rental durations.</p>
        </div>
        {destination ? <span className="catalog__destination">{destination.name}</span> : null}
      </header>
      <div className="catalog__filters">
        <label>
          Destination
          <select value={filters.destinationId} onChange={handleDestinationChange}>
            {destinations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input type="date" value={filters.dateFrom ?? ""} onChange={(event) => handleDateChange("dateFrom", event.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={filters.dateTo ?? ""} onChange={(event) => handleDateChange("dateTo", event.target.value)} />
        </label>
        <label>
          Category
          <select value={filters.category} onChange={(event) => setFilters({ category: event.target.value as typeof filters.category })}>
            <option value="all">All</option>
            <option value="electric">Electric</option>
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </select>
        </label>
        <label>
          Passengers
          <select
            value={filters.passengers ? String(filters.passengers) : ""}
            onChange={(event) => setFilters({ passengers: event.target.value ? Number(event.target.value) : null })}
          >
            <option value="">Any</option>
            <option value="2">2+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
            <option value="6">6+</option>
          </select>
        </label>
      </div>
      <div className="catalog__list">
        {filteredVehicles.map((vehicle) => {
          const pricing = vehicle.pricing?.find((item) => item.destinationId === filters.destinationId);
          if (!pricing) return null;
          const meetsMinimum = rentalDays === null ? false : rentalDays >= pricing.minDays;
          const hasDates = filters.dateFrom && filters.dateTo;
          const totalDays = rentalDays ?? pricing.minDays;
          const estimatedTotal = hasDates ? rentalDays! * pricing.pricePerDay : pricing.minDays * pricing.pricePerDay;
          const ctaDisabled = !hasDates || !meetsMinimum;
          const ctaLabel = !hasDates ? "Select dates" : !meetsMinimum ? `Minimum ${pricing.minDays} days` : "View details";
          return (
            <article key={vehicle.id} className="catalog-card">
              <div className="catalog-card__media">
                <img src={vehicle.heroImage ?? "/cars/default.webp"} alt={`${vehicle.make} ${vehicle.model}`} />
                {company?.verificationStatus === "approved" ? (
                  <span className="catalog-card__badge">Business approved</span>
                ) : null}
              </div>
              <div className="catalog-card__body">
                <header>
                  <h3>
                    {vehicle.make} {vehicle.model}
                  </h3>
                  <p>{vehicle.description}</p>
                </header>
                <dl className="catalog-card__meta">
                  <div>
                    <dt>Price/day</dt>
                    <dd>{formatCurrency(pricing.pricePerDay)}</dd>
                  </div>
                  <div>
                    <dt>Minimum rental</dt>
                    <dd>Min. {pricing.minDays} days</dd>
                  </div>
                  <div>
                    <dt>Passengers</dt>
                    <dd>{vehicle.passengers ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Mileage policy</dt>
                    <dd>{pricing.mileagePolicy ?? "See detail"}</dd>
                  </div>
                  {pricing.deposit ? (
                    <div>
                      <dt>Deposit</dt>
                      <dd>{formatCurrency(pricing.deposit)}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="catalog-card__summary">
                  <span>Estimated total (days × price/day)</span>
                  <strong>{hasDates ? formatCurrency(estimatedTotal) : "Select dates"}</strong>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={ctaDisabled}
                  onClick={() =>
                    onSelectVehicle({
                      vehicle,
                      pricing,
                      destinationId: filters.destinationId,
                      dateFrom: filters.dateFrom,
                      dateTo: filters.dateTo,
                      days: totalDays,
                    })
                  }
                >
                  {ctaLabel}
                </button>
              </div>
            </article>
          );
        })}
        {filteredVehicles.length === 0 ? <div className="catalog__empty">No vehicles match these filters.</div> : null}
      </div>
    </section>
  );
}

function computeRentalDays(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return null;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 0;
  return Math.max(1, diffDays);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(value);
}
