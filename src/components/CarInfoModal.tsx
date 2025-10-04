import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import type { Driver, Vehicle } from "../types";

interface CarInfoModalProps {
  vehicle: Vehicle | null;
  driver?: Driver;
  open: boolean;
  onClose: () => void;
  onReserve: () => void;
}

export function CarInfoModal({ vehicle, driver, open, onClose, onReserve }: CarInfoModalProps) {
  const chips = useMemo(() => {
    if (!vehicle) return [];
    return [
      { label: "Power", value: `${vehicle.powerKw} kW` },
      { label: "Efficiency", value: vehicle.consumption },
      { label: "Plate", value: vehicle.plate },
    ];
  }, [vehicle]);

  const pricing = vehicle?.pricing?.[0];

  return (
    <AnimatePresence>
      {open && vehicle ? (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.article
            className="modal-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`${vehicle.make} ${vehicle.model}`}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-sheet__header">
              <div>
                <p className="modal-sheet__eyebrow">Exclusive — {vehicle.model}</p>
                <h2>{vehicle.make}</h2>
              </div>
              <button type="button" className="modal-sheet__close" aria-label="Close" onClick={onClose}>
                ×
              </button>
            </header>
            <div className="modal-sheet__hero" aria-hidden="true" />
            <ul className="modal-sheet__chips">
              {chips.map((chip) => (
                <li key={chip.label}>
                  <span>{chip.label}</span>
                  <strong>{chip.value}</strong>
                </li>
              ))}
            </ul>
            {driver ? (
              <section className="modal-sheet__driver">
                <div className="modal-sheet__avatar" aria-hidden="true">
                  <img src={driver.avatarUrl} alt="" />
                </div>
                <div>
                  <h3>{driver.name}</h3>
                  <p>{driver.rating.toFixed(2)} ★ rating</p>
                </div>
              </section>
            ) : null}
            <section className="modal-sheet__price">
              <div>
                <h3>Price/day</h3>
                <p>{pricing ? formatCurrency(pricing.pricePerDay) : "—"}</p>
              </div>
              <div>
                <h3>Minimum rental</h3>
                <p>{pricing ? `${pricing.minDays} days` : "—"}</p>
              </div>
              <span className="modal-sheet__badge">Business ready</span>
            </section>
            <button type="button" className="modal-sheet__cta" onClick={onReserve}>
              Reserve Now
            </button>
          </motion.article>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}
