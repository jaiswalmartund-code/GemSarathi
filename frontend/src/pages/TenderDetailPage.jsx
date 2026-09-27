import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, FileCheck2, FileText, FolderOpen, Landmark, ShieldCheck, Sparkles, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import VendorDocumentsDrawer from "@/components/evaluation/VendorDocumentsDrawer";
import DocumentPreviewModal from "@/components/evaluation/DocumentPreviewModal";
import { createEvaluation, runAiAnalysis } from "@/services/evaluationService";
import { getTender } from "@/services/procurementService";
import { useLanguage } from "../context/LanguageContext";
import "./TenderDetailPage.css";

const dateLabel = value => value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
const normalStatus = value => String(value || "PUBLISHED").replaceAll("_", " ");

function RequirementCard({ requirement, index, mandatoryLabel }) {
  return (
    <article className={`otd-requirement-card ${requirement.mandatory ? "is-mandatory" : ""}`}>
      <div className="otd-req-card-header">
        <span className="otd-req-num">{String(index + 1).padStart(2, "0")}</span>
        <div className="otd-req-tags">
          {requirement.category && <span className="otd-req-tag category">{requirement.category}</span>}
          {requirement.mandatory && <span className="otd-req-tag mandatory"><ShieldCheck size={11} /> {mandatoryLabel}</span>}
        </div>
      </div>
      <div className="otd-req-card-body">
        <h3 className="otd-req-title">{requirement.title || "Tender requirement"}</h3>
        <p className="otd-req-desc">{requirement.description || "Requirement details are available in the tender notice."}</p>
      </div>
    </article>
  );
}

export default function TenderDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [tender, setTender] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [documentsBid, setDocumentsBid] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    setLoaded(false);
    getTender(id).then(setTender).catch(() => setTender(null)).finally(() => setLoaded(true));
  }, [id]);

  const runVerification = async () => {
    setBusy(true);
    setError("");
    try {
      const created = await createEvaluation(id);
      const evaluationId = created?.evaluation?.id || created?.evaluation?._id || created?.id;
      const result = await runAiAnalysis(evaluationId);
      navigate(`/evaluations/${result?.evaluation?.id || evaluationId}`);
    } catch (runError) {
      setError(runError.message || t("tenderDetail.verificationFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <AppShell><main className="otd-page"><section className="otd-loading"><div /><div /><div /></section></main></AppShell>;
  if (!tender) return <AppShell><main className="otd-page"><section className="otd-empty"><FileText size={24} /><h1>{t("tenderDetail.notAvailableTitle")}</h1><p>{t("tenderDetail.notFoundText")}</p><Link to="/tenders">Back to evaluations</Link></section></main></AppShell>;

  const bids = tender.bids || [];
  const requirements = tender.requirements || [];
  const documents = tender.documents || [];
  const reference = tender.tenderRef || tender.referenceNumber || "Reference pending";

  const categories = ["all", "mandatory", ...Array.from(new Set(requirements.map(r => r.category).filter(Boolean)))];
  const filteredRequirements = requirements.filter(req => {
    if (activeCategory === "all") return true;
    if (activeCategory === "mandatory") return req.mandatory;
    return req.category?.toLowerCase() === activeCategory.toLowerCase();
  });

  return <AppShell>
    <main className="otd-page">
      <Link to="/tenders" className="otd-back"><ArrowLeft size={16} /> Evaluations</Link>
      <header className="otd-header">
        <div><span className="otd-eyebrow">Tender evaluation</span><h1>{tender.name || tender.title || "Tender workspace"}</h1><div className="otd-reference"><span>{reference}</span><span><CheckCircle2 size={14} /> {normalStatus(tender.status)}</span></div></div>
        <div className="otd-header-count"><strong>{bids.length}</strong><span>{bids.length === 1 ? "submitted bid" : "submitted bids"}</span></div>
      </header>

      {error && <div className="otd-error">{error}</div>}

      <section className="otd-summary">
        <div className="otd-summary-copy"><span className="otd-eyebrow">Tender brief</span><h2>Procurement overview</h2><p>{tender.description || t("tenderDetail.noDescription")}</p></div>
        <dl className="otd-facts"><div><dt><FileText size={14} /> Reference</dt><dd>{reference}</dd></div><div><dt><Landmark size={14} /> Department</dt><dd>{tender.department || "Department not specified"}</dd></div><div><dt><CalendarDays size={14} /> Deadline</dt><dd>{dateLabel(tender.deadline || tender.submissionDeadline)}</dd></div></dl>
      </section>

      <section className="otd-review-band">
        <div className="otd-review-icon"><ShieldCheck size={21} /></div>
        <div><span className="otd-eyebrow">Verification control</span><h2>Evaluate submitted bid packages</h2><p>Review tender requirements, submitted documents, and rule-based verification results before recording an officer decision.</p></div>
        <div className="otd-review-action"><button disabled={busy || bids.length === 0} onClick={runVerification}><Sparkles size={15} /> {busy ? t("tenderDetail.analysing") : t("tenderDetail.runVerification")}</button>{bids.length === 0 && <small>{t("tenderDetail.enabledOnceHint")}</small>}</div>
      </section>

      <section className="otd-content-grid">
        <section className="otd-panel otd-requirements-panel">
          <div className="otd-panel-head">
            <div>
              <span className="otd-eyebrow">Verification scope</span>
              <h2>{t("tenderDetail.requirementsTitle")} <b>{requirements.length}</b></h2>
              <p>Criteria extracted from the tender notice and used during bid review.</p>
            </div>
          </div>
          {requirements.length ? (
            <>
              {categories.length > 2 && (
                <div className="otd-req-filter-bar">
                  {categories.map(cat => {
                    const count = cat === "all" 
                      ? requirements.length 
                      : cat === "mandatory" 
                        ? requirements.filter(r => r.mandatory).length 
                        : requirements.filter(r => r.category?.toLowerCase() === cat.toLowerCase()).length;
                    
                    const label = cat === "all" ? "All Criteria" : cat === "mandatory" ? "Mandatory" : cat;
                    
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`otd-filter-chip ${activeCategory === cat ? "active" : ""}`}
                        onClick={() => setActiveCategory(cat)}
                      >
                        <span>{label}</span>
                        <span className="chip-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="otd-requirements-grid">
                {filteredRequirements.map((requirement, index) => (
                  <RequirementCard
                    key={requirement.id || requirement._id || index}
                    requirement={requirement}
                    index={requirements.indexOf(requirement)}
                    mandatoryLabel={t("tenderDetail.mandatory")}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="otd-panel-empty">{t("tenderDetail.noRequirements")}</div>
          )}
        </section>

        <aside className="otd-bids-column"><section className="otd-panel otd-bids-panel"><div className="otd-panel-head"><div><span className="otd-eyebrow">Submitted responses</span><h2>Vendor bids <b>{bids.length}</b></h2></div><Link to="/vendors">{t("tenderDetail.viewVendors")} <ArrowUpRight size={13} /></Link></div>{bids.length ? <div className="otd-bid-list">{bids.map(bid => {
          const bidDocuments = documents.filter(document => document.bidId === bid.id || document.bid_id === bid.id);
          const vendorName = bid.companyName || bid.vendorName || bid.company_name || "Vendor submission";
          return <article key={bid.id || bid._id} className="otd-bid-card"><div className="otd-bid-identity"><span><Users size={17} /></span><div><h3>{vendorName}</h3><p>{bid.bidReference || "Submission reference pending"}</p></div></div><div className="otd-bid-meta"><span><Clock3 size={13} /> {bid.submittedAt ? dateLabel(bid.submittedAt) : "Recently submitted"}</span><i>{normalStatus(bid.submissionStatus || bid.status || "SUBMITTED")}</i></div><div className="otd-bid-actions"><button onClick={() => bidDocuments.length === 1 ? setPreviewDoc(bidDocuments[0]) : setDocumentsBid({ name: vendorName, bid: { id: bid.id, bidReference: bid.bidReference } })}><FolderOpen size={13} /> Documents</button><Link to={`/evaluations/${bid.id}`}><FileCheck2 size={13} /> Open evaluation</Link></div></article>;
        })}</div> : <div className="otd-no-bids"><Users size={20} /><strong>No bids submitted yet</strong><p>Submitted vendor responses will appear here and can then be evaluated.</p></div>}</section>
          <section className="otd-next-step"><span className="otd-eyebrow">Review flow</span><h2>From submission to decision</h2><ol><li><b>01</b><span>Inspect submitted bid documents.</span></li><li><b>02</b><span>Run requirement verification.</span></li><li><b>03</b><span>Record the officer decision.</span></li></ol></section>
        </aside>
      </section>
    </main>
    {documentsBid && <VendorDocumentsDrawer vendor={documentsBid} documents={documents.filter(document => document.bidId === documentsBid.bid?.id)} onClose={() => setDocumentsBid(null)} onView={setPreviewDoc} />}
    <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
  </AppShell>;
}
