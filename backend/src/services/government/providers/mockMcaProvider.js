// Mock MCA (Ministry of Corporate Affairs) Provider Interface
// Returns reference corporate registration data from persistent MockProviderRecord database / MCA Portal snapshot.

import { MockProviderRecord } from "../../../db/models.js";

const MCA_REGISTRY = {
  "U72900DL2019PTC123456": {
    cin: "U72900DL2019PTC123456",
    companyName: "Acme Corporation",
    companyCategory: "Company limited by Shares",
    classOfCompany: "Private",
    companyStatus: "Active",
    dateOfIncorporation: "2019-04-12"
  },
  "U72900HR2018PTC074123": {
    cin: "U72900HR2018PTC074123",
    companyName: "Apex Network Solutions Private Limited",
    companyCategory: "Company limited by Shares",
    classOfCompany: "Private",
    companyStatus: "Active",
    dateOfIncorporation: "2018-05-14"
  },
  "U72900DL2018PTC123456": {
    cin: "U72900DL2018PTC123456",
    companyName: "Apex Network Solutions Private Limited",
    companyCategory: "Company limited by Shares",
    classOfCompany: "Private",
    companyStatus: "Active",
    dateOfIncorporation: "2018-04-12"
  },
  "AAA-5678": {
    cin: "AAA-5678",
    companyName: "Brightline Technologies LLP",
    companyCategory: "Limited Liability Partnership",
    classOfCompany: "LLP",
    companyStatus: "Active",
    dateOfIncorporation: "2021-02-10"
  },
  "U74999MH2020LLP987654": {
    cin: "U74999MH2020LLP987654",
    companyName: "Brightline Technologies LLP",
    companyCategory: "Limited Liability Partnership",
    classOfCompany: "LLP",
    companyStatus: "Active",
    dateOfIncorporation: "2020-09-01"
  }
};

export class MockMcaProvider {
  async verify(cinIdentifier) {
    const query = (cinIdentifier || "").toString().trim().toUpperCase();
    if (!query) return null;

    try {
      const dbRecord = await MockProviderRecord.findOne({
        providerType: "MCA_REGISTRY",
        identifier: query,
      });
      if (dbRecord && dbRecord.referenceData) {
        return { ...dbRecord.referenceData };
      }
    } catch (e) {
      // Fallback
    }

    const match = MCA_REGISTRY[query];
    if (match) return { ...match };

    // Unknown identifier -> return null (no fabricated fake records)
    return null;
  }
}

export const mcaProvider = new MockMcaProvider();

export async function verifyMcaInRegistry(cinOrName) {
  const data = await mcaProvider.verify(cinOrName);
  if (!data) return { status: "not_found", detail: "No MCA CIN or corporate registration record found.", evidence: null };
  const isCompliant = (data.status === "ACTIVE" || data.companyStatus === "Active");
  if (isCompliant) {
    return { status: "verified", detail: `MCA Registration verified: ${data.legalName || data.companyName} (${data.status || data.companyStatus}).`, evidence: data };
  }
  return { status: "mismatch", detail: `MCA status for ${data.legalName || data.companyName} is ${data.status || data.companyStatus}.`, evidence: data };
}

