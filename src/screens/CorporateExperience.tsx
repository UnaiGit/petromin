import { useEffect, useMemo, useState } from "react";
import { BottomNav, corporateNavItems } from "../components/BottomNav";
import { useAppStore } from "../state/useAppStore";
import type { CatalogSelection } from "./CatalogScreen";
import { CatalogScreen } from "./CatalogScreen";
import { VehicleDetailScreen, type VehicleOrderDraft } from "./VehicleDetailScreen";
import { OrderSignatureScreen } from "./OrderSignatureScreen";
import { OrdersScreen } from "./OrdersScreen";
import { CompanyScreen } from "./CompanyScreen";
import { CompanyOnboardingScreen } from "./CompanyOnboardingScreen";
import type { CorporateNavSection, OrderPurchase, SignaturePayload } from "../types";

type CorporateView = "catalog" | "vehicle-detail" | "order-signature" | "order-confirmation";

export function CorporateExperience() {
  const corporateTab = useAppStore((state) => state.corporateTab);
  const setCorporateTab = useAppStore((state) => state.setCorporateTab);
  const setCorporateMode = useAppStore((state) => state.setCorporateMode);
  const company = useAppStore((state) => state.company);
  const submitOrder = useAppStore((state) => state.submitOrder);
  const destinations = useAppStore((state) => state.destinations);
  const vehicles = useAppStore((state) => state.vehicles);

  const [view, setView] = useState<CorporateView>("catalog");
  const [selection, setSelection] = useState<CatalogSelection | null>(null);
  const [orderDraft, setOrderDraft] = useState<VehicleOrderDraft | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<OrderPurchase | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (corporateTab !== "catalog") {
      setView("catalog");
      setSelection(null);
      setOrderDraft(null);
    }
  }, [corporateTab]);

  const paymentTerm = company?.paymentTerms.type ?? "NET30";

  const destinationName = useMemo(() => {
    if (!selection) return "";
    return destinations.find((item) => item.id === selection.destinationId)?.name ?? selection.destinationId;
  }, [destinations, selection]);

  const handleVehicleSelection = (nextSelection: CatalogSelection) => {
    setSelection(nextSelection);
    setView("vehicle-detail");
  };

  const handleOrderDraft = (draft: VehicleOrderDraft) => {
    setOrderDraft(draft);
    setView("order-signature");
  };

  const handleSignatureSubmit = ({ signature }: { signature: SignaturePayload; acceptTerms: boolean }) => {
    if (!orderDraft) return;
    setSubmitting(true);
    const signaturePayload: SignaturePayload = {
      ...signature,
      signerName: signature.signerName ?? company?.billingContact.name,
      signerEmail: signature.signerEmail ?? company?.billingContact.email,
    };
    const order = submitOrder({
      companyId: company?.id ?? "demo-company",
      vehicleId: orderDraft.vehicleId,
      destinationId: orderDraft.destinationId,
      dateFrom: orderDraft.dateFrom,
      dateTo: orderDraft.dateTo,
      days: orderDraft.days,
      pricePerDay: orderDraft.pricePerDay,
      total: orderDraft.total,
      paymentTerm,
      signature: signaturePayload,
      po: orderDraft.po,
      artifacts: { requestPdfUrl: signaturePayload?.imageData },
    });
    setSubmittedOrder(order);
    setSubmitting(false);
    setToast(`Order ${order.id} submitted. In review with operations.`);
    setView("order-confirmation");
  };

  const handleReorder = (order: OrderPurchase) => {
    const vehicle = vehicles.find((item) => item.id === order.vehicleId);
    if (!vehicle || !vehicle.pricing) return;
    const pricing = vehicle.pricing.find((item) => item.destinationId === order.destinationId);
    if (!pricing) return;
    const selectionPayload: CatalogSelection = {
      vehicle,
      pricing,
      destinationId: order.destinationId,
      dateFrom: order.dateFrom,
      dateTo: order.dateTo,
      days: order.days,
    };
    setCorporateTab("catalog");
    setSelection(selectionPayload);
    setView("vehicle-detail");
  };

  useEffect(() => {
    if (toast) {
      const timeout = window.setTimeout(() => setToast(null), 4000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [toast]);

  const topNavItems = useMemo(() => corporateNavItems.filter((item) => item.id !== "home"), []);

  return (
    <div className="corporate">
      <header className="corporate__top">
        <div className="corporate__branding">
          <span className="corporate__badge">PETROMIN Business</span>
          {company ? <span className="corporate__company">{company.legalName}</span> : <span className="corporate__company">New corporate account</span>}
        </div>
        <nav className="corporate__nav" aria-label="Corporate">
          {topNavItems.map((item) => {
            const active = corporateTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`corporate__nav-item${active ? " is-active" : ""}`}
                onClick={() => setCorporateTab(item.id as CorporateNavSection)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <button type="button" className="corporate__exit" onClick={() => setCorporateMode("consumer")}>
          Exit business
        </button>
      </header>
      {toast ? (
        <div className="corporate__toast" role="status">
          {toast}
        </div>
      ) : null}
      <main className="corporate__content">
        {corporateTab === "catalog" ? (
          <>
            {view === "catalog" ? <CatalogScreen onSelectVehicle={handleVehicleSelection} onRequireOnboarding={() => setCorporateTab("company")} /> : null}
            {view === "vehicle-detail" && selection ? (
              <VehicleDetailScreen selection={selection} paymentTerm={paymentTerm} onClose={() => setView("catalog")} onProceed={handleOrderDraft} />
            ) : null}
            {view === "order-signature" && orderDraft ? (
              <OrderSignatureScreen
                draft={orderDraft}
                vehicleLabel={`${selection?.vehicle.make ?? ""} ${selection?.vehicle.model ?? ""}`.trim()}
                destinationLabel={destinationName}
                paymentTermLabel={paymentTerm === "NET30" ? "Net 30" : "Net 60"}
                companyContractUrl={company?.contract.pdfUrl}
                onBack={() => setView("vehicle-detail")}
                onSubmit={({ signature, acceptTerms }) => handleSignatureSubmit({ signature, acceptTerms })}
                submitting={submitting}
              />
            ) : null}
            {view === "order-confirmation" && submittedOrder ? (
              <OrderConfirmation
                order={submittedOrder}
                onViewOrders={() => {
                  setCorporateTab("orders");
                  setSubmittedOrder(null);
                  setView("catalog");
                }}
                onNewRequest={() => {
                  setSubmittedOrder(null);
                  setSelection(null);
                  setOrderDraft(null);
                  setView("catalog");
                }}
              />
            ) : null}
          </>
        ) : null}
        {corporateTab === "orders" ? <OrdersScreen onReorder={handleReorder} onOpenIssue={(order) => setToast(`Issue opened for order ${order.id}.`)} /> : null}
        {corporateTab === "company" ? (
          company?.verificationStatus === "approved" ? <CompanyScreen /> : <CompanyOnboardingScreen />
        ) : null}
        {corporateTab === "help" ? (
          <section className="corporate__help">
            <h1>Need assistance?</h1>
            <p>Contact business-support@swiftride.com or schedule a call with your account manager.</p>
            <ul>
              <li>Hours: Monday–Friday, 08:00–20:00 CET</li>
              <li>Emergency line: +34 900 123 456</li>
              <li>Knowledge base: <a href="#">View guides</a></li>
            </ul>
          </section>
        ) : null}
      </main>
      <BottomNav
        items={corporateNavItems}
        activeId={corporateTab}
        onSelect={(id) => {
          if (id === "home") {
            setCorporateMode("consumer");
            return;
          }
          setCorporateTab(id as CorporateNavSection);
        }}
      />
    </div>
  );
}

function OrderConfirmation({ order, onViewOrders, onNewRequest }: { order: OrderPurchase; onViewOrders: () => void; onNewRequest: () => void }) {
  return (
    <section className="order-confirmation">
      <h2>Order {order.id} submitted</h2>
      <p>Status: In review. Operations will confirm within 10 minutes.</p>
      <p>
        Confirmation ETA: 10 minutes · Total: {formatCurrency(order.total)} · Payment terms: {order.paymentTerm === "NET30" ? "Net 30" : "Net 60"}
      </p>
      <div className="order-confirmation__actions">
        <button type="button" className="primary-button" onClick={onViewOrders}>
          View orders
        </button>
        <button type="button" onClick={onNewRequest}>
          New request
        </button>
      </div>
    </section>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}
