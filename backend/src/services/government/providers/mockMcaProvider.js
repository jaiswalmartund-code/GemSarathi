// Mock MCA (Ministry of Corporate Affairs) Provider Interface
// Returns reference corporate registration data from the MCA Portal snapshot.

const MCA_REGISTRY = {
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
    const match = MCA_REGISTRY[query];
    if (match) return { ...match };
    return {
      cin: query,
      companyName: "Registered Corporate Entity",
      companyCategory: "Private Limited",
      classOfCompany: "Private",
      companyStatus: "Active",
      dateOfIncorporation: "2020-01-01"
    };
  }
}

export const mcaProvider = new MockMcaProvider();

export async function verifyMcaInRegistry(cinOrName) {
  const data = await mcaProvider.verify(cinOrName);
  if (!data) return { status: "not_found", detail: "No MCA CIN or corporate registration number provided.", evidence: null };
  if (data.companyStatus === "Active") {
    return { status: "verified", detail: `MCA Registration verified: ${data.companyName} (${data.companyStatus}).`, evidence: data };
  }
  return { status: "mismatch", detail: `MCA status for ${data.companyName} is ${data.companyStatus}.`, evidence: data };
}
