// Mock GSTIN (Goods & Services Tax) Registry Provider
// Returns reference GSTIN registration data from the GSTN Portal snapshot.

const GSTN_REGISTRY = {
  "07AAACA1234F1Z5": {
    gstin: "07AAACA1234F1Z5",
    legalName: "Apex Network Solutions Private Limited",
    tradeName: "Apex Network Solutions",
    status: "ACTIVE",
    taxpayerType: "Regular",
    stateJurisdiction: "State - Haryana",
    returnsFiledTill: "Aug-2026",
    filingUpToDate: true
  },
  "07AAAAA0000A1Z5": {
    gstin: "07AAAAA0000A1Z5",
    legalName: "Apex Network Solutions Private Limited",
    tradeName: "Apex Network Solutions",
    status: "ACTIVE",
    taxpayerType: "Regular",
    stateJurisdiction: "State - Delhi",
    returnsFiledTill: "Aug-2026",
    filingUpToDate: true
  },
  "27BBBBB1111B2Z6": {
    gstin: "27BBBBB1111B2Z6",
    legalName: "Brightline Technologies LLP",
    tradeName: "Brightline Tech",
    status: "SUSPENDED",
    taxpayerType: "Regular",
    stateJurisdiction: "State - Maharashtra",
    returnsFiledTill: "Mar-2026",
    filingUpToDate: false
  },
  "29CCCCC2222C3Z7": {
    gstin: "29CCCCC2222C3Z7",
    legalName: "Shady Traders Co",
    tradeName: "Shady Traders",
    status: "CANCELLED",
    taxpayerType: "Regular",
    stateJurisdiction: "State - Karnataka",
    returnsFiledTill: "Mar-2024",
    filingUpToDate: false
  }
};

export class MockGstProvider {
  async verify(gstinIdentifier) {
    const normGst = (gstinIdentifier || "").toString().trim().toUpperCase();
    if (!normGst) return null;
    const record = GSTN_REGISTRY[normGst];
    if (record) return { ...record };
    return {
      gstin: normGst,
      legalName: "Registered Entity",
      tradeName: "Registered Entity",
      status: "ACTIVE",
      taxpayerType: "Regular",
      stateJurisdiction: "State",
      returnsFiledTill: "Aug-2026",
      filingUpToDate: true
    };
  }
}

export const gstProvider = new MockGstProvider();

export async function verifyGstInRegistry(gstin) {
  const data = await gstProvider.verify(gstin);
  if (!data) return { status: "not_found", detail: "No GSTIN found in bid documents or vendor profile.", evidence: null };
  if (data.status === "ACTIVE" && data.filingUpToDate) {
    return { status: "verified", detail: `GSTIN ${data.gstin} active; returns filed till ${data.returnsFiledTill}.`, evidence: data };
  }
  return { status: "mismatch", detail: `GSTIN ${data.gstin}: status ${data.status}, returns filed till ${data.returnsFiledTill}.`, evidence: data };
}
