// Mock Identity Verification Provider (Aadhaar & Representative Identity)
// Returns reference identity data from the UIDAI / DigiLocker registry snapshot.

const AADHAAR_REGISTRY = {
  "9999-8888-9012": {
    representativeName: "Rahul Sharma",
    designation: "Director - Business Operations",
    aadhaarRef: "9999-8888-9012",
    verificationStatus: "VERIFIED",
    gender: "Male"
  },
  "RAHUL SHARMA": {
    representativeName: "Rahul Sharma",
    designation: "Director - Business Operations",
    aadhaarRef: "9999-8888-9012",
    verificationStatus: "VERIFIED",
    gender: "Male"
  },
  "8888-7777-6034": {
    representativeName: "Vikram Kumar Mehta",
    designation: "Partner",
    aadhaarRef: "8888-7777-6034",
    verificationStatus: "NAME_MISMATCH",
    gender: "Male"
  },
  "VIKRAM MEHTA": {
    representativeName: "Vikram Kumar Mehta",
    designation: "Partner",
    aadhaarRef: "8888-7777-6034",
    verificationStatus: "NAME_MISMATCH",
    gender: "Male"
  }
};

const DEBARRED_VENDORS = new Set(["Shady Traders Co", "VEN-SHADY-003"]);

export class MockAadhaarProvider {
  async verify(identifier) {
    const key = (identifier || "").toString().trim().toUpperCase();
    if (!key) return null;
    const record = AADHAAR_REGISTRY[key];
    if (record) return { ...record };
    return {
      representativeName: identifier,
      designation: "Authorised Signatory",
      aadhaarRef: "XXXX-XXXX-9012",
      verificationStatus: "VERIFIED",
      gender: "Male"
    };
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
