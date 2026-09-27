import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, ExternalLink, FileText, LockKeyhole, Send, ShieldCheck } from "lucide-react";
import AppShell from "../components/AppShell";
import { apiRequest } from "../services/apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const dateTimeLabel = value => value
  ? new Date(value).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "To be announced";

const titleFor = requirement => requirement?.title || requirement?.requirementName || requirement?.requirement_name || "Submission requirement";
const descriptionFor = requirement => requirement?.description || "Review the tender notice for the complete document and eligibility details.";

export default function VendorTenderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingBid, setStartingBid] = useState(false);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest(`/vendor/tenders/${id}`)
      .then(data => { if (!cancelled) setTender(data); })
      .catch(err => { if (!cancelled) setError(err.message || "Unable to load this tender."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const sourceDocument = useMemo(
    () => tender?.sourceDocument || tender?.sourceDocuments?.[0] || tender?.documents?.find(doc => !doc.bidId && !doc.bid_id) || null,
    [tender],
  );
  const rawSourceUrl = sourceDocument?.url || (sourceDocument?.id ? `/api/documents/${sourceDocument.id}/download` : tender?.sourceDocumentUrl || tender?.source_document_url || "");
  const sourceUrl = useMemo(() => {
    if (!rawSourceUrl) return "";
    if (rawSourceUrl.startsWith("http://") || rawSourceUrl.startsWith("https://")) return rawSourceUrl;
    const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const path = rawSourceUrl.startsWith("/") ? rawSourceUrl : `/${rawSourceUrl}`;
    const finalBase = path.startsWith("/api") && base.endsWith("/api") ? base.slice(0, -4) : base;
    return `${finalBase}${path}`;
  }, [rawSourceUrl]);

  const requirements = tender?.requirements || [];
  const eligibilityRequirements = useMemo(() => {
    if (Array.isArray(tender?.eligibilityRequirements) && tender.eligibilityRequirements.length) return tender.eligibilityRequirements;
    return requirements.filter(requirement => {
      const category = String(requirement.category || requirement.requirementCategory || requirement.requirement_category || "").toLowerCase();
      const type = String(requirement.requirementType || requirement.requirement_type || "").toLowerCase();
      return category === "eligibility" || ["financial", "experience", "registration", "identity", "document", "statutory"].includes(type) || (category !== "technical" && type !== "technical");
    });
  }, [tender, requirements]);
  const technicalRequirements = useMemo(() => {
    if (Array.isArray(tender?.technicalRequirements) && tender.technicalRequirements.length) return tender.technicalRequirements;
    return requirements.filter(requirement => {
      const category = String(requirement.category || requirement.requirementCategory || requirement.requirement_category || "").toLowerCase();
      const type = String(requirement.requirementType || requirement.requirement_type || "").toLowerCase();
      return category === "technical" || type === "technical";
    });
  }, [tender, requirements]);

  const startBid = async () => {
    setStartingBid(true);
    setStartError("");
    try {
      const response = await apiRequest(`/vendor/tenders/${id}/bids`, {
        method: "POST",
        body: JSON.stringify({ bid_reference: `BID-${Date.now()}` }),
      });
      const bid = response?.bid || response;
      const workspaceBidId = bid?.id || bid?._id;
      if (!workspaceBidId) throw new Error("The bid draft was created, but its workspace reference was not returned.");
      navigate(`/vendor/bids/${encodeURIComponent(String(workspaceBidId))}/submit`);
    } catch (err) {
      setStartError(err.message || "We could not start a bid right now. Please try again.");
    } finally {
      setStartingBid(false);
    }
  };

  if (loading) return <AppShell><div className="vendor-detail-state"><div className="vendor-detail-skeleton" /><div className="vendor-detail-skeleton short" /><div className="vendor-detail-skeleton body" /></div></AppShell>;
  if (error || !tender) return <AppShell><div className="vendor-detail-state"><div className="vendor-detail-error"><FileText size={22} /><h2>Tender unavailable</h2><p>{error || "We could not find this procurement opportunity."}</p><Link to="/vendor/dashboard" className="detail-primary-action">Back to tenders</Link></div></div></AppShell>;

  const title = tender.title || tender.name || "Tender opportunity";
  const reference = tender.referenceNumber || tender.tenderNumber || tender.tenderRef || "Reference pending";
  const deadline = tender.submissionDeadline || tender.submission_deadline || tender.deadline;
  const organization = tender.organization || tender.department || "Procuring organisation";
  const summary = tender.summary || tender.description || "Review the tender scope, eligibility requirements, and submission documents before starting your bid.";

  return <AppShell>
    <main className="vtd-page">
      <Link to="/vendor/dashboard" className="vtd-back-link"><ArrowLeft size={16} /> All open tenders</Link>

      <header className="vtd-hero">
        <div className="vtd-hero-copy">
          <span className="vtd-eyebrow">Tender opportunity</span>
          <h1>{title}</h1>
          <div className="vtd-identity"><span>{reference}</span><span className="vtd-status"><ShieldCheck size={15} /> Open for bidding</span></div>
        </div>
        <div className="vtd-hero-deadline">
          <CalendarDays size={19} />
          <div><span>Submission deadline</span><strong>{dateTimeLabel(deadline)}</strong></div>
        </div>
      </header>

      <section className="vtd-intro-grid" aria-label="Tender overview">
        <article className="vtd-brief-card">
          <span className="vtd-eyebrow">Tender brief</span>
          <h2>What this opportunity covers</h2>
          <p>{summary}</p>
          <div className="vtd-safe-note"><LockKeyhole size={16} /> Only the documents and criteria needed for your submission are shown here.</div>
        </article>
        <article className="vtd-facts-card">
          <span className="vtd-eyebrow">At a glance</span>
          <dl>
            <div><dt>Organisation</dt><dd>{organization}</dd></div>
            <div><dt>Completion period</dt><dd>{tender.completionPeriod || tender.completion_period || "See tender notice"}</dd></div>
            <div><dt>Warranty</dt><dd>{tender.warrantyPeriod || tender.warranty_period || "As specified"}</dd></div>
          </dl>
        </article>
      </section>

      <section className="vtd-action-card">
        <div><span className="vtd-eyebrow">Your next step</span><h2>Ready to prepare your bid?</h2><p>Start a secure draft workspace and upload each requested document when you are ready.</p></div>
        <div className="vtd-action-controls"><button type="button" onClick={startBid} disabled={startingBid}><Send size={17} /> {startingBid ? "Opening workspace…" : "Start bid"}<ArrowRight size={16} /></button>{startError && <p className="vtd-action-error">{startError}</p>}</div>
      </section>

      <section className="vtd-content-grid">
        <div className="vtd-main-column">
          <section className="vtd-requirements-section">
            <div className="vtd-section-heading"><div><span className="vtd-eyebrow">Bid checklist</span><h2>Documents and eligibility</h2><p>Prepare these items before submitting your response.</p></div><span className="vtd-item-count">{eligibilityRequirements.length} {eligibilityRequirements.length === 1 ? "item" : "items"}</span></div>
            {eligibilityRequirements.length ? <div className="vtd-requirement-grid">{eligibilityRequirements.map((requirement, index) => <article className="vtd-requirement-card" key={requirement.id || requirement._id || index}><span className="vtd-requirement-index">{String(index + 1).padStart(2, "0")}</span><div><div className="vtd-requirement-topline"><h3>{titleFor(requirement)}</h3><span className={requirement.mandatory === false ? "vtd-optional" : "vtd-required"}>{requirement.mandatory === false ? "Optional" : "Required"}</span></div><p>{descriptionFor(requirement)}</p></div></article>)}</div> : <div className="vtd-empty"><FileText size={19} /> The detailed submission checklist is available in the tender notice.</div>}
          </section>

          {technicalRequirements.length > 0 && <section className="vtd-technical-section"><div className="vtd-section-heading"><div><span className="vtd-eyebrow">Technical scope</span><h2>Specifications to address</h2></div><span className="vtd-item-count">{technicalRequirements.length} {technicalRequirements.length === 1 ? "item" : "items"}</span></div><div className="vtd-technical-list">{technicalRequirements.map((requirement, index) => <article key={requirement.id || requirement._id || index}><FileText size={17} /><div><h3>{titleFor(requirement)}</h3><p>{descriptionFor(requirement)}</p></div></article>)}</div></section>}
        </div>

        <aside className="vtd-side-column">
          <section className="vtd-source-card"><div className="vtd-file-icon"><FileText size={21} /></div><span className="vtd-eyebrow">Official notice</span><h2>Source tender document</h2><p>{sourceDocument?.originalFilename || sourceDocument?.original_filename || sourceDocument?.filename || `${reference} tender notice`}</p>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> View tender PDF</a> : <span className="vtd-source-unavailable"><Clock3 size={15} /> PDF currently unavailable</span>}</section>
          <section className="vtd-scope-card"><span className="vtd-eyebrow">Submission guidance</span><h2>Check before you submit</h2><ul><li>Include every required document.</li><li>Use the source notice for full technical terms.</li><li>Submit before the stated deadline.</li></ul></section>
        </aside>
      </section>
    </main>
  </AppShell>;
}
