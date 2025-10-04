import { useState } from "react";
import { useAppStore } from "../state/useAppStore";
import type { CompanyDocumentAsset } from "../types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function CompanyScreen() {
  const company = useAppStore((state) => state.company);
  const updateCompany = useAppStore((state) => state.updateCompany);

  const [toast, setToast] = useState<string | null>(null);

  if (!company) {
    return (
      <section className="company">
        <div className="company__empty">
          <h2>No company profile yet</h2>
          <p>Complete the onboarding process to unlock corporate features.</p>
        </div>
      </section>
    );
  }

  const handleContactChange = (key: "name" | "email" | "phone", value: string) => {
    updateCompany((current) => {
      if (!current) return current;
      return { ...current, billingContact: { ...current.billingContact, [key]: value } };
    });
  };

  const handleUploadDocs = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const uploads = Array.from(fileList).map(async (file) => {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`${file.name} is larger than 10MB.`);
      }
      const previewData = await readFileAsDataUrl(file);
      const asset: CompanyDocumentAsset = {
        id: `extra-${Date.now()}-${file.name}`,
        kind: "other",
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        previewData,
        uploadedAt: new Date().toISOString(),
      };
      return asset;
    });
    try {
      const assets = await Promise.all(uploads);
      updateCompany((current) => {
        if (!current) return current;
        return { ...current, documents: [...current.documents, ...assets] };
      });
      setToast("Documents uploaded for review.");
      window.setTimeout(() => setToast(null), 4000);
    } catch (error: any) {
      setToast(error.message ?? "Failed to upload documents");
    }
  };

  const handleRequestTermChange = () => {
    setToast("Payment term change request sent to SwiftRide operations.");
    window.setTimeout(() => setToast(null), 4000);
  };

  return (
    <section className="company">
      <header className="company__header">
        <div>
          <h1>{company.legalName}</h1>
          <p>Tax ID: {company.taxId}</p>
        </div>
        <span className={`company__status company__status--${company.verificationStatus}`}>
          {company.verificationStatus === "approved"
            ? "Approved"
            : company.verificationStatus === "pending"
            ? "Pending verification"
            : company.verificationStatus === "rejected"
            ? `Rejected${company.verificationReason ? ` — ${company.verificationReason}` : ""}`
            : "Unstarted"}
        </span>
      </header>
      {toast ? (
        <div className="company__toast" role="status">
          {toast}
        </div>
      ) : null}
      <section className="company__card">
        <h2>Billing contact</h2>
        <div className="form-grid">
          <label>
            Name
            <input type="text" value={company.billingContact.name} onChange={(event) => handleContactChange("name", event.target.value)} />
          </label>
          <label>
            Email
            <input type="email" value={company.billingContact.email} onChange={(event) => handleContactChange("email", event.target.value)} />
          </label>
          <label>
            Phone
            <input type="tel" value={company.billingContact.phone} onChange={(event) => handleContactChange("phone", event.target.value)} />
          </label>
        </div>
      </section>
      <section className="company__card">
        <h2>Payment terms</h2>
        <dl className="company__details">
          <div>
            <dt>Payment term</dt>
            <dd>{company.paymentTerms.type === "NET30" ? "Net 30" : "Net 60"}</dd>
          </div>
          {company.paymentTerms.iban ? (
            <div>
              <dt>IBAN</dt>
              <dd>{company.paymentTerms.iban}</dd>
            </div>
          ) : null}
          {typeof company.paymentTerms.creditLimit === "number" ? (
            <div>
              <dt>Credit limit</dt>
              <dd>{formatCurrency(company.paymentTerms.creditLimit)}</dd>
            </div>
          ) : null}
          {typeof company.creditUsed === "number" ? (
            <div>
              <dt>Credit used</dt>
              <dd>
                {formatCurrency(company.creditUsed)} of {company.creditLimit ? formatCurrency(company.creditLimit) : "—"}
              </dd>
            </div>
          ) : null}
          {company.paymentTerms.defaultPurchaseOrder ? (
            <div>
              <dt>Default PO</dt>
              <dd>{company.paymentTerms.defaultPurchaseOrder}</dd>
            </div>
          ) : null}
        </dl>
        <button type="button" className="link-button" onClick={handleRequestTermChange}>
          Request payment term change
        </button>
      </section>
      <section className="company__card">
        <h2>Contract</h2>
        <p>Active version: {company.contract.version}</p>
        {company.contract.signedAt ? <p>Signed at: {formatDate(company.contract.signedAt)}</p> : null}
        <div className="company__actions">
          {company.contract.pdfUrl ? (
            <a className="primary-button" href={company.contract.pdfUrl} target="_blank" rel="noreferrer">
              Download contract
            </a>
          ) : null}
        </div>
      </section>
      <section className="company__card">
        <h2>Documents</h2>
        <p>Upload additional documentation if required by compliance.</p>
        <label className="company__upload">
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => handleUploadDocs(event.target.files)} />
          <span>Upload documents</span>
        </label>
        <ul className="company__documents">
          {company.documents.map((doc) => (
            <li key={doc.id}>
              <div>
                <strong>{doc.fileName}</strong>
                <span>{doc.kind}</span>
              </div>
              <span>{formatFileSize(doc.fileSize)}</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(value);
}
