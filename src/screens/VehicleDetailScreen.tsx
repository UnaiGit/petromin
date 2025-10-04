import { useMemo, useState } from "react";
import type { CatalogSelection } from "./CatalogScreen";
import type { NetPaymentTerm } from "../types";

interface VehicleDetailScreenProps {
  selection: CatalogSelection;
  paymentTerm: NetPaymentTerm;
  onClose: () => void;
  onProceed: (payload: VehicleOrderDraft) => void;
}

export interface VehicleOrderDraft {
  vehicleId: string;
  destinationId: string;
  dateFrom: string;
  dateTo: string;
  days: number;
  pricePerDay: number;
  total: number;
  po?: string;
  paymentTerm: NetPaymentTerm;
}

export function VehicleDetailScreen({ selection, paymentTerm, onClose, onProceed }: VehicleDetailScreenProps) {
  const [dateFrom, setDateFrom] = useState(selection.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(selection.dateTo ?? "");
  const [po, setPo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const vehicle = selection.vehicle;
  const pricing = selection.pricing;

  const gallery = useMemo(() => vehicle.gallery ?? [vehicle.heroImage ?? "/cars/default.webp"], [vehicle.gallery, vehicle.heroImage]);
  const rentalDays = computeRentalDays(dateFrom, dateTo);
  const meetsMinimum = rentalDays !== null && rentalDays >= pricing.minDays;
  const totalPrice = rentalDays ? rentalDays * pricing.pricePerDay : 0;

  const handleProceed = () => {
    if (!dateFrom || !dateTo || rentalDays === null) {
      setError("Select a valid date range.");
      return;
    }
    if (!meetsMinimum) {
      setError(`Minimum rental is ${pricing.minDays} days.`);
      return;
    }
    setError(null);
    onProceed({
      vehicleId: vehicle.id,
      destinationId: selection.destinationId,
      dateFrom,
      dateTo,
      days: rentalDays,
      pricePerDay: pricing.pricePerDay,
      total: totalPrice,
      po: po.trim() ? po.trim() : undefined,
      paymentTerm,
    });
  };

  return (
    <div className="vehicle-detail">
      <button type="button" className="link-button" onClick={onClose}>
        ← Back to catalog
      </button>
      <header className="vehicle-detail__header">
        <div>
          <h1>
            {vehicle.make} {vehicle.model}
          </h1>
          <p>{vehicle.description}</p>
        </div>
        <div className="vehicle-detail__pricing">
          <strong>{formatCurrency(pricing.pricePerDay)}</strong>
          <span>per day · Min. {pricing.minDays} days</span>
        </div>
      </header>
      <div className="vehicle-detail__gallery">
        {gallery.map((image, index) => (
          <img key={image} src={image} alt={`${vehicle.make} ${vehicle.model} view ${index + 1}`} />
        ))}
      </div>
      <section className="vehicle-detail__section">
        <h2>Trip details</h2>
        <div className="form-grid">
          <label>
            From
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <label>
            PO / Internal reference
            <input type="text" value={po} placeholder="Optional" onChange={(event) => setPo(event.target.value)} />
          </label>
        </div>
        <p className="vehicle-detail__meta">Destination: {selection.destinationId}</p>
        <p className="vehicle-detail__meta">Payment terms: {paymentTerm === "NET30" ? "Net 30" : "Net 60"}</p>
        {pricing.mileagePolicy ? <p className="vehicle-detail__meta">Mileage policy: {pricing.mileagePolicy}</p> : null}
        {pricing.deposit ? <p className="vehicle-detail__meta">Deposit due: {formatCurrency(pricing.deposit)}</p> : null}
      </section>
      <section className="vehicle-detail__section">
        <h2>Specifications</h2>
        <dl className="vehicle-detail__specs">
          <div>
            <dt>Category</dt>
            <dd>{vehicle.category}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{vehicle.powerKw} kW</dd>
          </div>
          <div>
            <dt>Consumption</dt>
            <dd>{vehicle.consumption}</dd>
          </div>
          <div>
            <dt>Passengers</dt>
            <dd>{vehicle.passengers ?? "—"}</dd>
          </div>
        </dl>
      </section>
      <section className="vehicle-detail__section">
        <h2>Cost summary</h2>
        <div className="vehicle-detail__cost">
          <div>
            <span>Days</span>
            <strong>{rentalDays ?? "—"}</strong>
          </div>
          <div>
            <span>Price/day</span>
            <strong>{formatCurrency(pricing.pricePerDay)}</strong>
          </div>
          <div>
            <span>Subtotal</span>
            <strong>{rentalDays ? formatCurrency(totalPrice) : "—"}</strong>
          </div>
        </div>
        <p className="vehicle-detail__legal">Taxes calculated on invoice. Payment terms start from invoice date.</p>
      </section>
      {error ? (
        <div className="vehicle-detail__error" role="alert">
          {error}
        </div>
      ) : null}
      <footer className="vehicle-detail__footer">
        <button type="button" className="primary-button" onClick={handleProceed} disabled={!meetsMinimum || rentalDays === null}>
          Request purchase
        </button>
      </footer>
    </div>
  );
}

function computeRentalDays(from: string, to: string): number | null {
  if (!from || !to) return null;
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return null;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(value);
}
