import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleAlert, Clock3, FileCheck2, FileText, Landmark, LoaderCircle, LockKeyhole, Send, Upload, X } from "lucide-react";
import AppShell from "../components/AppShell";
import { apiRequest } from "../services/apiClient";

const documentTitle = requirement => requirement?.title || requirement?.requirementName || requirement?.requirement_name || "Submission document";
const documentDescription = requirement => requirement?.description || "Upload a clear PDF that addresses this requirement.";
const documentType = (requirement, index) => `REQUIREMENT_${requirement?.id || requirement?._id || index + 1}`;
const dateTimeLabel = value => value ? new Date(value).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "To be announced";

function requirementForDocument(requirement, index, documents) {
  if (!requirement || !Array.isArray(documents)) return null;
  const slotType = documentType(requirement, index);
  const reqId = String(requirement?.id || requirement?._id || "");
  const reqDocType = String(requirement?.requiredDocumentType || requirement?.required_document_type || "").toUpperCase();
  const text = `${requirement?.title || ""} ${requirement?.requirementName || ""} ${requirement?.category || ""} ${requirement?.requirementType || ""}`.toLowerCase();

  return documents.find(doc => {
    const dType = String(doc.documentType || doc.document_type || "").toUpperCase();
    const dSlot = String(doc.slotType || doc.rawDocumentType || "").toUpperCase();

    if (dType === slotType || dSlot === slotType) return true;
    if (reqId && (dType.includes(reqId) || dSlot.includes(reqId))) return true;
    if (reqDocType && reqDocType !== "OTHER" && dType === reqDocType) return true;

    if (text.includes("pan") && dType === "PAN") return true;
    if (text.includes("gst") && dType === "GST") return true;
    if ((text.includes("aadhaar") || text.includes("identity")) && dType === "AADHAAR") return true;
    if ((text.includes("turnover") || text.includes("financial") || text.includes("itr")) && dType === "FINANCIAL_STATEMENT") return true;
    if (text.includes("experience") && dType === "EXPERIENCE_CERTIFICATE") return true;
    if ((text.includes("company") || text.includes("mca") || text.includes("registration")) && dType === "COMPANY_REGISTRATION") return true;

    return false;
  });
}

export default function VendorBidSubmissionPage() {
  const { bidId } = useParams();
  const navigate = useNavigate();
  const uploadInput = useRef(null);
  const [bid, setBid] = useState(null);
  const [tender, setTender] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingType, setUploadingType] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [pendingUpload, setPendingUpload] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const loadedBid = await apiRequest(`/vendor/bids/${bidId}`);
        const tenderId = loadedBid.tenderId || loadedBid.tender_id;
        const [loadedTender, loadedDocuments] = await Promise.all([
          tenderId ? apiRequest(`/vendor/tenders/${tenderId}`) : Promise.resolve(null),
          apiRequest(`/vendor/bids/${bidId}/documents`),
        ]);
        if (cancelled) return;
        setBid(loadedBid);
        setTender(loadedTender);
        setDocuments(Array.isArray(loadedDocuments) ? loadedDocuments : []);
        setSubmitted(String(loadedBid.status || loadedBid.submissionStatus || "").toUpperCase() === "SUBMITTED");
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to open this bid workspace.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [bidId]);

  const requirements = useMemo(() => {
    if (Array.isArray(tender?.eligibilityRequirements) && tender.eligibilityRequirements.length > 0) {
      return tender.eligibilityRequirements;
    }
    if (Array.isArray(tender?.requirements) && tender.requirements.length > 0) {
      return tender.requirements;
    }
    return [];
  }, [tender]);
  const mandatoryRequirements = useMemo(() => requirements.filter(requirement => requirement.mandatory !== false), [requirements]);
  const uploadedRequired = useMemo(() => mandatoryRequirements.filter(requirement => {
    const index = requirements.indexOf(requirement);
    return Boolean(requirementForDocument(requirement, index, documents));
  }).length, [documents, mandatoryRequirements, requirements]);
  const technicalDocument = documents.find(document => (document.documentType || document.document_type) === "TECHNICAL_BID");
  const completedItems = uploadedRequired + (technicalDocument ? 1 : 0);
  const requiredItemCount = mandatoryRequirements.length + 1;
  const readyToSubmit = uploadedRequired === mandatoryRequirements.length && Boolean(technicalDocument);
  const progress = requiredItemCount ? Math.round((completedItems / requiredItemCount) * 100) : 0;
  const isReadOnly = submitted || ["APPROVED", "REJECTED", "AWARDED"].includes(String(bid?.status || bid?.submissionStatus || "").toUpperCase());

  const openFilePicker = (type, label) => {
    if (isReadOnly) return;
    setUploadError("");
    setUploadSuccess("");
    setPendingUpload({ type, label });
    uploadInput.current?.click();
  };

  const uploadFile = async event => {
    const file = event.target.files?.[0];
    const upload = pendingUpload;
    event.target.value = "";
    if (!file || !upload) return;
    const fileName = (file.name || "").toLowerCase();
    const fileType = (file.type || "").toLowerCase();

    const isPdf = fileType === "application/pdf" || fileName.endsWith(".pdf");
    const isImage = fileType.startsWith("image/") || /\.(png|jpg|jpeg|webp|bmp)$/.test(fileName);

    if (!isPdf && !isImage) {
      setUploadError("Please choose a valid PDF or image file (PDF, PNG, JPG, JPEG).");
      return;
    }
    setUploadingType(upload.type);
    setUploadError("");
    setUploadSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", upload.type);
      const response = await apiRequest(`/vendor/bids/${bidId}/documents`, { method: "POST", body: formData });
      const document = response?.document || response;
      if (document) {
        document.slotType = upload.type;
        document.rawDocumentType = upload.type;
        setDocuments(previous => [
          ...previous.filter(item => {
            const itemType = String(item.documentType || item.document_type || "").toUpperCase();
            const itemSlot = String(item.slotType || item.rawDocumentType || "").toUpperCase();
            const targetType = String(document.documentType || document.document_type || "").toUpperCase();
            const targetSlot = String(upload.type).toUpperCase();
            return itemType !== targetType && itemSlot !== targetSlot;
          }),
          document
        ]);
        setUploadSuccess(`Successfully uploaded '${file.name}' for ${upload.label}!`);
      }
    } catch (err) {
      setUploadError(err.message || `Unable to upload ${upload.label}.`);
    } finally {
      setUploadingType("");
      setPendingUpload(null);
    }
  };

  const removeDocument = async document => {
    if (isReadOnly || !document?.id) return;
    setUploadingType(document.documentType || document.document_type);
    setUploadError("");
    try {
      await apiRequest(`/vendor/bids/${bidId}/documents/${document.id}`, { method: "DELETE" });
      setDocuments(previous => previous.filter(item => item.id !== document.id));
    } catch (err) {
      setUploadError(err.message || "Unable to remove the document.");
    } finally {
      setUploadingType("");
    }
  };

  const submitBid = async () => {
    setSubmitting(true);
    setUploadError("");
    try {
      await apiRequest(`/vendor/bids/${bidId}/submit`, { method: "POST" });
      setSubmitted(true);
      setConfirming(false);
    } catch (err) {
      setUploadError(err.message || "Unable to submit this bid.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <AppShell><main className="vbs-page"><div className="vbs-skeleton vbs-skeleton-head" /><div className="vbs-skeleton vbs-skeleton-main" /></main></AppShell>;
  if (error || !bid) return <AppShell><main className="vbs-page"><section className="vbs-state"><CircleAlert size={25} /><h1>Bid workspace unavailable</h1><p>{error || "We could not open this submission."}</p><Link to="/vendor/bids">Back to my bids</Link></section></main></AppShell>;

  const tenderTitle = tender?.title || tender?.name || bid.tenderTitle || bid.tenderName || "Tender submission";
  const reference = tender?.referenceNumber || tender?.tenderNumber || bid.tenderReference || bid.tenderNumber || bid.bidReference;
  const deadline = tender?.submissionDeadline || tender?.submission_deadline || tender?.deadline;

  return <AppShell>
    <main className="vbs-page">
      <Link to="/vendor/bids" className="vbs-back"><ArrowLeft size={16} /> My bids</Link>
      <header className="vbs-header">
        <div><span className="vbs-eyebrow">Bid submission workspace</span><h1>{tenderTitle}</h1><div className="vbs-reference"><span>{reference}</span><span><FileText size={14} /> {bid.bidReference || "Draft submission"}</span></div></div>
        <div className={`vbs-status ${submitted ? "is-complete" : ""}`}><span>{submitted ? <CheckCircle2 size={17} /> : <FileCheck2 size={17} />}</span><div><small>{submitted ? "Submission complete" : "Draft workspace"}</small><strong>{submitted ? "Bid submitted" : `${completedItems} of ${requiredItemCount} items ready`}</strong></div></div>
      </header>

      {submitted ? <section className="vbs-success"><CheckCircle2 size={22} /><div><strong>Your bid has been submitted</strong><p>Your document package is now with the procurement team for evaluation.</p></div><button onClick={() => navigate("/vendor/bids")}>View my bids <ArrowRight size={15} /></button></section> : <><nav className="vbs-steps" aria-label="Bid submission steps"><span className="is-done"><i><Check size={14} /></i> Review tender</span><span className={completedItems ? "is-active" : ""}><i>2</i> Upload documents</span><span className={technicalDocument ? "is-active" : ""}><i>3</i> Technical bid</span><span className={readyToSubmit ? "is-active" : ""}><i>4</i> Submit</span></nav>

      <section className="vbs-overview">
        <div className="vbs-overview-copy"><span className="vbs-eyebrow">Submission progress</span><h2>Build a complete, review-ready response</h2><p>Upload a PDF for every required criterion, then add your consolidated technical bid before final submission.</p></div>
        <div className="vbs-progress"><div><span>{completedItems} of {requiredItemCount} required items uploaded</span><strong>{progress}%</strong></div><i><b style={{ width: `${progress}%` }} /></i><small>{readyToSubmit ? "Your draft is ready for final review." : `${Math.max(requiredItemCount - completedItems, 0)} item${requiredItemCount - completedItems === 1 ? "" : "s"} still needed.`}</small></div>
        <div className="vbs-deadline"><Clock3 size={18} /><div><span>Submission deadline</span><strong>{dateTimeLabel(deadline)}</strong></div></div>
      </section>

      <section className="vbs-layout">
        <div className="vbs-main-column">
          <section className="vbs-documents-card">
            <div className="vbs-section-head"><div><span className="vbs-eyebrow">Step 1</span><h2>Required documents</h2><p>Each required item needs its own supporting PDF.</p></div><span>{uploadedRequired}/{mandatoryRequirements.length} complete</span></div>
            <div className="vbs-document-list">{requirements.length ? requirements.map((requirement, index) => {
              const type = documentType(requirement, index);
              const document = requirementForDocument(requirement, index, documents);
              const required = requirement.mandatory !== false;
              const isUploading = uploadingType === type;
              return <article className={`vbs-document-row ${document ? "is-uploaded" : ""}`} key={type}><span className="vbs-document-number">{String(index + 1).padStart(2, "0")}</span><div className="vbs-document-copy"><div><h3>{documentTitle(requirement)}</h3><em className={required ? "is-required" : ""}>{required ? "Required" : "Optional"}</em></div><p>{documentDescription(requirement)}</p>{document && <small><CheckCircle2 size={13} /> {document.originalFilename || document.original_filename || "PDF uploaded"}</small>}</div>{document ? <button className="vbs-replace" type="button" disabled={isUploading} onClick={() => openFilePicker(type, documentTitle(requirement))}>{isUploading ? <LoaderCircle className="vbs-spinner" size={15} /> : "Replace"}</button> : <button className="vbs-upload" type="button" disabled={isUploading} onClick={() => openFilePicker(type, documentTitle(requirement))}>{isUploading ? <LoaderCircle className="vbs-spinner" size={15} /> : <Upload size={15} />} Upload PDF</button>} {document && !isReadOnly && <button className="vbs-remove" type="button" aria-label={`Remove ${documentTitle(requirement)}`} onClick={() => removeDocument(document)}><X size={15} /></button>}</article>;
            }) : <div className="vbs-empty"><FileText size={20} /> The detailed requirements are available in the tender notice.</div>}</div>
          </section>

          <section className="vbs-technical-card">
            <div className="vbs-section-head"><div><span className="vbs-eyebrow">Step 2</span><h2>Technical bid</h2><p>Upload one consolidated PDF that explains how your solution meets the tender scope.</p></div><span className={technicalDocument ? "vbs-complete-pill" : ""}>{technicalDocument ? "Uploaded" : "Required"}</span></div>
            <div className={`vbs-technical-dropzone ${technicalDocument ? "is-uploaded" : ""}`}><div className="vbs-tech-icon">{technicalDocument ? <CheckCircle2 size={22} /> : <FileText size={22} />}</div><div><strong>{technicalDocument ? technicalDocument.originalFilename || technicalDocument.original_filename || "Technical bid PDF" : "Technical bid proposal"}</strong><p>{technicalDocument ? "Your technical proposal is attached to this draft." : "PDF only · Include methodology, specifications, and delivery approach."}</p></div>{technicalDocument ? <button type="button" className="vbs-replace" disabled={uploadingType === "TECHNICAL_BID"} onClick={() => openFilePicker("TECHNICAL_BID", "Technical bid proposal")}>{uploadingType === "TECHNICAL_BID" ? <LoaderCircle className="vbs-spinner" size={15} /> : "Replace"}</button> : <button type="button" className="vbs-upload" disabled={uploadingType === "TECHNICAL_BID"} onClick={() => openFilePicker("TECHNICAL_BID", "Technical bid proposal")}>{uploadingType === "TECHNICAL_BID" ? <LoaderCircle className="vbs-spinner" size={15} /> : <Upload size={15} />} Upload technical bid</button>}</div>
          </section>
        </div>

        <aside className="vbs-aside">
          <section className="vbs-tender-card"><span className="vbs-eyebrow">Tender details</span><h2>Keep this nearby</h2><dl><div><dt>Organisation</dt><dd><Landmark size={14} /> {tender?.organization || tender?.department || "See tender notice"}</dd></div><div><dt>Deadline</dt><dd><Clock3 size={14} /> {dateTimeLabel(deadline)}</dd></div><div><dt>Requirements</dt><dd>{requirements.length || "See notice"} documents listed</dd></div></dl>{tender?.sourceDocument?.url && <a href={tender.sourceDocument.url} target="_blank" rel="noopener noreferrer"><FileText size={14} /> View tender notice</a>}</section>
          <section className="vbs-help-card"><LockKeyhole size={18} /><div><strong>Saved to your draft</strong><p>Uploaded documents are stored securely and can be replaced until you submit.</p></div></section>
        </aside>
      </section>

      {uploadSuccess && <div className="vbs-error" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981", borderColor: "rgba(16, 185, 129, 0.25)" }}><CheckCircle2 size={17} /> {uploadSuccess}</div>}
      {uploadError && <div className="vbs-error"><CircleAlert size={17} /> {uploadError}</div>}
      <section className="vbs-submit-bar"><div><span className="vbs-eyebrow">Final step</span><h2>Review and submit</h2><p>{submitted ? "This bid has been submitted to the evaluation portal." : "Your bid package will be sent to the procurement evaluation portal."}</p></div><button type="button" disabled={submitting || submitted} onClick={() => setConfirming(true)}><Send size={16} /> Submit bid <ArrowRight size={15} /></button></section>
      </>}
      <input ref={uploadInput} className="vbs-hidden-input" type="file" accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp" onChange={uploadFile} />

      {confirming && <div className="vbs-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="submit-bid-title"><section className="vbs-modal"><span className="vbs-modal-icon"><Send size={21} /></span><span className="vbs-eyebrow">Final confirmation</span><h2 id="submit-bid-title">Submit this bid package?</h2><p>This will send your uploaded documents to the procurement team. You will not be able to replace files after submission.</p><div><button type="button" onClick={() => setConfirming(false)}>Continue editing</button><button type="button" onClick={submitBid} disabled={submitting}>{submitting ? "Submitting…" : "Confirm submission"}</button></div></section></div>}
    </main>
  </AppShell>;
}
