import AppShell from "@/components/AppShell";
import { Link, useSearchParams } from "react-router-dom";
import { listTenders } from "@/services/procurementService";
import { apiRequest } from "@/services/apiClient";
import { useEffect, useState } from "react";
import { Search, ArrowRight, FileText, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

function EvaluationCard({ tender }) {
  const { t } = useLanguage();
  return (
    <div className="evaluation-card">
      <div className="evaluation-card-top">
        <div className="evaluation-icon">
          <FileText size={20} />
        </div>
        <span className="status-pill">
          {tender.status || t("tenders.notProcessed")}
        </span>
      </div>
      
      <h3>{tender.name || tender.title}</h3>
      <div className="evaluation-id">{tender.tenderRef || tender.referenceNumber}</div>
      
      <div className="evaluation-meta">
        <span>{tender.department}</span>
        <span>
          {t("tenders.deadline")} {tender.submissionDeadline 
            ? new Date(tender.submissionDeadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) 
            : t("tenders.na")}
        </span>
      </div>
      
      <div className="evaluation-divider" />
      
      <div className="evaluation-numbers">
        <div>
          <b>{tender.totalBids ?? "—"}</b>
          <span>{t("tenders.vendors")}</span>
        </div>
        <div>
          <b>{tender.requirementCount ?? "—"}</b>
          <span>{t("tenders.requirements")}</span>
        </div>
        <div>
          <b>{tender.compliancePercentage != null ? `${tender.compliancePercentage}%` : "—"}</b>
          <span>{t("tenders.compliant")}</span>
        </div>
      </div>
      
      <div className="evaluation-progress">
        <span style={{ width: `${tender.compliancePercentage || 0}%` }} />
      </div>
      
      <div className="evaluation-card-footer">
        <span>{tender.updatedAt ? new Date(tender.updatedAt).toLocaleDateString() : t("tenders.notProcessed")}</span>
        <Link to={`/tenders/${tender.id}`}>
          {t("tenders.openEvaluation")} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export default function TendersPage() {
  const { t } = useLanguage();
  const [tenders, setTenders] = useState([]);
  const [tenderVendorNames, setTenderVendorNames] = useState({});
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  useEffect(() => { listTenders().then(data => setTenders(Array.isArray(data) ? data : data?.items || [])).catch(() => setTenders([])); }, []);

  // Keep the box in sync if someone lands here with ?q= from the header search.
  useEffect(() => { setQuery(searchParams.get("q") || ""); }, [searchParams]);

  // Tender records don't carry vendor names directly, so fetch each
  // tender's bidding vendors once the list loads (enables "search by
  // vendor name", not just tender title/reference).
  useEffect(() => {
    if (!tenders.length) return undefined;
    let cancelled = false;
    Promise.all(
      tenders.map(tender =>
        apiRequest(`/tenders/${tender.id}/vendors`)
          .then(list => [tender.id, (Array.isArray(list) ? list : []).map(v => v.legalName || v.name).filter(Boolean)])
          .catch(() => [tender.id, []])
      )
    ).then(entries => { if (!cancelled) setTenderVendorNames(Object.fromEntries(entries)); });
    return () => { cancelled = true; };
  }, [tenders]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTenders = normalizedQuery
    ? tenders.filter(tender => {
      const vendorNames = tenderVendorNames[tender.id] || [];
      return [tender.name, tender.title, tender.tenderRef, tender.referenceNumber, tender.department, tender.id, ...vendorNames]
        .filter(Boolean)
        .some(value => value.toString().toLowerCase().includes(normalizedQuery));
    })
    : tenders;

  const handleQueryChange = value => {
    setQuery(value);
    if (value.trim()) setSearchParams({ q: value.trim() }); else setSearchParams({});
  };

  return <AppShell>
    <main className="evaluations-page">
      <section className="evaluation-page-head"><div><div className="section-kicker"><span className="eyebrow-line" /> {t("tenders.kicker")}</div><h1>{t("tenders.title")}</h1><p>{t("tenders.subtitle")}</p></div></section>
      <section className="evaluation-summary"><div className="summary-lead"><span className="summary-emblem"><FileText size={18} /></span><div><b>{filteredTenders.length}</b><span>{normalizedQuery ? t("tenders.matchingEvaluations") : t("tenders.totalEvaluations")}</span></div></div><div className="summary-action"><span>{t("tenders.dataSource")}</span><b>{t("tenders.dataSourceValue")}</b></div></section>
      <section className="evaluation-toolbar"><div className="evaluation-search"><Search size={17} /><input placeholder={t("tenders.searchPlaceholder")} value={query} onChange={event => handleQueryChange(event.target.value)} /></div><button className="filter-button"><SlidersHorizontal size={15} /> {t("tenders.filters")} <ChevronDown size={14} /></button><button className="sort-button">{t("tenders.recentlyUpdated")} <ChevronDown size={14} /></button></section>
      <div className="evaluation-list-heading"><div><div className="section-kicker">{t("tenders.allWorkspaces")}</div><h2>{t("tenders.activeEvaluations")} <span>{filteredTenders.length}</span></h2></div><span className="list-note">{t("tenders.listNote")}</span></div>
      {filteredTenders.length ? <section className="evaluation-grid">{filteredTenders.map(tender => <EvaluationCard key={tender.id} tender={tender} />)}</section> : <section className="evaluation-table-card"><div className="empty-state"><FileText size={22} /><h3>{normalizedQuery ? `${t("tenders.noMatchPrefix")} "${query.trim()}"` : t("tenders.emptyTitle")}</h3><p>{normalizedQuery ? t("tenders.emptySearchHint") : t("tenders.emptyHint")}</p></div></section>}
    </main>
  </AppShell>;
}
