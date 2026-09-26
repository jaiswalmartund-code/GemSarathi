import { Eye, FileText, X } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function VendorDocumentsDrawer({ vendor, documents, onClose, onView }) {
  const { t } = useLanguage();
  if (!vendor) return null;
  return (
    <div className="drawer-overlay-new" onClick={onClose}>
      <aside className="evidence-drawer-new" onClick={event => event.stopPropagation()}>
        <header>
          <div>
            <div className="section-kicker">{t("vendorDocs.kicker")}</div>
            <h2>{vendor.name}</h2>
          </div>
          <button onClick={onClose} aria-label={t("vendorDocs.closeLabel")}>
            <X size={18} />
          </button>
        </header>

        <div className="drawer-flow-step">
          <label>{t("vendorDocs.bidReference")}</label>
          <p>{vendor.bid?.bidReference || t("vendorDocs.noBid")}</p>
        </div>

        <div className="drawer-flow-step">
          <label>{t("vendorDocs.documents")} ({documents.length})</label>
          {documents.length ? (
            <div className="vendor-doc-list">
              {documents.map(doc => (
                <div className="vendor-doc-row" key={doc.id}>
                  <div className="vendor-doc-info">
                    <b><FileText size={13} /> {doc.originalFilename || t("vendorDocs.fallbackTitle")}</b>
                    <small>
                      {(doc.documentType || t("vendorDocs.fallbackType")).replace(/_/g, " ")}
                      {formatSize(doc.fileSize) ? ` · ${formatSize(doc.fileSize)}` : ""}
                    </small>
                  </div>
                  <button className="btn btn-ghost" onClick={() => onView(doc)}>
                    <Eye size={13} /> {t("vendorDocs.view")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="drawer-missing">
              <FileText size={15} /> {t("vendorDocs.emptyMessage")}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}