import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Building2, Search, ArrowRight, UsersRound } from "lucide-react";
import { listVendors } from "@/services/procurementService";
import { useLanguage } from "../context/LanguageContext";

export default function VendorsPage() {
  const { t } = useLanguage();
  const [vendors, setVendors] = useState([]);
  const [query, setQuery] = useState("");
  useEffect(() => { listVendors().then(data => setVendors(Array.isArray(data) ? data : data?.items || [])).catch(() => setVendors([])); }, []);
  const filtered = vendors.filter(vendor => `${vendor.name} ${vendor.vendorId}`.toLowerCase().includes(query.toLowerCase()));
  return <AppShell><div className="page-bar"><div><div className="page-title">{t("vendorsPage.title")}</div><div className="breadcrumb"><Link to="/">{t("vendorsPage.home")}</Link><span className="breadcrumb-sep">/</span><span>{t("vendorsPage.title")}</span></div></div></div><div className="page-content">
    <div className="card" style={{ marginBottom: 18 }}><div className="card-header"><div><div className="card-header-title">{t("vendorsPage.directoryTitle")}</div><div style={{ marginTop: 4, color: "var(--text-secondary)", fontSize: 12 }}>{t("vendorsPage.directoryDesc")}</div></div><div className="evaluation-search"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t("vendorsPage.searchPlaceholder")} /></div></div></div>
    {filtered.length ? <div className="evaluation-grid">{filtered.map(vendor => <Link to={`/vendors/${vendor.id}`} key={vendor.id} className="evaluation-card" style={{ textDecoration: "none" }}><div className="evaluation-card-top"><div className="evaluation-icon"><Building2 size={20} /></div><span className="status-pill">{vendor.status || t("vendorsPage.activeFallback")}</span></div><h3>{vendor.name}</h3><div className="evaluation-id">{vendor.vendorId}</div><div className="evaluation-meta"><span>{vendor.awardedContractsCount ?? "—"} {t("vendorsPage.awardedContracts")}</span></div><div className="evaluation-card-footer"><span>{t("vendorsPage.profileLabel")}</span><span>{t("vendorsPage.viewProfile")} <ArrowRight size={14} /></span></div></Link>)}</div> : <div className="card"><div className="empty-state"><UsersRound size={22} /><h3>{t("vendorsPage.emptyTitle")}</h3><p>{t("vendorsPage.emptyDesc")}</p></div></div>}
  </div></AppShell>;
}
