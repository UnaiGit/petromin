import { useMemo, useState } from "react";
import { SignaturePad } from "../components/SignaturePad";
import type { SignaturePayload } from "../types";
import type { VehicleOrderDraft } from "./VehicleDetailScreen";

interface OrderSignatureScreenProps {
  draft: VehicleOrderDraft;
  vehicleLabel: string;
  destinationLabel: string;
  paymentTermLabel: string;
  companyContractUrl?: string;
  onBack: () => void;
  onSubmit: (payload: { signature: SignaturePayload; acceptTerms: boolean }) => void;
  submitting?: boolean;
}

export function OrderSignatureScreen({ draft, vehicleLabel, destinationLabel, paymentTermLabel, companyContractUrl, onBack, onSubmit, submitting = false }: OrderSignatureScreenProps) {
  const [signature, setSignature] = useState<SignaturePayload | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summaryItems = useMemo(
    () => [
      { label: "Vehicle", value: vehicleLabel },
      { label: "Destination", value: destinationLabel },
      { label: "Dates", value: `${formatDate(draft.dateFrom)} → ${formatDate(draft.dateTo)}` },
      { label: "Days", value: String(draft.days) },
      { label: "Total", value: formatCurrency(draft.total) },
      { label: "Payment terms", value: paymentTermLabel },
      ...(draft.po ? [{ label: "PO", value: draft.po }] : []),
    ],
    [draft.dateFrom, draft.dateTo, draft.days, draft.total, paymentTermLabel, vehicleLabel, destinationLabel, draft.po]
  );

  const handleSignatureChange = (image: string | null) => {
    if (!image) {
      setSignature(null);
      return;
    }
    const payload: SignaturePayload = {
      signedAt: new Date().toISOString(),
      imageData: image,
      ip: window.location.hostname || "127.0.0.1",
      userAgent: window.navigator.userAgent,
    };
    setSignature(payload);
    setError(null);
  };

  const handleSubmit = () => {
    if (!signature) {
      setError("Signature required.");
      return;
    }
    if (!isAuthorized) {
      setError("Confirm you are an authorized representative.");
      return;
    }
    setError(null);
    onSubmit({ signature, acceptTerms: isAuthorized });
  };

  return (
    <div className="order-signature">
      <button type="button" className="link-button" onClick={onBack}>
        ← Back to vehicle detail
      </button>
      <header>
        <h1>Sign purchase request</h1>
        <p>Each corporate order requires a digital signature and acknowledgment of the master contract.</p>
      </header>
      <section className="order-signature__summary">
        <h2>Order summary</h2>
        <dl>
          {summaryItems.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <SignaturePad
        value={signature?.imageData}
        onChange={handleSignatureChange}
        label="Digital signature*"
        helperText="Signature captures timestamp, IP, and user-agent metadata."
      />
      <label className="order-signature__checkbox">
        <input type="checkbox" checked={isAuthorized} onChange={(event) => setIsAuthorized(event.target.checked)} />
        <span>I declare I am an authorized representative.</span>
      </label>
      <p className="order-signature__legal">
        By submitting, you agree to the{' '}
        <a href={companyContractUrl ?? "#"} target="_blank" rel="noreferrer">
          master contract
        </a>{' '}
        and authorize SwiftRide to issue the purchase order PDF with the embedded signature.
      </p>
      {error ? (
        <div className="order-signature__error" role="alert">
          {error}
        </div>
      ) : null}
      <footer className="order-signature__footer">
        <button type="button" className="primary-button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Sign and submit request"}
        </button>
      </footer>
    </div>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(date));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}
