import { useMemo } from "react";
import { useAppStore } from "../state/useAppStore";
import type { OrderPurchase } from "../types";

interface OrdersScreenProps {
  onReorder: (order: OrderPurchase) => void;
  onOpenIssue?: (order: OrderPurchase) => void;
}

export function OrdersScreen({ onReorder, onOpenIssue }: OrdersScreenProps) {
  const orders = useAppStore((state) => state.orders);
  const orderFilters = useAppStore((state) => state.orderFilters);
  const setOrderFilters = useAppStore((state) => state.setOrderFilters);
  const destinations = useAppStore((state) => state.destinations);
  const vehicles = useAppStore((state) => state.vehicles);
  const trackEvent = useAppStore((state) => state.trackEvent);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderFilters.status !== "all" && order.status !== orderFilters.status) {
        return false;
      }
      if (orderFilters.destinationId !== "all" && order.destinationId !== orderFilters.destinationId) {
        return false;
      }
      if (orderFilters.dateFrom && order.dateFrom < orderFilters.dateFrom) {
        return false;
      }
      if (orderFilters.dateTo && order.dateTo > orderFilters.dateTo) {
        return false;
      }
      return true;
    });
  }, [orders, orderFilters.status, orderFilters.destinationId, orderFilters.dateFrom, orderFilters.dateTo]);

  const handleDownload = (order: OrderPurchase) => {
    if (order.artifacts.requestPdfUrl) {
      window.open(order.artifacts.requestPdfUrl, "_blank", "noopener");
    }
    trackEvent({ type: "order_pdf_downloaded", orderId: order.id });
  };

  return (
    <section className="orders orders--business">
      <header className="orders__header">
        <div>
          <h1>Orders &amp; purchase history</h1>
          <p>Monitor purchase orders, trigger reorders instantly, and keep operations aligned with PETROMIN fleet control.</p>
        </div>
      </header>
      <div className="orders__filters">
        <label>
          Status
          <select value={orderFilters.status} onChange={(event) => setOrderFilters({ status: event.target.value as typeof orderFilters.status })}>
            <option value="all">All</option>
            <option value="review">In review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="delivered">Delivered</option>
          </select>
        </label>
        <label>
          Destination
          <select value={orderFilters.destinationId} onChange={(event) => setOrderFilters({ destinationId: event.target.value })}>
            <option value="all">All</option>
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input type="date" value={orderFilters.dateFrom ?? ""} onChange={(event) => setOrderFilters({ dateFrom: event.target.value || null })} />
        </label>
        <label>
          To
          <input type="date" value={orderFilters.dateTo ?? ""} onChange={(event) => setOrderFilters({ dateTo: event.target.value || null })} />
        </label>
      </div>
      <div className="orders__list">
        {filteredOrders.map((order) => {
          const destination = destinations.find((item) => item.id === order.destinationId);
          const vehicle = vehicles.find((item) => item.id === order.vehicleId);
          return (
            <article key={order.id} className={`orders__item orders__item--${order.status}`}>
              <header className="orders__item-header">
                <div>
                  <p className="orders__item-id">Order {order.id}</p>
                  <h3>{vehicle ? `${vehicle.make} ${vehicle.model}` : order.vehicleId}</h3>
                </div>
                <span className="orders__status">{formatStatus(order.status)}</span>
              </header>
              <dl className="orders__details">
                <div>
                  <dt>Destination</dt>
                  <dd>{destination?.name ?? order.destinationId}</dd>
                </div>
                <div>
                  <dt>Dates</dt>
                  <dd>
                    {formatDate(order.dateFrom)} → {formatDate(order.dateTo)} ({order.days} days)
                  </dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{formatCurrency(order.total)}</dd>
                </div>
                <div>
                  <dt>Payment term</dt>
                  <dd>{order.paymentTerm === "NET30" ? "Net 30" : "Net 60"}</dd>
                </div>
                {order.po ? (
                  <div>
                    <dt>PO</dt>
                    <dd>{order.po}</dd>
                  </div>
                ) : null}
              </dl>
              <footer className="orders__actions">
                <button type="button" className="orders__primary" onClick={() => onReorder(order)}>
                  Reorder vehicle
                </button>
                <button
                  type="button"
                  className="orders__ghost"
                  onClick={() => handleDownload(order)}
                  disabled={!order.artifacts.requestPdfUrl}
                >
                  Download PDF
                </button>
                <button type="button" className="orders__ghost" onClick={() => onOpenIssue?.(order)}>
                  Open issue
                </button>
              </footer>
            </article>
          );
        })}
        {filteredOrders.length === 0 ? <div className="orders__empty">No orders match the selected filters.</div> : null}
      </div>
    </section>
  );
}

function formatStatus(status: OrderPurchase["status"]) {
  switch (status) {
    case "review":
      return "In review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "delivered":
      return "Delivered";
    default:
      return status;
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(date));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}
