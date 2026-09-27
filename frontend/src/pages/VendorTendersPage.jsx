import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Building2, CalendarDays, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiRequest } from "../services/apiClient";

const ref = tender => tender.referenceNumber || tender.tenderNumber || tender.tenderRef || "Reference unavailable";
const deadline = tender => tender.submissionDeadline || tender.submission_deadline || tender.deadline;
const formatDate = value => value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "Schedule to be announced";

function TenderCard({ tender }) {
  const navigate = useNavigate();
  return <article className="vp-open-tender-card"><div className="vp-open-tender-copy"><span className="vp-ref">{ref(tender)}</span><h2>{tender.title || tender.name || "Untitled tender"}</h2><p><Building2 size={15} /> {tender.organization || tender.department || "Organization unavailable"}</p></div><div className="vp-open-tender-meta"><div><span>Submission deadline</span><strong><CalendarDays size={14} /> {formatDate(deadline(tender))}</strong></div><div><span>Requirements</span><strong>{tender.requirements?.length ?? tender.requirementCount ?? 0} items</strong></div></div><div className="vp-open-tender-actions"><button className="vp-link-button" onClick={() => navigate(`/vendor/tenders/${tender.id || tender._id}`)}>View details <ArrowUpRight size={14} /></button></div></article>;
}

export default function VendorTendersPage() {
  const [tenders, setTenders] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { apiRequest("/vendor/tenders").then(value => setTenders(Array.isArray(value) ? value : [])).catch(err => { setError(err.message || "Unable to load open tenders."); setTenders([]); }); }, []);
  const filtered = useMemo(() => { const value = query.trim().toLowerCase(); return (tenders || []).filter(item => !value || [item.title, item.name, item.organization, item.department, ref(item)].join(" ").toLowerCase().includes(value)); }, [query, tenders]);
  return <AppShell><main className="vp-page vp-open-tenders-page"><section className="vp-page-title"><span className="vp-eyebrow">Procurement opportunities</span><h1>Open GeM Tenders</h1><p>Find active opportunities and start a compliant bid submission.</p></section><section className="vp-surface"><div className="vp-section-header"><div><span className="vp-eyebrow">Available now</span><h2>Browse active tenders</h2><p>{tenders?.length || 0} opportunities are available to your company.</p></div><label className="vp-search"><Search size={16} /><input aria-label="Search open tenders" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by title, department, or reference" /></label></div>{tenders === null ? <div className="vp-skeleton vp-skeleton-table" /> : error ? <div className="vp-empty"><strong>Unable to load open tenders</strong><p>{error}</p></div> : filtered.length ? <div className="vp-open-tender-list">{filtered.map(tender => <TenderCard key={tender.id || tender._id} tender={tender} />)}</div> : <div className="vp-empty"><Search size={22} /><strong>{query ? "No matching tenders" : "No open tenders"}</strong><p>{query ? "Try a different search term." : "There are no active procurement opportunities at the moment."}</p></div>}</section></main></AppShell>;
}
