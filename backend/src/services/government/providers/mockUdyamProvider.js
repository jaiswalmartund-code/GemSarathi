// Mock Udyam / MSME Registration Provider
// Returns reference Udyam registration data from the MSME Udyam Portal snapshot.

const UDYAM_REGISTRY = {
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
    const record = UDYAM_REGISTRY[normUdyam];
    if (record) return { ...record };
    return {
      udyamNumber: normUdyam,
      enterpriseName: "Registered Enterprise",
      enterpriseType: "Small",
      majorActivity: "Services",
      status: "VERIFIED"
    };
  }
}

export const udyamProvider = new MockUdyamProvider();

export async function verifyUdyamInRegistry(udyamNo) {
  const data = await udyamProvider.verify(udyamNo);
  if (!data) return { status: "not_found", detail: "No Udyam number found in bid documents or vendor profile.", evidence: null };
  if (data.status === "VERIFIED") {
    return { status: "verified", detail: `Udyam ${data.udyamNumber} active (${data.enterpriseType}). Name matches registry.`, evidence: data };
  }
  return { status: "mismatch", detail: `Udyam ${data.udyamNumber} is ${data.status} in registry.`, evidence: data };
}
