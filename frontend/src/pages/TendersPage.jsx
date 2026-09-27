import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Database, FileText, Search, SlidersHorizontal, Users, ChevronDown } from "lucide-react";
import AppShell from "@/components/AppShell";
import { listTenders } from "@/services/procurementService";
import { apiRequest } from "@/services/apiClient";
import { useLanguage } from "../context/LanguageContext";
import "./TendersPage.css";

const dateLabel = value => value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "Schedule to be announced";
const statusLabel = status => String(status || "Published").replaceAll("_", " ");

function EvaluationCard({ tender }) {
  const { t } = useLanguage();
  return <article className="officer-eval-card"><div className="officer-eval-card-top"><span className="officer-eval-reference">{tender.tenderRef || tender.referenceNumber || "Reference unavailable"}</span><span className="officer-eval-status">{statusLabel(tender.status)}</span></div><h3>{tender.name || tender.title || "Untitled tender"}</h3><p className="officer-eval-department">{tender.department || "Department unavailable"}</p><div className="officer-eval-facts"><span><CalendarDays size={14} /> {dateLabel(tender.submissionDeadline)}</span><span><Users size={14} /> {tender.totalBids ?? "—"} {t("tenders.vendors")}</span><span><FileText size={14} /> {tender.requirementCount ?? "—"} {t("tenders.requirements")}</span></div><div className="officer-eval-card-footer"><div><span>Compliance</span><strong>{tender.compliancePercentage != null ? `${tender.compliancePercentage}%` : "Not evaluated"}</strong></div><Link to={`/tenders/${tender.id}`}>Open evaluation <ArrowUpRight size={14} /></Link></div></article>;
}

export default function TendersPage() {
  const { t } = useLanguage();
  const [tenders, setTenders] = useState([]); const [vendorNames, setVendorNames] = useState({}); const [searchParams, setSearchParams] = useSearchParams(); const [query, setQuery] = useState(searchParams.get("q") || "");
  useEffect(() => { listTenders().then(data => setTenders(Array.isArray(data) ? data : data?.items || [])).catch(() => setTenders([])); }, []);
  useEffect(() => { setQuery(searchParams.get("q") || ""); }, [searchParams]);
  useEffect(() => { if (!tenders.length) return undefined; let cancelled = false; Promise.all(tenders.map(tender => apiRequest(`/tenders/${tender.id}/vendors`).then(list => [tender.id, (Array.isArray(list) ? list : []).map(v => v.legalName || v.name).filter(Boolean)]).catch(() => [tender.id, []]))).then(entries => { if (!cancelled) setVendorNames(Object.fromEntries(entries)); }); return () => { cancelled = true; }; }, [tenders]);
  const filtered = useMemo(() => { const value = query.trim().toLowerCase(); return tenders.filter(tender => !value || [tender.name, tender.title, tender.tenderRef, tender.referenceNumber, tender.department, ...(vendorNames[tender.id] || [])].filter(Boolean).some(item => String(item).toLowerCase().includes(value))); }, [query, tenders, vendorNames]);
  const setSearch = value => { setQuery(value); setSearchParams(value.trim() ? { q: value.trim() } : {}); };
  const submittedBidCount = filtered.reduce((total, tender) => total + (Number(tender.totalBids) || 0), 0);
  return <AppShell><main className="officer-evaluations"><section className="officer-eval-intro"><div><span className="officer-eyebrow">Procurement workspace</span><h1>Evaluations</h1></div></section><section className="officer-queue-overview"><div className="officer-queue-copy"><span className="officer-eyebrow">Evaluation queue</span><h2>Ready for structured review</h2><p>Open a workspace to assess tender conditions, vendor submissions, and supporting evidence.</p></div><div className="officer-queue-stat"><strong>{filtered.length}</strong><span>Active workspaces</span></div><div className="officer-queue-stat"><strong>{submittedBidCount}</strong><span>Submitted bids</span></div><div className="officer-queue-source"><Database size={17} /><div><strong>Central procurement database</strong><span>Live records</span></div></div></section><section className="officer-eval-surface"><div className="officer-eval-toolbar"><label><Search size={17} /><input aria-label="Search evaluations" placeholder={t("tenders.searchPlaceholder")} value={query} onChange={event => setSearch(event.target.value)} /></label><button><SlidersHorizontal size={15} /> {t("tenders.filters")} <ChevronDown size={14} /></button><button>{t("tenders.recentlyUpdated")} <ChevronDown size={14} /></button></div><div className="officer-eval-section-head"><div><span className="officer-eyebrow">Evaluation queue</span><h2>Active evaluations <b>{filtered.length}</b></h2></div><p>Open a workspace to review tender requirements and submitted bid packages.</p></div>{filtered.length ? <div className="officer-eval-grid">{filtered.map(tender => <EvaluationCard key={tender.id} tender={tender} />)}</div> : <div className="officer-eval-empty"><FileText size={23} /><strong>{query.trim() ? `${t("tenders.noMatchPrefix")} “${query.trim()}”` : t("tenders.emptyTitle")}</strong><p>{query.trim() ? t("tenders.emptySearchHint") : t("tenders.emptyHint")}</p></div>}</section></main></AppShell>;
}
