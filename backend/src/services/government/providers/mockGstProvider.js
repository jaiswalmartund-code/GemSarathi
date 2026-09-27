// Mock GSTIN (Goods & Services Tax) Registry Provider
// Returns reference GSTIN registration data from persistent MockProviderRecord database / GSTN Portal snapshot.

import { MockProviderRecord } from "../../../db/models.js";

const GSTN_REGISTRY = {
  "07AACAC1234A1Z5": {
    gstin: "07AACAC1234A1Z5",
    legalName: "Acme Corporation",
    tradeName: "Acme Corp",
    status: "ACTIVE",
    taxpayerType: "Regular",
    stateJurisdiction: "State - Delhi",
    returnsFiledTill: "Aug-2026",
    filingUpToDate: true
  },
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

    try {
      const dbRecord = await MockProviderRecord.findOne({
        providerType: "GST_REGISTRY",
        identifier: normGst,
      });
      if (dbRecord && dbRecord.referenceData) {
        return { ...dbRecord.referenceData };
      }
    } catch (e) {
      // Fallback
    }

    const record = GSTN_REGISTRY[normGst];
    if (record) return { ...record };

    // Unknown identifier -> return null (no fabricated fake records)
    return null;
  }
}

export const gstProvider = new MockGstProvider();

export async function verifyGstInRegistry(gstin) {
  const data = await gstProvider.verify(gstin);
  if (!data) return { status: "not_found", detail: "No GSTIN found in GST registry snapshot.", evidence: null };
  const isCompliant = (data.status === "ACTIVE" || data.status === "VERIFIED") && (data.filingUpToDate !== false || data.filingStatus === "UP_TO_DATE");
  if (isCompliant) {
    return { status: "verified", detail: `GSTIN ${data.identifier || data.gstin} active; returns filed till ${data.returnsFiledTill || "UP TO DATE"}.`, evidence: data };
  }
  return { status: "mismatch", detail: `GSTIN ${data.identifier || data.gstin}: status ${data.status}.`, evidence: data };
}

