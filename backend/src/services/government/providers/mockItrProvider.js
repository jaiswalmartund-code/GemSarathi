// Mock ITR (Income Tax Return) Provider Interface
// Returns reference financial filing data from the Income Tax Department registry snapshot.

const ITR_REGISTRY = {
  "AAACA1234F": {
    pan: "AAACA1234F",
    legalName: "Apex Network Solutions Private Limited",
    assessmentYears: ["2023-24", "2024-25", "2025-26"],
    averageAnnualTurnover: 45000000,
    averageAnnualTurnoverFormatted: "Rs 4.5 Crore",
    filingStatus: "COMPLIANT",
    lastFilingDate: "2026-07-31"
  },
  "AALCB5678G": {
    pan: "AALCB5678G",
    legalName: "Brightline Technologies LLP",
    assessmentYears: ["2023-24", "2024-25", "2025-26"],
    averageAnnualTurnover: 12000000,
    averageAnnualTurnoverFormatted: "Rs 1.2 Crore",
    filingStatus: "COMPLIANT",
    lastFilingDate: "2026-08-15"
  },
  "AAKCS9999H": {
    pan: "AAKCS9999H",
    legalName: "Shady Traders Co",
    assessmentYears: ["2022-23"],
    averageAnnualTurnover: 4000000,
    averageAnnualTurnoverFormatted: "Rs 40 Lakh",
    filingStatus: "OVERDUE",
    lastFilingDate: "2023-09-30"
  }
};

export class MockItrProvider {
  async verify(panIdentifier) {
    const normPan = (panIdentifier || "").toString().trim().toUpperCase();
    if (!normPan) return null;
    const record = ITR_REGISTRY[normPan];
    if (record) return { ...record };
    // Fallback default reference data for unknown PANs
    return {
      pan: normPan,
      legalName: "Registered Entity",
      assessmentYears: ["2025-26"],
      averageAnnualTurnover: 30000000,
      averageAnnualTurnoverFormatted: "Rs 3.0 Crore",
      filingStatus: "COMPLIANT",
      lastFilingDate: "2026-07-31"
    };
  }
}

export const itrProvider = new MockItrProvider();

export async function verifyItrInRegistry(pan) {
  return await itrProvider.verify(pan);
}
