import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Ride } from "../types";

interface PaymentSheetProps {
  open: boolean;
  ride: Ride | null;
  onComplete: (options: { tipPercent: number | null; rating: number; comment: string }) => void;
  onClose: () => void;
}

const TIPS = [
  { label: "5%", value: 5 },
  { label: "10%", value: 10 },
  { label: "Custom", value: 0 },
];

export function PaymentSheet({ open, ride, onComplete, onClose }: PaymentSheetProps) {
  const [tip, setTip] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const total = ride?.priceEst?.value ?? 12.4;

  return (
    <AnimatePresence>
      {open ? (
        <motion.section
          className="payment-sheet"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 32 }}
          role="dialog"
          aria-modal="true"
        >
          <header>
            <h2>Payment & Receipt</h2>
            <button type="button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </header>
          <div className="payment-sheet__total">
            <span>Total fare</span>
            <strong>€{total.toFixed(2)}</strong>
          </div>
          <section className="payment-sheet__tips">
            <h3>Tip your driver</h3>
            <div>
              {TIPS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className={tip === option.value ? "is-active" : ""}
                  onClick={() => setTip(option.value === 0 ? null : option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
          <section className="payment-sheet__rating">
            <h3>Rate your driver</h3>
            <div className="rating-stars" role="radiogroup" aria-label="Rate your driver">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={rating >= value ? "is-filled" : ""}
                  onClick={() => setRating(value)}
                  aria-label={`${value} star${value > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              placeholder="Add a note (optional)"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </section>
          <button
            type="button"
            className="payment-sheet__cta"
            onClick={() => onComplete({ tipPercent: tip, rating, comment })}
          >
            Done
          </button>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
