import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Award, CheckCircle2, ClipboardList, Clock3, FileText, Search, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiRequest } from "../services/apiClient";

const dateLabel = value => value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
const rawStatus = bid => String(bid.status || bid.submissionStatus || bid.reviewStatus || "DRAFT").toUpperCase();
const category = bid => { const value = rawStatus(bid); if (["APPROVED", "AWARDED", "ACCEPTED", "WON"].includes(value)) return "approved"; if (["REJECTED", "DECLINED", "NOT_SELECTED"].includes(value)) return "rejected"; return "active"; };
const statusLabel = bid => { const value = rawStatus(bid); if (category(bid) === "approved") return value === "AWARDED" || value === "WON" ? "Awarded" : "Approved"; if (category(bid) === "rejected") return "Rejected"; if (["UNDER_EVALUATION", "UNDER_REVIEW"].includes(value)) return "Under Review"; if (value === "SUBMITTED") return "Submitted"; return "Draft"; };
const title = bid => bid.tenderTitle || bid.title || bid.tenderName || "Procurement submission";
const reference = bid => bid.tenderReference || bid.tenderNumber || bid.tenderRef || bid.bidReference || "Reference pending";

function BidCard({ bid, type, onOpen }) {
  const status = statusLabel(bid);
  return <article className={`vp-bid-card vp-bid-card-${type}`}><div className="vp-bid-card-top"><span className="vp-bid-reference">{reference(bid)}</span><span className={`vp-status vp-status-${type}`}>{status}</span></div><h3>{title(bid)}</h3><div className="vp-bid-card-meta"><span><FileText size={14} /> {bid.bidReference || "Submission reference pending"}</span><span><Clock3 size={14} /> {type === "active" ? `Updated ${dateLabel(bid.updatedAt || bid.createdAt)}` : `${type === "approved" ? "Decision" : "Reviewed"} ${dateLabel(bid.updatedAt || bid.reviewedAt || bid.createdAt)}`}</span></div><div className="vp-bid-card-footer"><span>{type === "approved" ? "Ready for award processing" : type === "rejected" ? "Review the outcome and tender feedback" : "Submission workspace"}</span><button onClick={() => onOpen(bid)}>{type === "active" ? "Continue bid" : "View submission"} <ArrowUpRight size={14} /></button></div></article>;
}

function BidSection({ icon: Icon, eyebrow, heading, description, bids, type, onOpen }) {
  return <section className={`vp-bid-section vp-bid-section-${type}`}><div className="vp-bid-section-heading"><div className="vp-bid-section-icon"><Icon size={19} /></div><div><span className="vp-eyebrow">{eyebrow}</span><h2>{heading}<b>{bids.length}</b></h2><p>{description}</p></div></div>{bids.length ? <div className="vp-bid-card-grid">{bids.map(bid => <BidCard key={bid.id || bid._id} bid={bid} type={type} onOpen={onOpen} />)}</div> : <div className="vp-bid-section-empty"><Icon size={21} /><div><strong>{type === "approved" ? "No approved bids yet" : type === "rejected" ? "No rejected bids" : "No active submissions"}</strong><p>{type === "active" ? "Start a bid from an open tender and it will appear here." : type === "approved" ? "Approved procurement outcomes will appear here." : "Rejected submissions will be shown here with their decision date."}</p></div></div>}</section>;
}

export default function VendorBidsPage() {
  const navigate = useNavigate();
  const [bids, setBids] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { apiRequest("/vendor/bids").then(value => setBids(Array.isArray(value) ? value : [])).catch(err => { setError(err.message || "Unable to load bids."); setBids([]); }); }, []);
  const groups = useMemo(() => { const filtered = (bids || []).filter(bid => !query.trim() || `${title(bid)} ${reference(bid)} ${bid.bidReference || ""}`.toLowerCase().includes(query.trim().toLowerCase())); return { active: filtered.filter(bid => category(bid) === "active"), approved: filtered.filter(bid => category(bid) === "approved"), rejected: filtered.filter(bid => category(bid) === "rejected") }; }, [bids, query]);
  const openBid = bid => navigate(category(bid) === "active" ? `/vendor/bids/${bid.id || bid._id}/submit` : (bid.tenderId || bid.tender_id ? `/vendor/tenders/${bid.tenderId || bid.tender_id}` : "/vendor/tenders"));
  return <AppShell><main className="vp-page vp-bids-page"><section className="vp-bids-intro"><div><span className="vp-eyebrow">Vendor procurement record</span><h1>My Bids</h1><p>One place to manage submissions, follow evaluation outcomes, and keep your procurement history organized.</p></div><div className="vp-bids-search"><Search size={17} /><input aria-label="Search my bids" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search bids or tender references" /></div></section>{bids !== null && !error && <div className="vp-bids-overview"><div><span>Active submissions</span><strong>{groups.active.length}</strong><small>Drafts and under review</small></div><div><span>Approved outcomes</span><strong>{groups.approved.length}</strong><small>Ready for next steps</small></div><div><span>Rejected outcomes</span><strong>{groups.rejected.length}</strong><small>Available for review</small></div></div>}{bids === null ? <div className="vp-skeleton vp-skeleton-table" /> : error ? <div className="vp-empty"><FileText size={22} /><strong>Unable to load bids</strong><p>{error}</p></div> : <div className="vp-bid-sections"><BidSection icon={ClipboardList} eyebrow="In progress" heading="Active bids" description="Draft and submitted bids that still need your attention." bids={groups.active} type="active" onOpen={openBid} /><BidSection icon={CheckCircle2} eyebrow="Successful outcomes" heading="Approved bids" description="Bids that have been approved or awarded by the procurement team." bids={groups.approved} type="approved" onOpen={openBid} /><BidSection icon={XCircle} eyebrow="Past outcomes" heading="Rejected bids" description="Keep a clear record of bids that were not selected." bids={groups.rejected} type="rejected" onOpen={openBid} /><button className="vp-bids-browse" onClick={() => navigate("/vendor/tenders")}><Award size={17} /> Browse more open tenders <ArrowUpRight size={15} /></button></div>}</main></AppShell>;
}
