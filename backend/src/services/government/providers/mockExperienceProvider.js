// Mock Experience & Past Contract Verification Provider
// Returns verified historical contract completion data from persistent MockProviderRecord database / Public Procurement Registry.

import { MockProviderRecord } from "../../../db/models.js";

const EXPERIENCE_REGISTRY = {
  "ACME CORPORATION": {
    vendorName: "Acme Corporation",
    verifiedYearsOfExperience: 7,
    completedProjectsCount: 10,
    publicSectorProjectsCount: 6,
    status: "VERIFIED"
  },
  "VEN-ACME-001": {
    vendorName: "Acme Corporation",
    verifiedYearsOfExperience: 7,
    completedProjectsCount: 10,
    publicSectorProjectsCount: 6,
    status: "VERIFIED"
  },
  "APEX NETWORK SOLUTIONS PRIVATE LIMITED": {
    vendorName: "Apex Network Solutions Private Limited",
    verifiedYearsOfExperience: 8,
    completedProjectsCount: 12,
    publicSectorProjectsCount: 5,
    status: "VERIFIED"
  },
  "ACME PROCUREMENT SYSTEMS PVT LTD": {
    vendorName: "Apex Network Solutions Private Limited",
    verifiedYearsOfExperience: 12,
    completedProjectsCount: 15,
    publicSectorProjectsCount: 8,
    status: "VERIFIED"
  },
  "BRIGHTLINE TECHNOLOGIES LLP": {
    vendorName: "Brightline Technologies LLP",
    verifiedYearsOfExperience: 3,
    completedProjectsCount: 4,
    publicSectorProjectsCount: 1,
    status: "VERIFIED"
  },
  "SHADY TRADERS CO": {
    vendorName: "Shady Traders Co",
    verifiedYearsOfExperience: 1,
    completedProjectsCount: 1,
    publicSectorProjectsCount: 0,
    status: "UNVERIFIED"
  }
};

export class MockExperienceProvider {
  async verify(vendorIdentifier) {
    const key = (vendorIdentifier || "").toString().trim().toUpperCase();
    if (!key) return null;

    try {
      const dbRecord = await MockProviderRecord.findOne({
        providerType: "EXPERIENCE_REGISTRY",
        $or: [{ identifier: key }, { vendorId: key }],
      });
      if (dbRecord && dbRecord.referenceData) {
        return { ...dbRecord.referenceData };
      }
    } catch (e) {
      // Fallback
    }

    const record = EXPERIENCE_REGISTRY[key];
    if (record) return { ...record };

    // Unknown identifier -> return null (no fabricated fake records)
    return null;
  }
}

export const experienceProvider = new MockExperienceProvider();

export async function verifyExperienceInRegistry(vendorName, claimedYears) {
  const years = Number(claimedYears) || 0;
  const data = await experienceProvider.verify(vendorName);
  if (!data) return { status: "not_found", detail: "No past contract completion certificates or experience records found.", evidence: null };
  const expYears = data.totalRelevantExperienceYears ?? data.verifiedYearsOfExperience ?? 0;
  if (expYears >= years) {
    return { status: "verified", detail: `Past experience (${expYears} years) verified via historical contract completion registry.`, evidence: data };
  }
  return { status: "needs_review", detail: `Past experience (${expYears} years) below claimed threshold (${years} years); manual verification required.`, evidence: data };
}

