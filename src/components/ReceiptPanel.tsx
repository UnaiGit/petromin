import { AnimatePresence, motion } from "framer-motion";
import type { RideHistoryItem } from "../types";

interface ReceiptPanelProps {
  open: boolean;
  historyEntry: RideHistoryItem | null;
  onDone: () => void;
  onViewHistory: () => void;
}

export function ReceiptPanel({ open, historyEntry, onDone, onViewHistory }: ReceiptPanelProps) {
  return (
    <AnimatePresence>
      {open && historyEntry ? (
        <motion.section
          className="receipt-panel"
          initial={{ y: 140, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
        >
          <h2>Receipt</h2>
          <p className="receipt-panel__total">{historyEntry.total}</p>
          <div className="receipt-panel__rows">
            <div>
              <span>Date</span>
              <span>{historyEntry.date}</span>
            </div>
            <div>
              <span>Trip</span>
              <span>{historyEntry.from} → {historyEntry.to}</span>
            </div>
          </div>
          <div className="receipt-panel__buttons">
            <button type="button" onClick={onViewHistory}>View History</button>
            <button type="button" className="primary" onClick={onDone}>Done</button>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
