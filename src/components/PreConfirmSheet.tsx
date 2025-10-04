import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import type { QuoteBreakdownItem, Ride, Vehicle } from "../types";

interface PreConfirmSheetProps {
  open: boolean;
  vehicle: Vehicle | null;
  quote: QuoteBreakdownItem[];
  ride: Ride | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function PreConfirmSheet({ open, vehicle, quote, ride, onClose, onConfirm }: PreConfirmSheetProps) {
  const breakdown = useMemo(() => quote ?? [], [quote]);

  return (
    <AnimatePresence>
      {open && vehicle ? (
        <motion.div
          className="preconfirm"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Request"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 160, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
        >
          <header>
            <h2>Confirm Request</h2>
            <button type="button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </header>
          <section className="preconfirm__route">
            <div className="preconfirm__map" aria-hidden="true" />
            <div>
              <p>Pickup: Premium Zone</p>
              <p>Dropoff: Financial District</p>
              <p>{ride?.etaSec ? Math.round(ride.etaSec / 60) : 3} min · €12.40</p>
            </div>
          </section>
          <section className="preconfirm__summary">
            <h3>{vehicle.make} {vehicle.model}</h3>
            <dl>
              {breakdown.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
            <div className="preconfirm__payment">
              <span>Visa •1234</span>
              <button type="button">Change</button>
            </div>
          </section>
          <button type="button" className="preconfirm__cta" onClick={onConfirm}>
            Confirm Request
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
