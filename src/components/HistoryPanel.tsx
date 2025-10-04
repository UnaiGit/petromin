import { AnimatePresence, motion } from "framer-motion";
import type { RideHistoryItem } from "../types";

interface HistoryPanelProps {
  open: boolean;
  history: RideHistoryItem[];
  onClose: () => void;
}

export function HistoryPanel({ open, history, onClose }: HistoryPanelProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.section
          className="history-panel"
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 32 }}
        >
          <header>
            <h2>History</h2>
            <button type="button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </header>
          {history.length === 0 ? (
            <p className="history-panel__empty">No rides yet.</p>
          ) : (
            <ul>
              {history.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.total}</strong>
                    <span>{item.date}</span>
                  </div>
                  <p>{item.from} → {item.to}</p>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
