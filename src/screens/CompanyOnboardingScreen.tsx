import { useEffect, useMemo, useState } from "react";
import { SignaturePad } from "../components/SignaturePad";
import { useAppStore } from "../state/useAppStore";
import type { CompanyDocumentAsset, CompanyOnboardingDraft, CompanyProfile, NetPaymentTerm, SignaturePayload } from "../types";

const DOCUMENT_CONFIG: { kind: CompanyDocumentAsset["kind"]; label: string; required?: boolean }[] = [
  { kind: "tax_id", label: "Tax ID document", required: true },
  { kind: "articles", label: "Articles of incorporation" },
  { kind: "power_of_attorney", label: "Power of attorney" },
  { kind: "representative_id", label: "Representative ID", required: true },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function CompanyOnboardingScreen() {
  const draft = useAppStore((state) => state.onboardingDraft);
  const updateDraft = useAppStore((state) => state.updateOnboardingDraft);
  const resetDraft = useAppStore((state) => state.resetOnboarding);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const updateCompany = useAppStore((state) => state.updateCompany);
  const company = useAppStore((state) => state.company);
  const destinations = useAppStore((state) => state.destinations);
  const trackEvent = useAppStore((state) => state.trackEvent);

  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const countries = useMemo(() => Array.from(new Set(destinations.map((item) => item.country))).sort(), [destinations]);

  useEffect(() => {
    trackEvent({ type: "b2b_onboarding_step_view", step: draft.step });
    setStepError(null);
  }, [draft.step, trackEvent]);

  const handleFieldChange = <K extends keyof CompanyOnboardingDraft>(key: K, value: CompanyOnboardingDraft[K]) => {
    updateDraft({ [key]: value } as Partial<CompanyOnboardingDraft>);
  };

  const handleContactChange = (key: keyof CompanyOnboardingDraft["billingContact"], value: string) => {
    updateDraft({ billingContact: { ...draft.billingContact, [key]: value } });
  };

  const handlePaymentTermsChange = (patch: Partial<NonNullable<CompanyOnboardingDraft["paymentTerms"]>>) => {
    const base = draft.paymentTerms ?? { type: "NET30" as NetPaymentTerm };
    updateDraft({ paymentTerms: { ...base, ...patch } });
  };

  const handleDocumentUpload = async (kind: CompanyDocumentAsset["kind"], fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const promises = Array.from(fileList).map(async (file) => {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`${file.name} is larger than 10MB.`);
      }
      const previewData = await readFileAsDataUrl(file);
      const asset: CompanyDocumentAsset = {
        id: `${kind}-${Date.now()}-${file.name}`,
        kind,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        previewData,
        uploadedAt: new Date().toISOString(),
      };
      return asset;
    });
    try {
      const assets = await Promise.all(promises);
      updateDraft({ documents: [...draft.documents, ...assets] });
      setStepError(null);
    } catch (error: any) {
      setStepError(error.message ?? "Failed to upload document");
    }
  };

  const handleRemoveDocument = (id: string) => {
    updateDraft({ documents: draft.documents.filter((doc) => doc.id !== id) });
  };

  const validateStepOne = () => {
    if (!draft.legalName.trim()) {
      setStepError("Legal name is required.");
      return false;
    }
    if (!draft.taxId.trim()) {
      setStepError("Tax ID is required.");
      return false;
    }
    if (!draft.billingAddress.trim()) {
      setStepError("Billing address is required.");
      return false;
    }
    if (!draft.country.trim()) {
      setStepError("Country is required.");
      return false;
    }
    if (!draft.billingContact.name.trim() || !draft.billingContact.email.trim()) {
      setStepError("Billing contact name and email are required.");
      return false;
    }
    if (!draft.billingContact.email.includes("@")) {
      setStepError("Enter a valid billing contact email.");
      return false;
    }
    const hasTaxIdDoc = draft.documents.some((doc) => doc.kind === "tax_id");
    const hasRepIdDoc = draft.documents.some((doc) => doc.kind === "representative_id");
    if (!hasTaxIdDoc || !hasRepIdDoc) {
      setStepError("Please upload the Tax ID and representative ID documents.");
      return false;
    }
    setStepError(null);
    return true;
  };

  const validateStepTwo = () => {
    if (!draft.paymentTerms?.type) {
      setStepError("Select payment terms to continue.");
      return false;
    }
    if (draft.paymentTerms.iban) {
      const iban = draft.paymentTerms.iban.replace(/\s+/g, "").toUpperCase();
      const countryCode = (draft.country ?? "").trim().toUpperCase();
      if (countryCode && !iban.startsWith(countryCode)) {
        setStepError("IBAN must match the selected country.");
        return false;
      }
      if (iban.length < 12) {
        setStepError("Enter a valid IBAN.");
        return false;
      }
    }
    setStepError(null);
    return true;
  };

  const validateStepThree = () => {
    if (!draft.contractAccepted) {
      setStepError("Accept the terms to continue.");
      return false;
    }
    if (!draft.signature?.imageData) {
      setStepError("Signature required.");
      return false;
    }
    setStepError(null);
    return true;
  };

  const handleNext = async () => {
    if (draft.step === 1 && validateStepOne()) {
      handleFieldChange("step", 2);
    } else if (draft.step === 2 && validateStepTwo()) {
      handleFieldChange("step", 3);
    } else if (draft.step === 3) {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (draft.step === 1) return;
    handleFieldChange("step", (draft.step - 1) as CompanyOnboardingDraft["step"]);
  };

  const handleSignatureChange = (imageData: string | null) => {
    if (!imageData) {
      updateDraft({ signature: undefined });
      return;
    }
    const now = new Date().toISOString();
    const payload: SignaturePayload = {
      signedAt: now,
      imageData,
      ip: window.location.hostname || "127.0.0.1",
      userAgent: window.navigator.userAgent,
      signerName: draft.billingContact.name,
      signerEmail: draft.billingContact.email,
    };
    updateDraft({ signature: payload });
    setStepError(null);
  };

  const handleSubmit = () => {
    if (!validateStepThree() || !draft.paymentTerms) return;
    setSubmitting(true);
    const now = new Date().toISOString();
    const profile: CompanyProfile = {
      id: company?.id ?? `c-${Date.now()}`,
      legalName: draft.legalName,
      taxId: draft.taxId,
      billingAddress: draft.billingAddress,
      country: draft.country,
      billingContact: draft.billingContact,
      documents: draft.documents,
      paymentTerms: draft.paymentTerms,
      verificationStatus: "pending",
      contract: {
        version: "v1.2",
        signedAt: now,
        provider: "demo",
        signatureId: `sig_${Date.now()}`,
        signature: draft.signature,
        pdfUrl: draft.signature?.imageData ?? undefined,
      },
      creditLimit: draft.paymentTerms.creditLimit,
      creditUsed: 0,
    };
    completeOnboarding(profile);
    setSubmitting(false);
    resetDraft();
    setToast("Company submitted for verification. Auto-approving in demo mode…");
    window.setTimeout(() => {
      updateCompany((current) => {
        if (!current) return current;
        return { ...current, verificationStatus: "approved" };
      });
      setToast("Company approved. You can now access the catalog.");
      window.setTimeout(() => setToast(null), 4000);
    }, 10000);
  };

  const status = company?.verificationStatus ?? "pending";

  return (
    <div className="onboarding">
      <header className="onboarding__header">
        <h1>Company onboarding</h1>
        <p className="onboarding__subtitle">Register your business to enable net payment terms and corporate rentals.</p>
        <div className={`onboarding__status onboarding__status--${status}`} aria-live="polite">
          Status: {status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending validation"}
        </div>
        <p className="onboarding__helper">Upload the required corporate documents, configure payment terms, and sign the master contract.</p>
      </header>
      <ol className="onboarding__steps" aria-label="Onboarding steps">
        {["Company details", "Payment terms", "Master contract"].map((label, index) => {
          const stepNumber = (index + 1) as CompanyOnboardingDraft["step"];
          const active = draft.step === stepNumber;
          const completed = draft.step > stepNumber;
          return (
            <li key={label} className={`onboarding__step${active ? " is-active" : ""}${completed ? " is-complete" : ""}`}>
              <span className="onboarding__step-index">{stepNumber}</span>
              <span className="onboarding__step-label">{label}</span>
            </li>
          );
        })}
      </ol>
      {stepError ? (
        <div className="onboarding__error" role="alert">
          {stepError}
        </div>
      ) : null}
      {toast ? (
        <div className="onboarding__toast" role="status">
          {toast}
        </div>
      ) : null}
      {draft.step === 1 ? (
        <section className="onboarding__card" aria-labelledby="company-step">
          <h2 id="company-step">Step 1 — Company data &amp; documents</h2>
          <div className="form-grid">
            <label>
              Legal name*
              <input type="text" value={draft.legalName} onChange={(event) => handleFieldChange("legalName", event.target.value)} autoComplete="organization" />
            </label>
            <label>
              Tax ID (VAT/CIF/NIF)*
              <input type="text" value={draft.taxId} onChange={(event) => handleFieldChange("taxId", event.target.value.toUpperCase())} />
            </label>
            <label>
              Billing address*
              <input type="text" value={draft.billingAddress} onChange={(event) => handleFieldChange("billingAddress", event.target.value)} autoComplete="street-address" />
            </label>
            <label>
              Country*
              <select value={draft.country} onChange={(event) => handleFieldChange("country", event.target.value)}>
                <option value="">Select country</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Billing contact name*
              <input type="text" value={draft.billingContact.name} onChange={(event) => handleContactChange("name", event.target.value)} autoComplete="name" />
            </label>
            <label>
              Billing contact email*
              <input type="email" value={draft.billingContact.email} onChange={(event) => handleContactChange("email", event.target.value)} autoComplete="email" />
            </label>
            <label>
              Billing contact phone
              <input type="tel" value={draft.billingContact.phone} onChange={(event) => handleContactChange("phone", event.target.value)} autoComplete="tel" />
            </label>
          </div>
          <div className="onboarding__documents">
            <h3>Required documents</h3>
            <p className="onboarding__documents-helper">Upload PDF or JPG files up to 10MB each. Preview is generated instantly.</p>
            {DOCUMENT_CONFIG.map((doc) => (
              <div key={doc.kind} className="onboarding__doc-upload">
                <label className="onboarding__doc-label">
                  {doc.label}
                  {doc.required ? <span className="onboarding__doc-required">Required</span> : null}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={(event) => handleDocumentUpload(doc.kind, event.target.files)}
                  />
                </label>
                <ul className="onboarding__doc-list">
                  {draft.documents
                    .filter((item) => item.kind === doc.kind)
                    .map((item) => (
                      <li key={item.id}>
                        <div>
                          <strong>{item.fileName}</strong>
                          <span>{formatFileSize(item.fileSize)}</span>
                        </div>
                        <div className="onboarding__doc-actions">
                          {item.mimeType.startsWith("image/") && item.previewData ? (
                            <img src={item.previewData} alt={item.fileName} />
                          ) : (
                            <span className="onboarding__doc-placeholder">PDF</span>
                          )}
                          <button type="button" onClick={() => handleRemoveDocument(item.id)}>
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {draft.step === 2 ? (
        <section className="onboarding__card" aria-labelledby="payment-step">
          <h2 id="payment-step">Step 2 — Payment terms</h2>
          <p className="onboarding__hint">Choose the payment cadence and optional direct debit details.</p>
          <fieldset className="payment-options">
            <legend>Payment terms*</legend>
            {["NET30", "NET60"].map((option) => (
              <label key={option} className="payment-options__item">
                <input
                  type="radio"
                  name="payment-terms"
                  value={option}
                  checked={draft.paymentTerms?.type === option}
                  onChange={(event) => handlePaymentTermsChange({ type: event.target.value as NetPaymentTerm })}
                />
                <span>{option === "NET30" ? "Net 30" : "Net 60"}</span>
              </label>
            ))}
          </fieldset>
          <div className="form-grid">
            <label>
              IBAN (optional)
              <input
                type="text"
                placeholder="ES12 3456 7890 1234"
                value={draft.paymentTerms?.iban ?? ""}
                onChange={(event) => handlePaymentTermsChange({ iban: event.target.value })}
              />
              <span className="field-hint">Country must match IBAN prefix.</span>
            </label>
            <label>
              Default purchase order/PO
              <input
                type="text"
                placeholder="e.g. PO-2024-001"
                value={draft.paymentTerms?.defaultPurchaseOrder ?? ""}
                onChange={(event) => handlePaymentTermsChange({ defaultPurchaseOrder: event.target.value })}
              />
            </label>
            <label>
              Credit limit (admin)
              <input type="number" value={draft.paymentTerms?.creditLimit ?? ""} onChange={(event) => handlePaymentTermsChange({ creditLimit: Number(event.target.value || 0) })} />
              <span className="field-hint">SwiftRide team can adjust this after review.</span>
            </label>
          </div>
          <p className="onboarding__note">Legal note: payment terms start from the invoice date.</p>
        </section>
      ) : null}
      {draft.step === 3 ? (
        <section className="onboarding__card" aria-labelledby="contract-step">
          <h2 id="contract-step">Step 3 — Master contract</h2>
          <article className="contract">
            <header>
              <h3>SwiftRide Fleet Services — Master Service Agreement</h3>
              <p>Version v1.2 · Updated January 2025</p>
            </header>
            <p>
              This contract governs corporate rentals, including liability clauses, insurance coverage, and data processing addendum.
              Please review the summary below or download the full PDF.
            </p>
            <ul>
              <li>Vehicles available across premium destinations with guaranteed availability windows.</li>
              <li>Payment terms align with the selected net period (30/60 days) from invoice issue.</li>
              <li>Cancellations allowed up to 48h before pick-up with no penalty.</li>
              <li>Damage waivers, insurance, and mileage policies follow the catalog card information.</li>
            </ul>
            <button type="button" className="contract__download" onClick={() => downloadContract()}>
              Download full contract (PDF)
            </button>
          </article>
          <SignaturePad
            value={draft.signature?.imageData}
            onChange={handleSignatureChange}
            label="Digital signature of representative*"
            helperText="In production, the signature is captured via DocuSign/Adobe Sign/Dropbox Sign."
          />
          <label className="onboarding__checkbox">
            <input type="checkbox" checked={draft.contractAccepted} onChange={(event) => handleFieldChange("contractAccepted", event.target.checked)} />
            <span>I accept the terms of the master contract.</span>
          </label>
        </section>
      ) : null}
      <footer className="onboarding__footer">
        <button type="button" className="link-button" onClick={handleBack} disabled={draft.step === 1 || submitting}>
          Back
        </button>
        <div className="onboarding__footer-actions">
          <button type="button" className="link-button" onClick={resetDraft} disabled={submitting}>
            Reset form
          </button>
          <button type="button" className="primary-button" onClick={handleNext} disabled={submitting}>
            {draft.step < 3 ? "Continue" : submitting ? "Signing…" : "Sign and activate account"}
          </button>
        </div>
      </footer>
    </div>
  );
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

function downloadContract() {
  const blob = new Blob([
    "SwiftRide Fleet Services — Master Service Agreement\nVersion: v1.2\nDemo contract excerpt."
  ], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "swiftride-master-contract.pdf";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
