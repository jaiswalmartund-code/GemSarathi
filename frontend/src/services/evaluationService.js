import { apiRequest } from "@/services/apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const getEvaluationById = id => apiRequest(`/evaluations/${id}`);
export const getBidEvaluationData = bidId => apiRequest(`/bids/${bidId}/evaluation-data`);
export const analyzeBid = bidId => apiRequest(`/bids/${bidId}/analyze`, { method: "POST" });
export const submitOfficerDecision = (bidId, decision, notes) => apiRequest(`/bids/${bidId}/decision`, {
  method: "PATCH",
  body: JSON.stringify({ decision, notes }),
});
export const completeEvaluation = id => apiRequest(`/evaluations/${id}/complete`, { method: "POST" });
export const createEvaluation = tenderId => apiRequest("/evaluations", { method: "POST", body: JSON.stringify({ tender_id: tenderId }) });
export const runAiAnalysis = evaluationId => apiRequest(`/ai/evaluations/${evaluationId}/analyze`, { method: "POST" });
export const getAiStatus = evaluationId => apiRequest(`/ai/evaluations/${evaluationId}/status`);
export const resolveComplianceResult = (resultId, status, reviewComment) => apiRequest(`/compliance/${resultId}`, {
  method: "PATCH",
  body: JSON.stringify({ status, review_comment: reviewComment }),
});

// CSV download needs the auth header, so we fetch as blob.
export async function downloadReportCsv(evaluationId) {
  const token = window.localStorage.getItem("gem_access_token");
  const response = await fetch(`${API_BASE_URL}/evaluations/${evaluationId}/report.csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Report download failed");
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `evaluation-${evaluationId}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// Vendor/bid documents (tender notices, bid submissions) are only served
// with an auth header, so fetch as a blob. Used by DocumentPreviewModal to
// render PDFs/images inline instead of forcing a browser download.
export async function fetchDocumentBlob(documentId) {
  const token = window.localStorage.getItem("gem_access_token");
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Document could not be loaded");
  return response.blob();
}