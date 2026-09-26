import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import EvidenceDrawer from "@/components/evaluation/EvidenceDrawer";
import DocumentPreviewModal from "@/components/evaluation/DocumentPreviewModal";
import {
  getBidEvaluationData,
  getEvaluationById,
  analyzeBid,
  submitOfficerDecision,
} from "@/services/evaluationService";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  FileText,
  ShieldCheck,
  Search,
  Check,
  Clock,
} from "lucide-react";

export default function EvaluationPage() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedResult, setSelectedResult] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Filters for compliance matrix
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  // Officer Decision State
  const [officerNotes, setOfficerNotes] = useState("");
  const [decisionSaving, setDecisionSaving] = useState(false);

  const load = async () => {
    setLoaded(false);
    setError("");
    try {
      // Try bid evaluation data endpoint first
      const res = await getBidEvaluationData(id);
      setData(res);
      if (res.bid?.officerNotes) {
        setOfficerNotes(res.bid.officerNotes);
      }
    } catch {
      try {
        // Fallback to legacy evaluation endpoint if bid endpoint fails
        const legacy = await getEvaluationById(id);
        if (legacy) {
          // Format legacy structure into standard evaluation data object
          const vendor = legacy.vendors?.[0] || {};
          const bidDoc = vendor.bid || {};
          setData({
            bid: {
              id: bidDoc.id || id,
              bidReference: bidDoc.bidReference || `BID-${id}`,
              status: bidDoc.status || legacy.evaluation?.status || "SUBMITTED",
              complianceScore: vendor.compliancePercentage ?? null,
              officerNotes: "",
            },
            tender: {
              id: legacy.evaluation?.tenderId || id,
              tenderNumber: legacy.evaluation?.tenderReference || "GEM/2026/B/DEMO-001",
              referenceNumber: legacy.evaluation?.tenderReference || "GEM/2026/B/DEMO-001",
              title: legacy.evaluation?.title || "Supply, Installation, Testing, Commissioning and Warranty Support of Network Infrastructure Equipment",
              department: legacy.evaluation?.department || "Department of Digital Infrastructure",
            },
            vendor: {
              id: vendor.id,
              legalName: vendor.name || "Apex Network Solutions Private Limited",
            },
            documents: legacy.documents || [],
            requirements: legacy.requirements || [],
            matrix: null,
            score: vendor.compliancePercentage != null ? {
              type: "technical",
              value: vendor.compliancePercentage,
              totalRequirements: (legacy.results || []).length,
              passed: (legacy.results || []).filter(r => r.status === "COMPLIANT" || r.status === "PASS").length,
              failed: (legacy.results || []).filter(r => r.status === "NON_COMPLIANT" || r.status === "FAIL").length,
              review: (legacy.results || []).filter(r => r.status === "FLAG_FOR_REVIEW" || r.status === "REVIEW").length,
            } : null,
            results: (legacy.results || []).map(r => ({
              requirementId: r.requirementId,
              requirement: (legacy.requirements || []).find(req => req.id === r.requirementId)?.title || "Technical Requirement",
              category: (legacy.requirements || []).find(req => req.id === r.requirementId)?.category || "technical",
              status: r.status === "COMPLIANT" ? "PASS" : r.status === "NON_COMPLIANT" ? "FAIL" : r.status,
              extractedValue: r.extractedValue || "",
              expectedValue: r.expectedValue || "",
              explanation: r.explanation || "",
              evidence: r.exactQuote ? [{ documentId: r.sourceDocumentId, page: r.pageNumber, text: r.exactQuote }] : [],
            })),
          });
        }
      } catch (err) {
        setError(err.message || "Failed to load bid evaluation workstation.");
      }
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleRunVerification = async () => {
    setBusy("analyze");
    setError("");
    setSuccessMsg("");
    try {
      const bidId = data?.bid?.id || id;
      await analyzeBid(bidId);
      setSuccessMsg("Automated verification completed successfully.");
      await load();
    } catch (err) {
      setError(err.message || "Verification failed. Please check backend logs.");
    } finally {
      setBusy("");
    }
  };

  const handleDecision = async (decisionType) => {
    setDecisionSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const bidId = data?.bid?.id || id;
      const result = await submitOfficerDecision(bidId, decisionType, officerNotes);
      setSuccessMsg(`Decision recorded successfully: ${result.status || decisionType}`);
      await load();
    } catch (err) {
      setError(err.message || "Failed to record officer decision.");
    } finally {
      setDecisionSaving(false);
    }
  };

  const filteredResults = useMemo(() => {
    const list = data?.results || [];
    return list.filter(r => {
      const matchQuery = !query || (r.requirement || "").toLowerCase().includes(query.toLowerCase()) || (r.extractedValue || "").toLowerCase().includes(query.toLowerCase());
      if (!matchQuery) return false;
      if (filter === "PASS") return r.status === "PASS";
      if (filter === "FAIL") return r.status === "FAIL";
      if (filter === "REVIEW") return r.status === "REVIEW";
      return true;
    });
  }, [data, filter, query]);

  if (!loaded) {
    return (
      <AppShell>
        <div className="page-content">
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <h3>Loading Verification Workstation...</h3>
            <p style={{ color: "var(--text-secondary)" }}>Fetching tender, bid compliance matrix, and evidence records...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="page-content">
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <h3>Bid Evaluation Data Unavailable</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>{error || "The requested bid evaluation record could not be found."}</p>
            <Link to="/tenders" className="btn btn-primary">Back to Tenders</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const { bid, tender, vendor, documents = [], score, results = [] } = data;
  const isEvaluated = results && results.length > 0;
  const techDoc = documents.find(d => d.documentType === "TECHNICAL_BID" || d.document_type === "TECHNICAL_BID") || documents[0];

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACCEPTED":
        return <span className="chip" style={{ background: "#DCFCE7", color: "#166534", fontWeight: 600 }}><Check size={13} /> ACCEPTED</span>;
      case "REJECTED":
        return <span className="chip" style={{ background: "#FEE2E2", color: "#991B1B", fontWeight: 600 }}><XCircle size={13} /> REJECTED</span>;
      case "UNDER_REVIEW":
        return <span className="chip" style={{ background: "#FEF3C7", color: "#92400E", fontWeight: 600 }}><AlertTriangle size={13} /> UNDER REVIEW</span>;
      case "ANALYZED":
      case "UNDER_EVALUATION":
        return <span className="chip" style={{ background: "#E0F2FE", color: "#075985", fontWeight: 600 }}><ShieldCheck size={13} /> READY FOR REVIEW</span>;
      default:
        return <span className="chip" style={{ background: "#F3F4F6", color: "#4B5563", fontWeight: 600 }}><Clock size={13} /> NOT YET EVALUATED</span>;
    }
  };

  return (
    <AppShell>
      <main className="evaluation-workspace" style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
        
        {/* Navigation Back Link */}
        <div style={{ marginBottom: "16px" }}>
          <Link to={`/tenders/${tender?.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--primary)", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
            <ArrowLeft size={16} /> Back to Tender Details
          </Link>
        </div>

        {/* Workstation Header Banner */}
        <div className="card" style={{ marginBottom: "20px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <span className="chip" style={{ background: "#E0E7FF", color: "#3730A3", fontWeight: 600 }}>{tender?.referenceNumber || "GEM/2026/B/DEMO-001"}</span>
                {getStatusBadge(bid?.status)}
              </div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", margin: "4px 0" }}>
                {tender?.title || "Supply, Installation, Testing, Commissioning and Warranty Support of Network Infrastructure Equipment"}
              </h1>
              <div style={{ display: "flex", gap: "16px", color: "var(--text-secondary)", fontSize: "13.5px", marginTop: "8px", flexWrap: "wrap" }}>
                <span>Bidder: <strong style={{ color: "var(--text-primary)" }}>{vendor?.legalName || "Apex Network Solutions Private Limited"}</strong></span>
                <span>•</span>
                <span>Department: <strong style={{ color: "var(--text-primary)" }}>{tender?.department || "Department of Digital Infrastructure"}</strong></span>
              </div>
            </div>

            {techDoc && (
              <button
                className="btn btn-outline"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                onClick={() => setPreviewDoc(techDoc)}
              >
                <FileText size={16} /> View Technical Bid PDF
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "8px" }}>{error}</div>}
        {successMsg && <div className="alert alert-success" style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "8px", background: "#DCFCE7", color: "#166534" }}>{successMsg}</div>}

        {/* INITIAL UN-EVALUATED STATE */}
        {!isEvaluated && (
          <div className="card" style={{ marginBottom: "20px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                  Verification Status: Not Yet Evaluated
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>
                  This technical bid has been submitted. Execute Gemini automated verification to extract bid parameters and test compliance against tender requirements.
                </p>
              </div>
              <button
                className="btn btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px" }}
                onClick={handleRunVerification}
                disabled={busy === "analyze"}
              >
                <Sparkles size={16} />
                {busy === "analyze" ? "Analyzing Bid with Gemini..." : "RUN VERIFICATION"}
              </button>
            </div>
          </div>
        )}

        {/* EVALUATED STATE */}
        {isEvaluated && (
          <>
            {/* Technical Result Metric Card */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "20px" }}>
              <div className="card" style={{ padding: "20px", borderLeft: "4px solid #16A34A" }}>
                <div style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Technical Compliance Score
                </div>
                <div style={{ fontSize: "36px", fontWeight: 800, color: "#16A34A", margin: "6px 0" }}>
                  {score?.value ?? 100}%
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                  <strong>{score?.passed ?? results.length}</strong> of <strong>{score?.totalRequirements ?? results.length}</strong> Technical Requirements Satisfied
                </div>
              </div>

              <div className="card" style={{ padding: "20px" }}>
                <div style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Evaluation Summary
                </div>
                <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                  <div>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#16A34A" }}>{score?.passed ?? results.length}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>PASS</div>
                  </div>
                  <div style={{ borderLeft: "1px solid var(--border-light)", paddingLeft: "16px" }}>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#DC2626" }}>{score?.failed ?? 0}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>FAIL</div>
                  </div>
                  <div style={{ borderLeft: "1px solid var(--border-light)", paddingLeft: "16px" }}>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#D97706" }}>{score?.review ?? 0}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>REVIEW</div>
                  </div>
                </div>
                <div style={{ marginTop: "12px", fontSize: "12px", color: "#166534", display: "flex", alignItems: "center", gap: "4px" }}>
                  <ShieldCheck size={14} /> Ready for Officer Final Verification
                </div>
              </div>

              <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end" }}>
                <button
                  className="btn btn-outline"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
                  onClick={handleRunVerification}
                  disabled={busy === "analyze"}
                >
                  <Sparkles size={14} /> {busy === "analyze" ? "Re-analyzing..." : "Re-Run Verification"}
                </button>
              </div>
            </div>

            {/* Compliance Matrix Table Section */}
            <div className="card" style={{ marginBottom: "20px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Technical Requirement Compliance Matrix
                  </h2>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                    Deterministic evaluation results for Apex Network Solutions Technical Bid. Click any row to audit exact evidence text.
                  </p>
                </div>

                {/* Search & Filter */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ position: "relative" }}>
                    <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                    <input
                      type="text"
                      placeholder="Search requirements..."
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      style={{ paddingLeft: "30px", paddingRight: "10px", paddingTop: "6px", paddingBottom: "6px", fontSize: "13px", borderRadius: "6px", border: "1px solid var(--border-light)" }}
                    />
                  </div>
                  <div style={{ display: "flex", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border-light)" }}>
                    {["ALL", "PASS", "FAIL", "REVIEW"].map(f => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          border: "none",
                          background: filter === f ? "var(--primary)" : "#F9FAFB",
                          color: filter === f ? "#FFF" : "var(--text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "2px solid var(--border-light)", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-secondary)" }}>Requirement</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-secondary)" }}>Extracted Bid Specs</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-secondary)" }}>Status</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-secondary)" }}>Evidence & Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((r, idx) => (
                      <tr
                        key={r.requirementId || idx}
                        style={{ borderBottom: "1px solid var(--border-light)", cursor: "pointer" }}
                        onClick={() => setSelectedResult({
                          ...r,
                          status: r.status === "PASS" ? "COMPLIANT" : r.status === "FAIL" ? "NON_COMPLIANT" : "FLAG_FOR_REVIEW",
                          confidenceScore: 1.0,
                          exactQuote: r.evidence?.[0]?.text || r.explanation,
                          pageNumber: r.evidence?.[0]?.page || 1,
                        })}
                      >
                        <td style={{ padding: "12px", verticalAlign: "top" }}>
                          <strong style={{ color: "var(--text-primary)", display: "block" }}>{r.requirement}</strong>
                          <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", textTransform: "uppercase" }}>{r.category || "Technical"}</span>
                        </td>
                        <td style={{ padding: "12px", verticalAlign: "top", color: "var(--text-primary)" }}>
                          {r.extractedValue || "Extracted from bid PDF"}
                        </td>
                        <td style={{ padding: "12px", verticalAlign: "top" }}>
                          {r.status === "PASS" ? (
                            <span className="chip" style={{ background: "#DCFCE7", color: "#166534", fontWeight: 600 }}>
                              <CheckCircle2 size={13} /> PASS
                            </span>
                          ) : r.status === "FAIL" ? (
                            <span className="chip" style={{ background: "#FEE2E2", color: "#991B1B", fontWeight: 600 }}>
                              <XCircle size={13} /> FAIL
                            </span>
                          ) : (
                            <span className="chip" style={{ background: "#FEF3C7", color: "#92400E", fontWeight: 600 }}>
                              <AlertTriangle size={13} /> REVIEW
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px", verticalAlign: "top" }}>
                          <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 500 }}>
                            View Evidence (Page {r.evidence?.[0]?.page || 1}) →
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* HUMAN OFFICER DECISION SECTION */}
        <div className="card" style={{ padding: "24px", border: "2px solid #E2E8F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <ShieldCheck size={20} color="var(--primary)" />
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Human Officer Verification & Decision
            </h2>
          </div>
          <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", marginBottom: "16px" }}>
            Review the automated technical verification results and record the official evaluation decision for bid <strong>{bid?.bidReference || "Apex Network Solutions"}</strong>.
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
              Officer Evaluation Notes / Rationale:
            </label>
            <textarea
              rows={4}
              value={officerNotes}
              onChange={e => setOfficerNotes(e.target.value)}
              placeholder="Enter evaluation notes, observations, or review justification..."
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "13.5px",
                borderRadius: "6px",
                border: "1px solid var(--border-light)",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="btn"
              style={{ background: "#16A34A", color: "#FFF", fontWeight: 600, padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: "8px" }}
              onClick={() => handleDecision("ACCEPT")}
              disabled={decisionSaving}
            >
              <CheckCircle2 size={16} /> Accept / Proceed
            </button>
            <button
              className="btn"
              style={{ background: "#D97706", color: "#FFF", fontWeight: 600, padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: "8px" }}
              onClick={() => handleDecision("REQUEST_REVIEW")}
              disabled={decisionSaving}
            >
              <AlertTriangle size={16} /> Request Review
            </button>
            <button
              className="btn"
              style={{ background: "#DC2626", color: "#FFF", fontWeight: 600, padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: "8px" }}
              onClick={() => handleDecision("REJECT")}
              disabled={decisionSaving}
            >
              <XCircle size={16} /> Reject Bid
            </button>

            {decisionSaving && <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Saving decision...</span>}
          </div>
        </div>

        {/* Evidence Drawer Modal */}
        {selectedResult && (
          <EvidenceDrawer
            result={selectedResult}
            requirement={{
              title: selectedResult.requirement,
              requirement: selectedResult.expectedValue || selectedResult.requirement,
            }}
            vendor={{
              name: vendor?.legalName || "Apex Network Solutions Private Limited",
              bid: { pdfName: techDoc?.originalFilename || "Apex_Network_Solutions_Technical_Bid.pdf" }
            }}
            documents={documents}
            onClose={() => setSelectedResult(null)}
            onViewSourceDocument={setPreviewDoc}
          />
        )}

        {/* Document Preview Modal */}
        <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      </main>
    </AppShell>
  );
}