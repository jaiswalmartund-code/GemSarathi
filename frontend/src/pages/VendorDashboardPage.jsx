import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Building2, CalendarDays, CheckCircle2, ChevronRight, FileCheck2, FileText, FolderOpen, Info, Search, ShieldCheck, X } from "lucide-react";
import AppShell from "../components/AppShell";
import { apiRequest } from "../services/apiClient";

const dateLabel = value => value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
const tenderRef = tender => tender?.referenceNumber || tender?.tenderNumber || tender?.tenderRef || "Reference unavailable";
const tenderDeadline = tender => tender?.submissionDeadline || tender?.submission_deadline || tender?.deadline;
const daysRemaining = value => { if (!value) return "Schedule to be announced"; const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000); return days > 0 ? `${days} days remaining` : days === 0 ? "Due today" : "Closed"; };
const bidStatus = bid => { const status = String(bid?.status || bid?.submissionStatus || "DRAFT").toUpperCase(); if (["UNDER_EVALUATION", "UNDER_REVIEW"].includes(status)) return "Under Review"; if (["COMPLETED", "APPROVED", "AWARDED"].includes(status)) return "Completed"; if (["SUBMITTED", "REJECTED", "DECLINED"].includes(status)) return "Submitted"; return "Draft"; };

function PortalEmpty({ icon: Icon = FileText, title, children, action }) { return <div className="vp-empty"><Icon size={22} /><strong>{title}</strong><p>{children}</p>{action}</div>; }

function TenderRow({ tender }) {
  const navigate = useNavigate();
  return (
    <article className="vp-tender-row">
      <div className="vp-tender-main">
        <span className="vp-ref">{tenderRef(tender)}</span>
        <h3>{tender.title || tender.name || "Untitled tender"}</h3>
        <p><Building2 size={14} /> {tender.organization || tender.department || "Organization unavailable"}</p>
      </div>
      <div className="vp-tender-fact">
        <span>Submission deadline</span>
        <strong><CalendarDays size={14} /> {dateLabel(tenderDeadline(tender))}</strong>
        <small>{daysRemaining(tenderDeadline(tender))}</small>
      </div>
      <div className="vp-tender-fact vp-tender-requirements">
        <span>Requirements</span>
        <strong>{tender.requirements?.length ?? tender.requirementCount ?? 0}</strong>
        <small>Submission items</small>
      </div>
      <div className="vp-tender-actions">
        <button className="vp-link-button" onClick={() => navigate(`/vendor/tenders/${tender.id || tender._id}`)}>
          View tender <ArrowUpRight size={14} />
        </button>
      </div>
    </article>
  );
}

export default function VendorDashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [tenders, setTenders] = useState([]);
  const [bids, setBids] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      apiRequest("/vendor/profile"),
      apiRequest("/vendor/tenders"),
      apiRequest("/vendor/bids")
    ]).then(([profileResult, tenderResult, bidsResult]) => {
      if (cancelled) return;
      if (profileResult.status === "fulfilled") setProfile(profileResult.value);
      if (tenderResult.status === "fulfilled" && Array.isArray(tenderResult.value)) setTenders(tenderResult.value);
      if (bidsResult.status === "fulfilled" && Array.isArray(bidsResult.value)) setBids(bidsResult.value);

      if (profileResult.status === "rejected" && tenderResult.status === "rejected" && bidsResult.status === "rejected") {
        setLoadingError("Unable to load the vendor dashboard. Please try again.");
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filteredTenders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? tenders.filter(tender =>
          [tender.title, tender.name, tender.referenceNumber, tender.tenderNumber, tender.organization, tender.department]
            .filter(Boolean)
            .some(value => String(value).toLowerCase().includes(normalized))
        )
      : tenders;
  }, [query, tenders]);

  if (loading) return <AppShell><main className="vp-page"><div className="vp-skeleton vp-skeleton-hero" /><div className="vp-skeleton-grid"><div className="vp-skeleton" /><div className="vp-skeleton" /><div className="vp-skeleton" /></div></main></AppShell>;
  if (loadingError) return <AppShell><main className="vp-page"><PortalEmpty icon={Info} title="Vendor portal unavailable">{loadingError}</PortalEmpty></main></AppShell>;

  return (
    <AppShell>
      <main className="vp-page">
        {notice && (
          <div className={`vp-notice ${notice.type}`}>
            <Info size={15} />
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)}><X size={14} /></button>
          </div>
        )}
        <section className="vp-hero">
          <div className="vp-hero-copy">
            <span className="vp-eyebrow">Vendor procurement portal</span>
            <h1>Manage your GeM bids <em>with confidence.</em></h1>
            <p>Browse active tenders and view procurement opportunities from your vendor dashboard.</p>
            <div className="vp-hero-actions">
              <button className="vp-primary" onClick={() => navigate("/vendor/tenders")}>
                <Search size={15} /> Browse Open Tenders
              </button>
              <button className="vp-hero-link" onClick={() => navigate("/vendor/bids")}>
                View My Bids <ArrowRight size={15} />
              </button>
            </div>
          </div>
          <div className="vp-hero-visual" aria-hidden="true">
            <div className="vp-paper vp-paper-back" />
            <div className="vp-paper vp-paper-middle" />
            <div className="vp-paper vp-paper-front">
              <FileCheck2 size={26} />
              <span>Vendor Portal</span>
              <b>ACTIVE OPPORTUNITIES</b>
              <i />
            </div>
            <div className="vp-hero-seal"><ShieldCheck size={18} /></div>
          </div>
        </section>

        <section className="vp-identity">
          <div className="vp-company-mark"><Building2 size={22} /></div>
          <div>
            <span>Registered vendor</span>
            <h2>{profile?.company_name || profile?.legalName || "Your company"}</h2>
            <p>{profile?.vendorCode || "Vendor account"}{profile?.email ? ` · ${profile.email}` : ""}</p>
          </div>
          <div className="vp-account-status"><span /> Account active</div>
        </section>

        <section className="vp-stat-grid">
          <div><FileText size={18} /><strong>{tenders.length}</strong><span>Open tenders</span></div>
          <div><FolderOpen size={18} /><strong>{bids.filter(bid => bidStatus(bid) === "Draft").length}</strong><span>Active bids</span></div>
          <div><CheckCircle2 size={18} /><strong>{bids.filter(bid => bidStatus(bid) !== "Draft").length}</strong><span>Submitted bids</span></div>
          <div><CalendarDays size={18} /><strong>{tenders.filter(tender => tenderDeadline(tender)).length}</strong><span>Upcoming deadlines</span></div>
        </section>

        <section className="vp-surface">
          <div className="vp-section-header">
            <div>
              <span className="vp-eyebrow">Opportunities</span>
              <h2>Open GeM Tenders</h2>
              <p>Browse active procurement opportunities available to your company.</p>
            </div>
            <label className="vp-search">
              <Search size={15} />
              <input
                aria-label="Search tenders"
                placeholder="Search tenders, organizations, or references"
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
            </label>
          </div>

          {filteredTenders.length ? (
            <div className="vp-tender-list">
              {filteredTenders.map(tender => (
                <TenderRow key={tender.id || tender._id} tender={tender} />
              ))}
            </div>
          ) : (
            <PortalEmpty icon={Search} title={query ? "No matching tenders" : "No active tenders"}>
              {query ? "Try a different tender number, title, or organization." : "There are no active procurement opportunities at the moment."}
            </PortalEmpty>
          )}

          <div className="vp-recent">
            <div className="vp-subsection-header">
              <div>
                <span className="vp-eyebrow">Your submissions</span>
                <h2>My Recent Bids</h2>
              </div>
              <button className="vp-link-button" onClick={() => navigate("/vendor/bids")}>
                View all bids <ArrowUpRight size={14} />
              </button>
            </div>
            {bids.length ? (
              <div className="vp-bid-table">
                <div className="vp-bid-table-head">
                  <span>Tender / submission</span>
                  <span>Status</span>
                  <span>Last updated</span>
                  <span />
                </div>
                {bids.slice(0, 5).map(bid => (
                  <div className="vp-bid-table-row" key={bid.id || bid._id}>
                    <div>
                      <strong>{bid.tenderReference || bid.tenderNumber || bid.bidReference || "Bid submission"}</strong>
                      <small>{bid.bidReference || "Submission reference pending"}</small>
                    </div>
                    <span className={`vp-status vp-status-${bidStatus(bid).toLowerCase().replaceAll(" ", "-")}`}>
                      {bidStatus(bid)}
                    </span>
                    <span>{dateLabel(bid.updatedAt || bid.submittedAt || bid.createdAt)}</span>
                    <button onClick={() => navigate(bid.tenderId || bid.tender_id ? `/vendor/tenders/${bid.tenderId || bid.tender_id}` : "/vendor/bids")}>
                      View <ChevronRight size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <PortalEmpty icon={FolderOpen} title="No bids yet">
                You haven't started any bids yet.
              </PortalEmpty>
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
