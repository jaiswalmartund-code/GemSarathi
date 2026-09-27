// Mock Identity Verification Provider (Aadhaar & Representative Identity)
// Returns reference identity data from persistent MockProviderRecord database / UIDAI / DigiLocker snapshot.

import { MockProviderRecord } from "../../../db/models.js";

const AADHAAR_REGISTRY = {
  "999988889012": {
    representativeName: "Rahul Sharma",
    designation: "Director - Business Operations",
    aadhaarRef: "9999-8888-9012",
    verificationStatus: "VERIFIED",
    identityStatus: "VERIFIED",
    gender: "Male"
  },
  "999988887777": {
    representativeName: "Rahul Mehta",
    designation: "Authorised Representative",
    aadhaarRef: "9999-8888-7777",
    verificationStatus: "VERIFIED",
    identityStatus: "VERIFIED",
    gender: "Male"
  },
  "RAHULSHARMA": {
    representativeName: "Rahul Sharma",
    designation: "Director - Business Operations",
    aadhaarRef: "9999-8888-9012",
    verificationStatus: "VERIFIED",
    identityStatus: "VERIFIED",
    gender: "Male"
  },
  "RAHULMEHTA": {
    representativeName: "Rahul Mehta",
    designation: "Authorised Representative",
    aadhaarRef: "9999-8888-7777",
    verificationStatus: "VERIFIED",
    identityStatus: "VERIFIED",
    gender: "Male"
  },
  "ACMECORPORATION": {
    representativeName: "Rahul Mehta",
    designation: "Authorised Representative",
    aadhaarRef: "9999-8888-7777",
    verificationStatus: "VERIFIED",
    identityStatus: "VERIFIED",
    gender: "Male"
  },
  "AACAC1234A": {
    representativeName: "Rahul Mehta",
    designation: "Authorised Representative",
    aadhaarRef: "9999-8888-7777",
    verificationStatus: "VERIFIED",
    identityStatus: "VERIFIED",
    gender: "Male"
  },
  "VENACME001": {
    representativeName: "Rahul Mehta",
    designation: "Authorised Representative",
    aadhaarRef: "9999-8888-7777",
    verificationStatus: "VERIFIED",
    identityStatus: "VERIFIED",
    gender: "Male"
  },
  "888877776034": {
    representativeName: "Vikram Kumar Mehta",
    designation: "Partner",
    aadhaarRef: "8888-7777-6034",
    verificationStatus: "NAME_MISMATCH",
    identityStatus: "NAME_MISMATCH",
    gender: "Male"
  },
  "VIKRAMMEHTA": {
    representativeName: "Vikram Kumar Mehta",
    designation: "Partner",
    aadhaarRef: "8888-7777-6034",
    verificationStatus: "NAME_MISMATCH",
    identityStatus: "NAME_MISMATCH",
    gender: "Male"
  }
};

const DEBARRED_VENDORS = new Set(["Shady Traders Co", "VEN-SHADY-003"]);

export class MockAadhaarProvider {
  async verify(identifier) {
    const raw = (identifier || "").toString().trim().toUpperCase();
    const key = raw.replace(/[\s-]/g, "");
    if (!key) return null;

    try {
      const dbRecord = await MockProviderRecord.findOne({
        providerType: "IDENTITY_REGISTRY",
        $or: [{ identifier: raw }, { identifier: key }, { vendorId: raw }, { vendorId: key }],
      });
      if (dbRecord && dbRecord.referenceData) {
        return { ...dbRecord.referenceData };
      }
    } catch (e) {
      // Fallback
    }

    const record = AADHAAR_REGISTRY[key] || AADHAAR_REGISTRY[raw];
    if (record) return { ...record };

    // Default fallback for Acme Corporation or general test uploads
    if (raw.includes("ACME") || raw.includes("MEHTA") || raw.includes("SHARMA") || key === "AACAC1234A") {
      return {
        representativeName: "Rahul Mehta",
        designation: "Authorised Representative",
        aadhaarRef: "9999-8888-7777",
        verificationStatus: "VERIFIED",
        identityStatus: "VERIFIED",
        gender: "Male"
      };
    }

    return null;
  }
}

export const aadhaarProvider = new MockAadhaarProvider();

export async function verifyAadhaarInRegistry(aadhaarRefOrName) {
  return await aadhaarProvider.verify(aadhaarRefOrName);
}

export async function verifyDebarmentInRegistry(legalName, vendorCode) {
  const isDebarred = DEBARRED_VENDORS.has(legalName) || DEBARRED_VENDORS.has(vendorCode);
  if (isDebarred) {
    return { status: "mismatch", detail: `${legalName || vendorCode} appears on the official GeM debarment list snapshot. Rejection recommended.`, evidence: { debarred: true } };
  }
  return { status: "verified", detail: "No debarment record found in registry snapshot.", evidence: { debarred: false } };
}

export async function verifyDigiLockerInRegistry(docNames = []) {
  if (docNames.length > 0) {
    return { status: "verified", detail: `${docNames.length} document(s) presented with verifiable DigiLocker digital signatures.`, evidence: { documents: docNames } };
  }
  return { status: "not_found", detail: "No bid documents available for DigiLocker verification.", evidence: null };
}

