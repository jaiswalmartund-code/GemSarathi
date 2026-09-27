// Mock PAN (Permanent Account Number) Verification Provider
// Returns reference PAN registration data from persistent MockProviderRecord database / registry snapshot.

import { MockProviderRecord } from "../../../db/models.js";

const PAN_REGISTRY = {
  "AACAC1234A": {
    pan: "AACAC1234A",
    legalName: "Acme Corporation",
    status: "ACTIVE",
    category: "Company",
    dateOfIncorporation: "2019-04-12",
    itrFilingStatus: "COMPLIANT"
  },
  "AAACA1234F": {
    pan: "AAACA1234F",
    legalName: "Apex Network Solutions Private Limited",
    status: "ACTIVE",
    category: "Company",
    dateOfIncorporation: "2018-05-14",
    itrFilingStatus: "COMPLIANT"
  },
  "AALCB5678G": {
    pan: "AALCB5678G",
    legalName: "Brightline Technologies LLP",
    status: "ACTIVE",
    category: "LLP",
    dateOfIncorporation: "2021-02-10",
    itrFilingStatus: "COMPLIANT"
  },
  "AAKCS9999H": {
    pan: "AAKCS9999H",
    legalName: "Shady Traders Co",
    status: "INACTIVE",
    category: "Proprietorship",
    dateOfIncorporation: "2022-01-01",
    itrFilingStatus: "OVERDUE"
  }
};

export class MockPanProvider {
  async verify(panIdentifier) {
    const normPan = (panIdentifier || "").toString().trim().toUpperCase();
    if (!normPan) return null;

    try {
      const dbRecord = await MockProviderRecord.findOne({
        providerType: "PAN_REGISTRY",
        identifier: normPan,
      });
      if (dbRecord && dbRecord.referenceData) {
        return { ...dbRecord.referenceData };
      }
    } catch (e) {
      // Fallback to static registry if DB query unavailable
    }

    const record = PAN_REGISTRY[normPan];
    if (record) return { ...record };

    // Unknown identifier -> return null (no fabricated fake records)
    return null;
  }
}

export const panProvider = new MockPanProvider();

export async function verifyPanInRegistry(pan) {
  const data = await panProvider.verify(pan);
  if (!data) return { status: "not_found", detail: "No PAN found in PAN registry snapshot.", evidence: null };
  const isCompliant = (data.status === "ACTIVE" || data.status === "VERIFIED") && (data.itrFilingStatus === "COMPLIANT" || data.nameMatch);
  if (isCompliant) {
    return { status: "verified", detail: `PAN ${data.identifier || data.pan} active in PAN registry. Legal Name: ${data.legalName}.`, evidence: data };
  }
  return { status: "mismatch", detail: `PAN ${data.identifier || data.pan} status: ${data.status}.`, evidence: data };
}

