import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, CircleAlert, Clock3, FileText, Landmark, LockKeyhole, Search, ShieldCheck, Sparkles, UserCheck, XCircle } from "lucide-react";
import AppShell from "@/components/AppShell";
import EvidenceDrawer from "@/components/evaluation/EvidenceDrawer";
import DocumentPreviewModal from "@/components/evaluation/DocumentPreviewModal";
import { analyzeBid, getBidEvaluationData, getEvaluationById, submitOfficerDecision } from "@/services/evaluationService";
import "./EvaluationPage.css";

const TECHNICAL_THRESHOLD = 50;
const CREDENTIAL_REQUIREMENT_PATTERN = /\b(pan|gst|udyam|msme|itr|turnover|financial|aadhaar|aadhar|authori[sz]ed representative|representative|identity|mca|company registration|incorporation|registration|relevant experience|experience|cv)\b/i;
const DOCUMENT_DOMAINS = [
  { key: "PAN", title: "PAN", category: "Identity / registration", keywords: ["PAN"] },
  { key: "GST", title: "GST registration certificate", category: "Registration", keywords: ["GST"] },
  { key: "UDYAM", title: "Udyam registration", category: "Registration", keywords: ["UDYAM", "MSME"] },
  { key: "EXPERIENCE", title: "Experience / CV / experience proof", category: "Experience", keywords: ["EXPERIENCE", "CV", "WORK_ORDER"] },
  { key: "ITR", title: "ITR / financial turnover proof", category: "Financial", keywords: ["ITR", "TURNOVER", "FINANCIAL"] },
  { key: "AADHAAR", title: "Aadhaar / authorised representative identity", category: "Identity", keywords: ["AADHAAR", "IDENTITY", "AUTHORIZED", "AUTHORIS"] },
  { key: "MCA", title: "MCA / company registration", category: "Registration", keywords: ["MCA", "COMPANY", "INCORPORATION"] },
];

const normalizedStatus = value => String(value || "").trim().toUpperCase();
const requirementStatus = value => normalizedStatus(value) === "COMPLIANT" || normalizedStatus(value) === "PASS" ? "PASS" : normalizedStatus(value) === "NON_COMPLIANT" || normalizedStatus(value) === "FAIL" ? "FAIL" : "REVIEW";
const isTechnicalDocument = document => normalizedStatus(document.documentType || document.document_type) === "TECHNICAL_BID";
const documentName = document => document?.originalFilename || document?.original_filename || document?.filename || "Uploaded document";
const isTechnicalRequirement = (result, requirements) => {
  const requirement = requirements.find(item => String(item.id || item._id) === String(result.requirementId || result.requirement_id));
  const category = String(requirement?.category || requirement?.requirementCategory || requirement?.requirement_category || result.category || "").toLowerCase();
  const title = String(requirement?.title || result.requirement || "").toLowerCase();
  const label = `${title} ${category}`;
  if (CREDENTIAL_REQUIREMENT_PATTERN.test(label) || category === "eligibility") return false;
  return true;
};

function VerificationStatus({ status }) {
  const value = normalizedStatus(status);
  const config = value === "PASS" || value === "VERIFIED" ? { icon: CheckCircle2, label: value === "VERIFIED" ? "Verified" : "Pass", className: "passed" }
    : value === "FAIL" || value === "FAILED" ? { icon: XCircle, label: "Failed", className: "failed" }
      : value === "REVIEW" ? { icon: AlertTriangle, label: "Review", className: "review" }
        : value === "READY" || value === "FOUND" ? { icon: FileText, label: "Ready", className: "ready" }
          : value === "PROCESSING" ? { icon: Clock3, label: "Processing", className: "processing" }
            : value === "UNAVAILABLE" ? { icon: CircleAlert, label: "Unavailable", className: "unavailable" }
              : { icon: CircleAlert, label: "Not uploaded", className: "missing" };
  const Icon = config.icon;
  return <span className={`ow-status ow-status-${config.className}`}><Icon size={13} /> {config.label}</span>;
}

function WorkflowStage({ number, title, description, state }) {
  return <div className={`ow-flow-stage ow-flow-${state}`}><span className="ow-flow-number">{number}</span><div><strong>{title}</strong><small>{description}</small></div></div>;
}

function TechnicalResultRow({ result, onOpenEvidence }) {
  const status = requirementStatus(result.status);
  return <article className="ow-result-row"><div className="ow-result-requirement"><strong>{result.requirement || "Technical requirement"}</strong><span>{result.category || "Technical"}</span></div><p>{result.extractedValue || "No extracted bidder response available."}</p><VerificationStatus status={status} /><button type="button" onClick={() => onOpenEvidence(result)}>View evidence <ChevronRight size={14} /></button></article>;
}

function DocumentVerificationRow({ domain, document, qualified, onPreview, onOpenEvidence }) {
  const result = domain.result;
  let status = "NOT_UPLOADED";
  if (!document) {
    status = "NOT_UPLOADED";
  } else if (result && (result.status === "PASS" || result.status === "VERIFIED" || result.status === "COMPLIANT")) {
    status = "VERIFIED";
  } else if (result && (result.status === "FAIL" || result.status === "FAILED" || result.status === "NON_COMPLIANT")) {
    status = "FAILED";
  } else {
    status = "READY";
  }

  return <article className={`ow-document-row ${!qualified ? "is-locked" : ""}`}>
    <div>
      <strong>{domain.title}</strong>
      <span>{domain.category}</span>
      {result?.extractedValue && (
        <small style={{ display: "block", color: "var(--accent-primary)", marginTop: 3, fontWeight: 500 }}>
          {result.extractedValue}
        </small>
      )}
    </div>
    <div className="ow-document-file">
      {document ? <><FileText size={15} /><span>{documentName(document)}</span></> : <span>{qualified ? "Not uploaded by bidder" : "Available after technical qualification"}</span>}
    </div>
    <VerificationStatus status={qualified ? status : "UNAVAILABLE"} />
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {document && qualified && <button type="button" onClick={() => onPreview(document)}>View document <ChevronRight size={14} /></button>}
      {result && qualified && <button type="button" style={{ color: "var(--accent-primary)", cursor: "pointer", background: "none", border: "none", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }} onClick={() => onOpenEvidence(result)}><Sparkles size={13} /> Evidence</button>}
      {!document && !result && qualified && <span className="ow-document-action">No evidence available</span>}
    </div>
  </article>;
}

export default function EvaluationPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [officerNotes, setOfficerNotes] = useState("");
  const [decisionSaving, setDecisionSaving] = useState(false);

  const load = async () => {
    setLoaded(false);
    setError("");
    try {
      const response = await getBidEvaluationData(id);
      setData(response);
      setOfficerNotes(response.bid?.officerNotes || "");
    } catch {
      try {
        const legacy = await getEvaluationById(id);
        if (!legacy) throw new Error("The requested bid evaluation record could not be found.");
        const vendor = legacy.vendors?.[0] || {};
        const legacyResults = legacy.results || [];
        setData({
          bid: { id: vendor.bid?.id || id, bidReference: vendor.bid?.bidReference || `BID-${id}`, status: vendor.bid?.status || legacy.evaluation?.status || "SUBMITTED", officerNotes: "" },
          tender: { id: legacy.evaluation?.tenderId || id, tenderNumber: legacy.evaluation?.tenderReference || "GEM/2026/B/DEMO-001", referenceNumber: legacy.evaluation?.tenderReference || "GEM/2026/B/DEMO-001", title: legacy.evaluation?.title || "Tender evaluation", department: legacy.evaluation?.department || "Department unavailable" },
          vendor: { id: vendor.id, legalName: vendor.name || "Bidder" },
          documents: legacy.documents || [],
          requirements: legacy.requirements || [],
          results: legacyResults.map(result => ({ ...result, requirement: legacy.requirements?.find(requirement => requirement.id === result.requirementId)?.title || "Technical requirement", category: legacy.requirements?.find(requirement => requirement.id === result.requirementId)?.category || "Technical", status: requirementStatus(result.status), evidence: result.exactQuote ? [{ documentId: result.sourceDocumentId, page: result.pageNumber, text: result.exactQuote }] : [] })),
          score: vendor.compliancePercentage != null ? { value: vendor.compliancePercentage, totalRequirements: legacyResults.length, passed: legacyResults.filter(result => requirementStatus(result.status) === "PASS").length, failed: legacyResults.filter(result => requirementStatus(result.status) === "FAIL").length, review: legacyResults.filter(result => requirementStatus(result.status) === "REVIEW").length } : null,
        });
      } catch (loadError) {
        setError(loadError.message || "Failed to load the evaluation workspace.");
      }
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleRunVerification = async () => {
    setBusy("analyze");
    setError("");
    setSuccessMsg("");
    try {
      await analyzeBid(data?.bid?.id || id);
      setSuccessMsg("Technical verification was refreshed.");
      await load();
    } catch (verificationError) {
      setError(verificationError.message || "Verification could not be completed.");
    } finally { setBusy(""); }
  };

  const handleDecision = async decision => {
    setDecisionSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const result = await submitOfficerDecision(data?.bid?.id || id, decision, officerNotes);
      setSuccessMsg(`Officer decision recorded: ${result.status || decision}.`);
      await load();
    } catch (decisionError) {
      setError(decisionError.message || "Unable to record the officer decision.");
    } finally { setDecisionSaving(false); }
  };

  const technicalResults = useMemo(() => (data?.results || []).filter(result => isTechnicalRequirement(result, data?.requirements || [])), [data]);
  const filteredResults = useMemo(() => technicalResults.filter(result => {
    const matchesQuery = !query.trim() || `${result.requirement || ""} ${result.extractedValue || ""}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (filter === "ALL" || requirementStatus(result.status) === filter);
  }), [filter, query, technicalResults]);

  if (!loaded) return <AppShell><main className="officer-workspace"><section className="ow-loading"><div /><div /><div /></section></main></AppShell>;
  if (!data) return <AppShell><main className="officer-workspace"><section className="ow-empty"><CircleAlert size={24} /><h1>Evaluation unavailable</h1><p>{error || "The requested bid evaluation record could not be found."}</p><Link to="/tenders">Back to evaluations</Link></section></main></AppShell>;

  const { bid = {}, tender = {}, vendor = {}, documents = [], score, results = [] } = data;
  const technicalDocument = documents.find(isTechnicalDocument) || null;
  const calculatedTechnicalPassed = technicalResults.filter(result => requirementStatus(result.status) === "PASS").length;
  const calculatedTechnicalScore = technicalResults.length ? Math.round((calculatedTechnicalPassed / technicalResults.length) * 100) : 0;
  const technicalScore = technicalResults.length === results.length && Number.isFinite(Number(score?.value)) ? Math.round(Number(score.value)) : calculatedTechnicalScore;
  const technicalComplete = technicalResults.length > 0;
  const qualified = technicalComplete && technicalScore >= TECHNICAL_THRESHOLD;
  const passed = technicalResults.length === results.length && score?.passed != null ? score.passed : calculatedTechnicalPassed;
  const failed = technicalResults.length === results.length && score?.failed != null ? score.failed : technicalResults.filter(result => requirementStatus(result.status) === "FAIL").length;
  const review = technicalResults.length === results.length && score?.review != null ? score.review : technicalResults.filter(result => requirementStatus(result.status) === "REVIEW").length;
  const totalRequirements = technicalResults.length === results.length && score?.totalRequirements != null ? score.totalRequirements : technicalResults.length;
  const reference = tender.referenceNumber || tender.tenderNumber || "Reference pending";
  const documentRows = DOCUMENT_DOMAINS.map(domain => {
    const doc = documents.find(document => !isTechnicalDocument(document) && domain.keywords.some(keyword => `${document.documentType || document.document_type || ""} ${documentName(document)}`.toUpperCase().includes(keyword))) || null;
    const result = (results || []).find(r => {
      if (isTechnicalRequirement(r, data?.requirements || [])) return false;
      const text = `${r.requirement || ""} ${r.category || ""} ${r.extractedValue || ""} ${r.explanation || ""}`.toLowerCase();
      return domain.keywords.some(kw => text.includes(kw.toLowerCase()));
    }) || null;
    return { ...domain, document: doc, result };
  });
  const decisionStatus = normalizedStatus(bid.status || bid.submissionStatus);

  const openEvidence = result => setSelectedResult({ ...result, status: requirementStatus(result.status) === "PASS" ? "COMPLIANT" : requirementStatus(result.status) === "FAIL" ? "NON_COMPLIANT" : "FLAG_FOR_REVIEW", confidenceScore: result.confidenceScore ?? 0, exactQuote: result.evidence?.[0]?.text || result.explanation || "", pageNumber: result.evidence?.[0]?.page || result.pageNumber || null, sourceDocumentId: result.evidence?.[0]?.documentId || result.sourceDocumentId || technicalDocument?.id });

  return <AppShell>
    <main className="officer-workspace">
      <Link to={`/tenders/${tender.id || ""}`} className="ow-back"><ArrowLeft size={16} /> Evaluation queue</Link>
      <header className="ow-header">
        <div className="ow-header-copy"><span className="ow-eyebrow">Procurement evaluation</span><h1>{tender.title || "Tender evaluation"}</h1><div className="ow-header-meta"><span>{reference}</span><span><UserCheck size={15} /> {vendor.legalName || vendor.name || "Bidder not available"}</span><span><Landmark size={15} /> {tender.department || tender.organization || "Department unavailable"}</span></div></div>
        <div className="ow-header-actions"><VerificationStatus status={decisionStatus === "ACCEPTED" ? "VERIFIED" : decisionStatus === "REJECTED" ? "FAILED" : decisionStatus === "UNDER_REVIEW" ? "REVIEW" : technicalComplete ? "READY" : "PROCESSING"} />{technicalDocument && <button type="button" onClick={() => setPreviewDoc(technicalDocument)}><FileText size={15} /> Technical bid PDF</button>}</div>
      </header>

      {error && <div className="ow-message is-error"><CircleAlert size={16} /> {error}</div>}
      {successMsg && <div className="ow-message is-success"><CheckCircle2 size={16} /> {successMsg}</div>}

      <section className="ow-workflow" aria-label="Verification workflow">
        <WorkflowStage number="01" title="Technical bid" description="AI extraction + rule verification" state={technicalComplete ? "complete" : "active"} />
        <ArrowRight className="ow-flow-arrow" size={18} />
        <WorkflowStage number="02" title="Document verification" description="Government / credential checks" state={qualified ? "active" : "locked"} />
        <ArrowRight className="ow-flow-arrow" size={18} />
        <WorkflowStage number="03" title="Officer decision" description="Human review and final action" state={decisionStatus === "ACCEPTED" || decisionStatus === "REJECTED" ? "complete" : "pending"} />
      </section>

      {!technicalComplete ? <section className="ow-awaiting"><div><span className="ow-eyebrow">Layer 1 · technical bid verification</span><h2>Technical verification is ready to run</h2><p>The system will extract bid evidence and compare it with tender requirements. The result remains advisory input for the officer.</p></div><button type="button" onClick={handleRunVerification} disabled={busy === "analyze"}><Sparkles size={16} /> {busy === "analyze" ? "Running verification…" : "Run technical verification"}</button></section> : <>
        <section className="ow-technical-summary">
          <div className="ow-score"><span className="ow-eyebrow">Layer 1 · technical bid verification</span><div><strong>{technicalScore}%</strong><span>Technical compliance score</span></div><p><b>{passed} / {totalRequirements}</b> requirements satisfied</p></div>
          <div className="ow-score-progress"><div><span>Technical threshold</span><strong>{TECHNICAL_THRESHOLD}% required</strong></div><i><b style={{ width: `${Math.min(technicalScore, 100)}%` }} /></i><small>{technicalScore}% achieved</small></div>
          <div className={`ow-gate ${qualified ? "is-open" : "is-locked"}`}>{qualified ? <ShieldCheck size={21} /> : <LockKeyhole size={21} />}<div><span>{qualified ? "Qualified for document verification" : "Technical threshold not met"}</span><strong>{qualified ? "Layer 2 unlocked" : "Document verification locked"}</strong><small>{qualified ? "The bid can proceed to credential checks." : `A score of ${TECHNICAL_THRESHOLD}% is required to proceed.`}</small></div></div>
          <button type="button" className="ow-rerun" onClick={handleRunVerification} disabled={busy === "analyze"}><Sparkles size={15} /> {busy === "analyze" ? "Refreshing…" : "Refresh"}</button>
        </section>

        <section className="ow-panel ow-technical-panel"><div className="ow-panel-head"><div><span className="ow-eyebrow">Requirement-level review</span><h2>Technical requirement matrix</h2><p>Extracted bid evidence is checked against the tender’s technical rules.</p></div><div className="ow-matrix-tools"><label><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search requirements" aria-label="Search technical requirements" /></label><div>{["ALL", "PASS", "FAIL", "REVIEW"].map(value => <button type="button" key={value} className={filter === value ? "is-selected" : ""} onClick={() => setFilter(value)}>{value}</button>)}</div></div></div><div className="ow-result-table"><div className="ow-result-head"><span>Requirement</span><span>Bidder response</span><span>Rule result</span><span>Evidence</span></div>{filteredResults.length ? filteredResults.map((result, index) => <TechnicalResultRow key={result.requirementId || result.id || index} result={result} onOpenEvidence={openEvidence} />) : <div className="ow-no-results">No technical requirements match this filter.</div>}</div></section>

        <section className={`ow-panel ow-document-panel ${!qualified ? "is-locked" : ""}`}><div className="ow-panel-head"><div><span className="ow-eyebrow">Layer 2 · document verification</span><h2>Government and credential checks</h2><p>{qualified ? "Technical threshold satisfied. These domains are ready for credential verification when provider data is connected." : "Technical compliance must reach the required threshold before credential verification can begin."}</p></div><div className={`ow-layer-state ${qualified ? "is-open" : "is-locked"}`}>{qualified ? <><ShieldCheck size={16} /> Layer 2 unlocked</> : <><LockKeyhole size={16} /> Layer 2 locked</>}</div></div>{!qualified && <div className="ow-document-lock"><LockKeyhole size={18} /><div><strong>Document verification is not active</strong><span>Technical score: {technicalScore}% · Required: {TECHNICAL_THRESHOLD}%</span></div></div>}<div className="ow-document-table"><div className="ow-document-head"><span>Verification domain</span><span>Bidder document</span><span>Current state</span><span>Evidence</span></div>{documentRows.map(row => <DocumentVerificationRow key={row.key} domain={row} document={row.document} qualified={qualified} onPreview={setPreviewDoc} onOpenEvidence={openEvidence} />)}</div></section>
      </>}

      <section className="ow-decision-panel"><div className="ow-decision-head"><div><span className="ow-eyebrow">Officer final review</span><h2>Record the procurement decision</h2><p>Automated outputs are advisory inputs. The final decision belongs to the reviewing officer.</p></div><div className="ow-decision-summary"><span>Technical score <b>{technicalComplete ? `${technicalScore}%` : "Pending"}</b></span><span>Document layer <b>{qualified ? "Eligible" : "Locked"}</b></span><span>Attention items <b>{failed + review}</b></span></div></div><label className="ow-notes"><span>Officer notes / rationale</span><textarea rows={5} value={officerNotes} onChange={event => setOfficerNotes(event.target.value)} placeholder="Record the rationale for the final procurement decision, outstanding issues, or any required follow-up." /></label><div className="ow-decision-actions"><button type="button" className="ow-proceed" onClick={() => handleDecision("ACCEPT")} disabled={decisionSaving || !technicalComplete}><CheckCircle2 size={16} /> Accept / proceed</button><button type="button" className="ow-review" onClick={() => handleDecision("REQUEST_REVIEW")} disabled={decisionSaving}><AlertTriangle size={16} /> Request review</button><button type="button" className="ow-reject" onClick={() => handleDecision("REJECT")} disabled={decisionSaving}><XCircle size={16} /> Reject bid</button>{decisionSaving && <span>Saving officer decision…</span>}</div></section>

      {selectedResult && <EvidenceDrawer result={selectedResult} requirement={{ title: selectedResult.requirement, requirement: selectedResult.expectedValue || selectedResult.requirement }} vendor={{ name: vendor.legalName || vendor.name || "Bidder", bid: { pdfName: documentName(technicalDocument) } }} documents={documents} onClose={() => setSelectedResult(null)} onViewSourceDocument={setPreviewDoc} />}
      <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </main>
  </AppShell>;
}
