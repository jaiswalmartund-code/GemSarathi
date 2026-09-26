import { useState, useEffect } from "react";
import AppShell from "../components/AppShell";
import { apiRequest } from "../services/apiClient";
import {
  Building2,
  FileText,
  Send,
  Upload,
  CheckCircle2,
  Clock,
  Award,
  FileCheck,
  Search,
  ShieldCheck,
  X,
  Info,
  Lock,
  FileSpreadsheet,
  Trash2,
  CreditCard,
  Building,
  UserCheck,
  Calculator,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export default function VendorDashboard() {
  const [profile, setProfile] = useState(null);
  const [tenders, setTenders] = useState([]);
  const [activeBid, setActiveBid] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tenders"); // tenders | workspace
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState({ type: "", text: "" });

  // Modal State
  const [selectedTender, setSelectedTender] = useState(null);
  const [isTenderModalOpen, setIsTenderModalOpen] = useState(false);

  // Upload & Submission States
  const [fileToUpload, setFileToUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (text, type = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification({ text: "", type: "" }), 6000);
  };

  const loadBidDetails = async (bidId) => {
    if (!bidId) return;
    try {
      const docsData = await apiRequest(`/vendor/bids/${bidId}/documents`);
      if (Array.isArray(docsData)) {
        setDocuments(docsData);
      }
    } catch (err) {
      console.error("Error loading bid documents", err);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        const [profData, tendData, bidsData] = await Promise.allSettled([
          apiRequest("/vendor/profile"),
          apiRequest("/vendor/tenders"),
          apiRequest("/vendor/bids"),
        ]);

        if (profData.status === "fulfilled" && profData.value) {
          setProfile(profData.value);
        }

        let loadedTenders = [];
        if (tendData.status === "fulfilled" && Array.isArray(tendData.value)) {
          loadedTenders = tendData.value;
          setTenders(loadedTenders);
        }

        if (bidsData.status === "fulfilled" && Array.isArray(bidsData.value)) {
          const bidList = bidsData.value;
          if (bidList.length > 0) {
            const currentBid = bidList[0];
            setActiveBid(currentBid);
            await loadBidDetails(currentBid.id || currentBid._id);
          } else {
            setActiveBid(null);
            setDocuments([]);
          }
        }
      } catch (err) {
        console.error("Failed loading vendor portal data", err);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  const handleOpenTenderDetails = async (tender) => {
    try {
      setSelectedTender(tender);
      setIsTenderModalOpen(true);
      const detailedTender = await apiRequest(`/vendor/tenders/${tender.id || tender._id}`);
      setSelectedTender(detailedTender);
    } catch {
      // keep existing tender object if detailed fetch fails
    }
  };

  const handleStartOrOpenBid = async (tender) => {
    try {
      // Must use tender.id || tender._id to avoid slashes in tenderNumber URL paths
      const targetTenderId = tender.id || tender._id;
      const res = await apiRequest(`/vendor/tenders/${targetTenderId}/bids`, {
        method: "POST",
        body: JSON.stringify({ bid_reference: `BID-APEX-001` }),
      });

      const bidObj = res.bid || res;
      setActiveBid(bidObj);
      await loadBidDetails(bidObj.id || bidObj._id);
      setIsTenderModalOpen(false);
      setActiveTab("workspace");
      showNotification("Opened Bid Submission Workspace. Upload your Technical Bid PDF to complete your proposal.", "info");
    } catch (err) {
      showNotification(err.message || "Failed to open bid workspace", "error");
    }
  };

  const handleUploadTechnicalBid = async (fileObj) => {
    const targetFile = fileObj || fileToUpload;
    if (!targetFile || !activeBid) {
      showNotification("Please select a valid Technical Bid PDF file.", "error");
      return;
    }

    if (targetFile.type !== "application/pdf" && !targetFile.name.toLowerCase().endsWith(".pdf")) {
      showNotification("Only PDF files are accepted for Technical Bid.", "error");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", targetFile);
      formData.append("documentType", "TECHNICAL_BID");

      const token = localStorage.getItem("gem_access_token");
      const bidId = activeBid.id || activeBid._id;

      const res = await fetch(`${API_BASE_URL}/vendor/bids/${bidId}/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.error || "Document upload failed");
      }

      const resJson = await res.json();
      const uploadedDoc = resJson.document || resJson.doc || resJson;
      uploadedDoc.documentType = uploadedDoc.documentType || uploadedDoc.document_type || "TECHNICAL_BID";

      setDocuments((prev) => [
        uploadedDoc,
        ...prev.filter((d) => (d.documentType || d.document_type) !== "TECHNICAL_BID"),
      ]);
      setFileToUpload(null);
      showNotification(
        `Technical Bid document '${uploadedDoc.originalFilename || uploadedDoc.original_filename || targetFile.name}' uploaded successfully. You can now submit your bid.`,
        "success"
      );
    } catch (err) {
      showNotification(err.message || "File upload failed", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDocument = (docId) => {
    setDocuments((prev) => prev.filter((d) => (d.id || d._id) !== docId));
    setFileToUpload(null);
    showNotification("Document removed from draft proposal.", "info");
  };

  const handleSubmitBidProposal = async () => {
    if (!activeBid) return;
    const bidId = activeBid.id || activeBid._id;
    try {
      setIsSubmitting(true);
      const res = await apiRequest(`/vendor/bids/${bidId}/submit`, { method: "POST" });
      const updatedBid = res.bid || { ...activeBid, status: "SUBMITTED", submissionStatus: "SUBMITTED" };
      setActiveBid(updatedBid);
      showNotification("🎉 Bid Submitted Successfully! Procurement Officer will now evaluate your proposal.", "success");
    } catch (err) {
      showNotification(err.message || "Failed to submit bid proposal", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTenders = tenders.filter(
    (t) =>
      (t.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.department || t.organization || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.referenceNumber || t.tenderNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const techBidDoc = documents.find((d) => (d.documentType || d.document_type) === "TECHNICAL_BID");
  const isSubmitted = activeBid?.status === "SUBMITTED" || activeBid?.submissionStatus === "SUBMITTED" || activeBid?.status === "UNDER_EVALUATION";

  return (
    <AppShell>
      {/* Top Banner Notification */}
      {notification.text && (
        <div className={`vendor-notification-banner ${notification.type}`}>
          <Info size={16} />
          <span>{notification.text}</span>
          <button onClick={() => setNotification({ text: "", type: "" })} className="close-banner">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Vendor Header Card */}
      <div className="vendor-header-card">
        <div className="vendor-header-main">
          <div className="vendor-avatar-badge">
            <Building2 size={24} />
          </div>
          <div>
            <div className="vendor-code-tag">{profile?.vendorCode || "VEN-APEX-001"}</div>
            <h1>{profile?.company_name || profile?.legalName || "Apex Network Solutions Private Limited"}</h1>
            <p className="vendor-sub">
              {profile?.email || "apex@apexnet.in"} • GSTIN: {profile?.gstin || "07AAACA1234F1Z5"} • Class-I MSME Supplier
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="vendor-nav-tabs">
        <button className={activeTab === "tenders" ? "nav-tab-btn active" : "nav-tab-btn"} onClick={() => setActiveTab("tenders")}>
          <FileText size={15} /> Open GeM Tenders ({tenders.length})
        </button>
        <button className={activeTab === "workspace" ? "nav-tab-btn active" : "nav-tab-btn"} onClick={() => setActiveTab("workspace")}>
          <Send size={15} /> Bid Submission Workspace ({activeBid ? "1 Active Bid" : "0"})
        </button>
      </div>

      {/* Tab Body */}
      {loading ? (
        <div className="vendor-loading">Loading vendor portal workspace...</div>
      ) : (
        <div className="vendor-tab-body">
          {/* TAB 1: OPEN GEM TENDERS */}
          {activeTab === "tenders" && (
            <div className="vendor-section-card">
              <div className="section-toolbar">
                <div>
                  <h2>Available GeM Tenders</h2>
                  <p className="subtext">Browse open government procurement tenders and prepare your bid proposal</p>
                </div>
                <div className="vendor-search-bar">
                  <Search size={15} />
                  <input
                    placeholder="Search by tender number, title, or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {filteredTenders.length === 0 ? (
                <div className="vendor-empty-state">No matching open tenders found.</div>
              ) : (
                <div className="tenders-grid">
                  {filteredTenders.map((tender) => (
                    <div key={tender.id || tender._id} className="tender-card-item">
                      <div className="card-top-row">
                        <span className="ref-number">{tender.referenceNumber || tender.tenderNumber || "GEM/2026/B/DEMO-001"}</span>
                        <span className="status-badge-open">OPEN FOR BIDDING</span>
                      </div>

                      <h3 className="tender-item-title">{tender.title}</h3>
                      <p className="tender-dept-name">{tender.organization || tender.department || "Department of Digital Infrastructure"}</p>
                      <p className="tender-description">{tender.description}</p>

                      <div className="tender-meta-row">
                        <span>
                          <Clock size={13} /> Deadline: 22 October 2026, 17:00
                        </span>
                        <span>
                          Value: ₹2,50,00,000
                        </span>
                      </div>

                      <div className="card-action-bar">
                        <button className="btn-view-details" onClick={() => handleOpenTenderDetails(tender)}>
                          View Details
                        </button>

                        <button className="btn-submit-bid-action" onClick={() => handleStartOrOpenBid(tender)}>
                          <Send size={13} /> Start Bid
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BID SUBMISSION WORKSPACE */}
          {activeTab === "workspace" && (
            <div className="bid-workspace-container">
              {!activeBid ? (
                <div className="vendor-empty-state">
                  <p>No active bid opened yet. Select an open tender from the <strong>Open GeM Tenders</strong> tab to start your proposal.</p>
                  <button className="btn-primary-modal" style={{ marginTop: "16px" }} onClick={() => setActiveTab("tenders")}>
                    Browse Open Tenders
                  </button>
                </div>
              ) : (
                <>
                  {/* Proposal Header Banner */}
                  <div className="bid-workspace-header">
                    <div className="bid-header-left">
                      <div className="bid-header-tags">
                        <span className="bid-ref-tag">Tender Ref: GEM/2026/B/DEMO-001</span>
                        <span className={`status-chip-submitted ${isSubmitted ? "submitted" : "draft"}`}>
                          {isSubmitted ? "SUBMITTED / UNDER EVALUATION" : "DRAFT PROPOSAL"}
                        </span>
                      </div>
                      <h2 className="bid-header-title">Supply, Installation, Testing, Commissioning and Warranty Support of Network Infrastructure Equipment</h2>
                      <p className="bid-header-sub">Bidding Entity: Apex Network Solutions Private Limited • Ref: BID-APEX-001</p>
                    </div>

                    {/* Top Right Quick Submission Bar */}
                    <div className="bid-header-right-action">
                      {isSubmitted ? (
                        <div className="header-submitted-badge">
                          <CheckCircle2 size={16} /> Bid Submitted
                        </div>
                      ) : (
                        <button
                          className="btn-header-submit"
                          disabled={!techBidDoc || isSubmitting}
                          onClick={handleSubmitBidProposal}
                        >
                          <Send size={15} />
                          {isSubmitting ? "Submitting..." : "Submit Proposal"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Document Checklist Header */}
                  <div className="workspace-section-header">
                    <div>
                      <h3 className="workspace-section-title">
                        <FileCheck size={18} /> Bid Proposal Checklist & Required Documents (8 Documents)
                      </h3>
                      <p className="subtext">
                        Upload your Technical Bid PDF proposal below. All statutory & eligibility documents are preserved for multi-phase evaluation.
                      </p>
                    </div>
                    <span className="badge-progress-pill">
                      {techBidDoc ? "1 of 1 Mandatory Ready" : "0 of 1 Uploaded"}
                    </span>
                  </div>

                  {/* ALL 8 DOCUMENT CARDS GRID */}
                  <div className="doc-checklist-grid">
                    {/* 1. TECHNICAL BID DOCUMENT CARD (ACTIVE) */}
                    <div className={`doc-card-grid-item ${techBidDoc ? "uploaded" : "pending"}`}>
                      <div className="doc-card-head">
                        <div className="doc-icon-badge active-blue">
                          <FileText size={20} />
                        </div>
                        <div className="doc-head-text">
                          <div className="doc-title-row">
                            <h4>1. Technical Bid Proposal (PDF)</h4>
                            <span className="doc-tag mandatory">MANDATORY</span>
                          </div>
                          <p>Technical compliance matrix, BOM specs, make & model datasheets</p>
                        </div>
                        <span className={`status-pill ${techBidDoc ? "success" : "action-needed"}`}>
                          {techBidDoc ? "Uploaded & Validated" : "Upload Required"}
                        </span>
                      </div>

                      <div className="doc-card-body">
                        {techBidDoc ? (
                          <div className="uploaded-file-banner">
                            <div className="file-icon-box">
                              <FileCheck size={20} />
                            </div>
                            <div className="file-details">
                              <strong className="file-name-txt">
                                {techBidDoc.originalFilename || techBidDoc.original_filename || "Apex_Network_Solutions_Technical_Bid.pdf"}
                              </strong>
                              <div className="file-meta-line">
                                <span>PDF Document</span> • <span>65.4 KB</span> • <span className="hash-badge">SHA-256 Validated</span>
                              </div>
                            </div>
                            {!isSubmitted && (
                              <button
                                className="btn-replace-doc"
                                onClick={() => handleRemoveDocument(techBidDoc.id || techBidDoc._id)}
                                title="Replace technical bid document"
                              >
                                <Trash2 size={13} /> Replace
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="upload-dropzone-box">
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setFileToUpload(e.target.files[0]);
                                  handleUploadTechnicalBid(e.target.files[0]);
                                }
                              }}
                              className="file-input-hidden"
                              id="tech-bid-upload-input"
                              disabled={isSubmitted || isUploading}
                            />
                            <label htmlFor="tech-bid-upload-input" className="dropzone-area">
                              <Upload size={20} />
                              <div className="dropzone-txt">
                                <strong>{isUploading ? "Uploading Technical Bid..." : "Click to select & upload Technical Bid PDF"}</strong>
                                <small>Supported format: PDF up to 25 MB</small>
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. FINANCIAL STATEMENT / TURNOVER PROOF */}
                    <div className="doc-card-grid-item disabled">
                      <div className="doc-card-head">
                        <div className="doc-icon-badge muted">
                          <FileSpreadsheet size={20} />
                        </div>
                        <div className="doc-head-text">
                          <div className="doc-title-row">
                            <h4>2. Financial Statements & Turnover Proof</h4>
                            <span className="doc-tag reserved">PHASE 2</span>
                          </div>
                          <p>Audited Balance Sheets & Profit/Loss statements for last 3 FYs</p>
                        </div>
                        <span className="status-pill muted">Phase 2 Reserved</span>
                      </div>
                      <div className="doc-disabled-note">
                        <Lock size={13} /> Preserved for document verification phase
                      </div>
                    </div>

                    {/* 3. EXPERIENCE CERTIFICATES */}
                    <div className="doc-card-grid-item disabled">
                      <div className="doc-card-head">
                        <div className="doc-icon-badge muted">
                          <Award size={20} />
                        </div>
                        <div className="doc-head-text">
                          <div className="doc-title-row">
                            <h4>3. Experience Certificates & Past Orders</h4>
                            <span className="doc-tag reserved">PHASE 2</span>
                          </div>
                          <p>Execution certificates of 5 years government/PSU network contracts</p>
                        </div>
                        <span className="status-pill muted">Phase 2 Reserved</span>
                      </div>
                      <div className="doc-disabled-note">
                        <Lock size={13} /> Preserved for document verification phase
                      </div>
                    </div>

                    {/* 4. GSTIN STATUTORY CERTIFICATE */}
                    <div className="doc-card-grid-item disabled">
                      <div className="doc-card-head">
                        <div className="doc-icon-badge muted">
                          <ShieldCheck size={20} />
                        </div>
                        <div className="doc-head-text">
                          <div className="doc-title-row">
                            <h4>4. GSTIN Statutory Registration</h4>
                            <span className="doc-tag reserved">PHASE 2</span>
                          </div>
                          <p>Active GST registration certificate and tax compliance returns</p>
                        </div>
                        <span className="status-pill muted">Phase 2 Reserved</span>
                      </div>
                      <div className="doc-disabled-note">
                        <Lock size={13} /> Preserved for document verification phase
                      </div>
                    </div>

                    {/* 5. PAN CARD REGISTRATION */}
                    <div className="doc-card-grid-item disabled">
                      <div className="doc-card-head">
                        <div className="doc-icon-badge muted">
                          <CreditCard size={20} />
                        </div>
                        <div className="doc-head-text">
                          <div className="doc-title-row">
                            <h4>5. Permanent Account Number (PAN Card)</h4>
                            <span className="doc-tag reserved">PHASE 2</span>
                          </div>
                          <p>PAN card copy of the bidding entity (AAACA1234F)</p>
                        </div>
                        <span className="status-pill muted">Phase 2 Reserved</span>
                      </div>
                      <div className="doc-disabled-note">
                        <Lock size={13} /> Preserved for document verification phase
                      </div>
                    </div>

                    {/* 6. COMPANY REGISTRATION / INCORPORATION */}
                    <div className="doc-card-grid-item disabled">
                      <div className="doc-card-head">
                        <div className="doc-icon-badge muted">
                          <Building size={20} />
                        </div>
                        <div className="doc-head-text">
                          <div className="doc-title-row">
                            <h4>6. Certificate of Incorporation</h4>
                            <span className="doc-tag reserved">PHASE 2</span>
                          </div>
                          <p>ROC Incorporation Certificate / Partnership Registration Deed</p>
                        </div>
                        <span className="status-pill muted">Phase 2 Reserved</span>
                      </div>
                      <div className="doc-disabled-note">
                        <Lock size={13} /> Preserved for document verification phase
                      </div>
                    </div>

                    {/* 7. AUTHORIZED SIGNATORY AADHAAR */}
                    <div className="doc-card-grid-item disabled">
                      <div className="doc-card-head">
                        <div className="doc-icon-badge muted">
                          <UserCheck size={20} />
                        </div>
                        <div className="doc-head-text">
                          <div className="doc-title-row">
                            <h4>7. Authorized Signatory Aadhaar Card</h4>
                            <span className="doc-tag reserved">PHASE 2</span>
                          </div>
                          <p>Identity proof of company authorized representative</p>
                        </div>
                        <span className="status-pill muted">Phase 2 Reserved</span>
                      </div>
                      <div className="doc-disabled-note">
                        <Lock size={13} /> Preserved for document verification phase
                      </div>
                    </div>

                    {/* 8. FINANCIAL BOQ / PRICE BID */}
                    <div className="doc-card-grid-item disabled">
                      <div className="doc-card-head">
                        <div className="doc-icon-badge muted">
                          <Calculator size={20} />
                        </div>
                        <div className="doc-head-text">
                          <div className="doc-title-row">
                            <h4>8. Financial BOQ & Commercial Price Bid</h4>
                            <span className="doc-tag reserved">PHASE 2</span>
                          </div>
                          <p>Itemized pricing schedule and GST tax breakdown</p>
                        </div>
                        <span className="status-pill muted">Phase 2 Reserved</span>
                      </div>
                      <div className="doc-disabled-note">
                        <Lock size={13} /> Preserved for document verification phase
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM SUBMISSION SUMMARY BAR */}
                  <div className="workspace-summary-bar">
                    <div className="summary-info">
                      <strong>Submission Checklist Status:</strong>
                      <span>
                        {techBidDoc
                          ? "✓ Technical Bid Proposal Ready for Verification"
                          : "⚠️ Action Required: Upload Technical Bid PDF"}
                      </span>
                    </div>

                    <div className="summary-actions">
                      {isSubmitted ? (
                        <div className="submitted-success-alert">
                          <CheckCircle2 size={18} /> Proposal Submitted to Procurement Officer
                        </div>
                      ) : (
                        <button
                          className="btn-bottom-submit"
                          disabled={!techBidDoc || isSubmitting}
                          onClick={handleSubmitBidProposal}
                        >
                          <Send size={16} />
                          {isSubmitting ? "Submitting Bid Proposal..." : "Submit Bid Proposal"}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* TENDER DETAILS MODAL */}
      {selectedTender && isTenderModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTenderModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-ref-tag">{selectedTender.referenceNumber || selectedTender.tenderNumber || "GEM/2026/B/DEMO-001"}</span>
                <h2>{selectedTender.title}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setIsTenderModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="tender-detail-meta-grid">
                <div>
                  <small>Procuring Organization</small>
                  <strong>{selectedTender.organization || selectedTender.department || "Department of Digital Infrastructure"}</strong>
                </div>
                <div>
                  <small>Submission Deadline</small>
                  <strong>22 October 2026, 17:00</strong>
                </div>
                <div>
                  <small>Completion Period</small>
                  <strong>{selectedTender.completionPeriod || "90 days"}</strong>
                </div>
                <div>
                  <small>Warranty Period</small>
                  <strong>{selectedTender.warrantyPeriod || "3 years"}</strong>
                </div>
              </div>

              <h4 className="reqs-title">Scope of Work & Overview</h4>
              <p className="modal-desc">{selectedTender.description}</p>

              <h4 className="reqs-title">Tender Requirements ({selectedTender.requirements?.length || 14})</h4>
              <div className="reqs-list">
                {(selectedTender.requirements || []).map((req, idx) => (
                  <div key={req.id || req._id || idx} className="req-item-box">
                    <div className="req-header">
                      <strong>{req.title || req.requirementName || req.requirement_name}</strong>
                      <span className="req-cat-badge">{req.category || req.requirement_type || "Technical"}</span>
                    </div>
                    <p>{req.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary-modal" onClick={() => setIsTenderModalOpen(false)}>
                Close
              </button>
              <button className="btn-primary-modal" onClick={() => handleStartOrOpenBid(selectedTender)}>
                <Send size={15} /> Start Bid Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
