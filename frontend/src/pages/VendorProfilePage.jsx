import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { ArrowRight, Building2, FileText } from "lucide-react";
import { getVendor } from "@/services/procurementService";
import { useLanguage } from "../context/LanguageContext";

export default function VendorProfilePage() {
  const { t } = useLanguage();
  const { id } = useParams(); const [vendor, setVendor] = useState(null); const [loaded, setLoaded] = useState(false);
  useEffect(() => { getVendor(id).then(setVendor).catch(() => setVendor(null)).finally(() => setLoaded(true)); }, [id]);
  if (!loaded) return <AppShell><div className="page-content"><div className="card"><div className="empty-state"><h3>{t("vendorProfile.loadingTitle")}</h3><p>{t("vendorProfile.loadingDesc")}</p></div></div></div></AppShell>;
  if (!vendor) return <AppShell><div className="page-content"><div className="card"><div className="empty-state"><h3>{t("vendorProfile.unavailableTitle")}</h3><p>{t("vendorProfile.unavailableDesc")}</p><Link to="/vendors" className="btn btn-primary">{t("vendorProfile.backToVendors")}</Link></div></div></div></AppShell>;
  const contracts = vendor.awardedContracts || [];
  return <AppShell><div className="page-bar"><div><div className="page-title">{vendor.name}</div><div className="breadcrumb"><Link to="/vendors">{t("vendorProfile.vendorsCrumb")}</Link><span className="breadcrumb-sep">/</span><span>{vendor.vendorId}</span></div></div></div><div className="page-content">
    <section className="card" style={{ marginBottom: 18 }}><div className="card-body"><div style={{ display: "flex", alignItems: "center", gap: 14 }}><div className="featured-icon"><Building2 size={22} /></div><div><h2 style={{ margin: 0, color: "var(--text-heading)" }}>{vendor.name}</h2><p style={{ margin: "5px 0 0", color: "var(--text-secondary)" }}>{t("vendorProfile.vendorIdLabel")} {vendor.vendorId} · {t("vendorProfile.statusLabel")} {vendor.status || t("vendorProfile.activeFallback")}</p></div></div></div></section>
    <section className="card"><div className="card-header"><div className="card-header-title">{t("vendorProfile.awardedContracts")} <span className="chip">{contracts.length}</span></div></div>{contracts.length ? <div className="card-body" style={{ display: "grid", gap: 12 }}>{contracts.map(contract => <Link key={contract.id} to={`/contracts/${contract.id}`} className="featured-service" style={{ margin: 0, textDecoration: "none" }}><span className="featured-icon"><FileText size={20} /></span><span><b>{contract.tenderName}</b><small>{contract.tenderReference} · {t("vendorProfile.awardedWord")} {contract.awardedAt || "—"} · {contract.department || t("vendorProfile.noDepartment")}</small></span><span className="featured-cta">{t("vendorProfile.viewContract")} <ArrowRight size={15} /></span></Link>)}</div> : <div className="empty-state"><FileText size={22} /><h3>{t("vendorProfile.emptyTitle")}</h3><p>{t("vendorProfile.emptyDesc")}</p></div>}</section>
  </div></AppShell>;
}
