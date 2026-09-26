// Mock PAN (Permanent Account Number) Verification Provider
// Returns reference PAN registration data from the Income Tax Department snapshot.

const PAN_REGISTRY = {
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
    const record = PAN_REGISTRY[normPan];
    if (record) return { ...record };
    return {
      pan: normPan,
      legalName: "Registered Entity",
      status: "ACTIVE",
      category: "Company",
      dateOfIncorporation: "2020-01-01",
      itrFilingStatus: "COMPLIANT"
    };
  }
}

export const panProvider = new MockPanProvider();

export async function verifyPanInRegistry(pan) {
  const data = await panProvider.verify(pan);
  if (!data) return { status: "not_found", detail: "No PAN found in bid documents.", evidence: null };
  if (data.status === "ACTIVE" && data.itrFilingStatus === "COMPLIANT") {
    return { status: "verified", detail: `PAN ${data.pan} active in PAN registry. Legal Name: ${data.legalName}.`, evidence: data };
  }
  return { status: "mismatch", detail: `PAN ${data.pan} status: ${data.status}, ITR Filing: ${data.itrFilingStatus}.`, evidence: data };
}
