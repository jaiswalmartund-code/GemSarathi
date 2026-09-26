import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { getContract } from "@/services/procurementService";
import { useLanguage } from "../context/LanguageContext";

export default function ContractDetailsPage() {
  const { t } = useLanguage();
  const { id } = useParams(); const [contract, setContract] = useState(null); const [loaded, setLoaded] = useState(false);
  useEffect(() => { getContract(id).then(setContract).catch(() => setContract(null)).finally(() => setLoaded(true)); }, [id]);
  if (!loaded) return <AppShell><div className="page-content"><div className="card"><div className="empty-state"><h3>{t("contract.loadingTitle")}</h3></div></div></div></AppShell>;
  if (!contract) return <AppShell><div className="page-content"><div className="card"><div className="empty-state"><h3>{t("contract.unavailableTitle")}</h3><p>{t("contract.unavailableDesc")}</p><Link to="/vendors" className="btn btn-primary">{t("contract.backToVendors")}</Link></div></div></div></AppShell>;
  return <AppShell><main className="page-content" style={{ maxWidth: 900 }}><Link to={`/vendors/${contract.vendorId}`} className="evaluation-back"><ArrowLeft size={15} /> {t("contract.backToVendor")}</Link><section className="card" style={{ marginTop: 16 }}><div className="card-header"><div><div className="section-kicker">{t("contract.kicker")}</div><div className="card-header-title">{contract.tenderName}</div></div><span className="status-pill done">{contract.status || t("contract.activeFallback")}</span></div><div className="card-body"><div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18, marginBottom: 22 }}>{[[t("contract.fieldTenderRef"), contract.tenderReference], [t("contract.fieldVendor"), contract.vendorName], [t("contract.fieldAwardDate"), contract.awardedAt], [t("contract.fieldDepartment"), contract.department]].map(([label, value]) => <div key={label}><div className="field-label">{label}</div><strong>{value || "—"}</strong></div>)}</div><div className="divider" /><h3 style={{ margin: "20px 0 12px" }}>{t("contract.associatedDocs")}</h3>{contract.documents?.length ? <div style={{ display: "grid", gap: 8 }}>{contract.documents.map(document => <a href={document.url} key={document.id || document.name} className="featured-service" style={{ margin: 0, textDecoration: "none" }}><span className="featured-icon"><FileText size={18} /></span><span><b>{document.name}</b><small>{document.type || t("contract.officialDocFallback")}</small></span><ExternalLink size={15} /></a>)}</div> : <div className="empty-state"><FileText size={22} /><p>{t("contract.noDocs")}</p></div>}</div></section></main></AppShell>;
}
