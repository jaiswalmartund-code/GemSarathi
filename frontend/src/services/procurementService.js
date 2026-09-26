import { apiRequest } from "@/services/apiClient";

const normaliseTender = tender => tender ? ({ ...tender, name: tender.name || tender.title, tenderRef: tender.tenderRef || tender.reference_number, deadline: tender.deadline || tender.submission_deadline }) : tender;
export const listTenders = async () => (await apiRequest("/tenders")).map(normaliseTender);
export const getTender = async id => normaliseTender(await apiRequest(`/tenders/${id}`));
export const createTender = payload => apiRequest("/tenders", { method: "POST", body: JSON.stringify(payload) });
export const listVendors = () => apiRequest("/vendors");
export const getVendor = id => apiRequest(`/vendors/${id}`);
export const getContract = id => apiRequest(`/awards/${id}`);
export const assignContract = (evaluationId, vendorId, tenderId) => apiRequest(`/awards`, {
  method: "POST",
  body: JSON.stringify({ evaluation_id: evaluationId, vendor_id: vendorId, tender_id: tenderId }),
});
