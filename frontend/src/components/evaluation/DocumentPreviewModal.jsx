import { useEffect, useState } from "react";
import { AlertTriangle, Download, X } from "lucide-react";
import { fetchDocumentBlob } from "@/services/evaluationService";
import { useLanguage } from "../../context/LanguageContext";

export default function DocumentPreviewModal({ doc, onClose }) {
    const { t } = useLanguage();
    const [state, setState] = useState({ status: "idle", url: "", mimeType: "", message: "" });

    useEffect(() => {
        if (!doc) return undefined;
        let cancelled = false;
        let objectUrl = "";
        setState({ status: "loading", url: "", mimeType: "", message: "" });
        fetchDocumentBlob(doc.id)
            .then(blob => {
                if (cancelled) return;
                objectUrl = window.URL.createObjectURL(blob);
                setState({ status: "ready", url: objectUrl, mimeType: blob.type, message: "" });
            })
            .catch(err => {
                if (!cancelled) setState({ status: "error", url: "", mimeType: "", message: err.message || t("preview.loadError") });
            });
        return () => {
            cancelled = true;
            if (objectUrl) window.URL.revokeObjectURL(objectUrl);
        };
    }, [doc, t]);

    if (!doc) return null;

    const mimeType = state.mimeType || doc.mimeType || "";
    const isPdf = mimeType === "application/pdf" || /\.pdf$/i.test(doc.originalFilename || "");
    const isImage = mimeType.startsWith("image/");

    const handleDownload = () => {
        if (!state.url) return;
        const link = window.document.createElement("a");
        link.href = state.url;
        link.download = doc.originalFilename || "document";
        window.document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <div className="doc-preview-overlay" onClick={onClose}>
            <div className="doc-preview-modal" onClick={event => event.stopPropagation()}>
                <header className="doc-preview-header">
                    <div className="doc-preview-title">
                        <b>{doc.originalFilename || t("preview.fallbackTitle")}</b>
                        <small>{(doc.documentType || t("preview.fallbackType")).replace(/_/g, " ")}</small>
                    </div>
                    <div className="doc-preview-actions">
                        {state.status === "ready" && (
                            <button className="btn btn-ghost" onClick={handleDownload}>
                                <Download size={14} /> {t("preview.download")}
                            </button>
                        )}
                        <button className="doc-preview-close" onClick={onClose} aria-label={t("preview.closeLabel")}>
                            <X size={18} />
                        </button>
                    </div>
                </header>
                <div className="doc-preview-body">
                    {state.status === "loading" && <div className="doc-preview-status">{t("preview.loading")}</div>}
                    {state.status === "error" && (
                        <div className="doc-preview-status doc-preview-error">
                            <AlertTriangle size={16} /> {state.message}
                        </div>
                    )}
                    {state.status === "ready" && isPdf && <iframe title={doc.originalFilename || t("preview.previewLabel")} src={state.url} className="doc-preview-frame" />}
                    {state.status === "ready" && !isPdf && isImage && <img src={state.url} alt={doc.originalFilename || t("preview.previewLabel")} className="doc-preview-image" />}
                    {state.status === "ready" && !isPdf && !isImage && (
                        <div className="doc-preview-status">
                            {t("preview.noPreview")}
                            <button className="btn btn-ghost" onClick={handleDownload} style={{ marginLeft: 10 }}>
                                <Download size={14} /> {t("preview.downloadInstead")}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}