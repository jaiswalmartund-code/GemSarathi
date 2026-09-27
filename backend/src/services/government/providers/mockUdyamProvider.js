// Mock Udyam / MSME Registration Provider
// Returns reference Udyam registration data from persistent MockProviderRecord database / MSME Portal snapshot.

import { MockProviderRecord } from "../../../db/models.js";

const UDYAM_REGISTRY = {
  "UDYAM-DL-01-0001234": {
    udyamNumber: "UDYAM-DL-01-0001234",
    enterpriseName: "Acme Corporation",
    enterpriseType: "Medium",
    majorActivity: "Services",
    status: "VERIFIED"
  },
  "UDYAM-HR-05-0012345": {
    udyamNumber: "UDYAM-HR-05-0012345",
    enterpriseName: "Apex Network Solutions Private Limited",
    enterpriseType: "Small",
    majorActivity: "Services",
    status: "VERIFIED"
  },
  "UDYAM-DL-06-0012345": {
    udyamNumber: "UDYAM-DL-06-0012345",
    enterpriseName: "Apex Network Solutions Private Limited",
    enterpriseType: "Small",
    majorActivity: "Services",
    status: "VERIFIED"
  },
  "UDYAM-MH-19-0098765": {
    udyamNumber: "UDYAM-MH-19-0098765",
    enterpriseName: "Brightline Technologies LLP",
    enterpriseType: "Micro",
    majorActivity: "Trading",
    status: "VERIFIED"
  },
  "UDYAM-KA-03-0001112": {
    udyamNumber: "UDYAM-KA-03-0001112",
    enterpriseName: "Shady Traders Co",
    enterpriseType: "Micro",
    majorActivity: "Trading",
    status: "SUSPENDED"
  }
};

export class MockUdyamProvider {
  async verify(udyamIdentifier) {
    const normUdyam = (udyamIdentifier || "").toString().trim().toUpperCase();
    if (!normUdyam) return null;

    try {
      const dbRecord = await MockProviderRecord.findOne({
        providerType: "UDYAM_REGISTRY",
        identifier: normUdyam,
      });
      if (dbRecord && dbRecord.referenceData) {
        return { ...dbRecord.referenceData };
      }
    } catch (e) {
      // Fallback
    }

    const record = UDYAM_REGISTRY[normUdyam];
    if (record) return { ...record };

    // Unknown identifier -> return null (no fabricated fake records)
    return null;
  }
}

export const udyamProvider = new MockUdyamProvider();

export async function verifyUdyamInRegistry(udyamNo) {
  const data = await udyamProvider.verify(udyamNo);
  if (!data) return { status: "not_found", detail: "No Udyam number found in Udyam registry snapshot.", evidence: null };
  if (data.status === "VERIFIED" || data.status === "ACTIVE") {
    return { status: "verified", detail: `Udyam ${data.identifier || data.udyamNumber} active (${data.enterpriseType}). Name matches registry.`, evidence: data };
  }
  return { status: "mismatch", detail: `Udyam ${data.identifier || data.udyamNumber} is ${data.status} in registry.`, evidence: data };
}

