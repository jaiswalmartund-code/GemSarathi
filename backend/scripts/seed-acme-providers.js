// Idempotent Seed Script: Acme Corporation Persistent Mock Provider Records
// Inserts or updates the 7 provider reference records into MockProviderRecord DB collection.
import { MockProviderRecord, Vendor } from "../src/db/models.js";

export const ACME_CANONICAL_DATA = {
  vendor: {
    vendorId: "VEN-ACME-001",
    legalName: "Acme Corporation",
    status: "ACTIVE"
  },
  pan: {
    provider: "PAN_REGISTRY",
    identifier: "AACAC1234A",
    status: "ACTIVE",
    legalName: "Acme Corporation",
    nameMatch: true,
    lastVerified: "2026-09-27"
  },
  gst: {
    provider: "GST_REGISTRY",
    identifier: "07AACAC1234A1Z5",
    status: "ACTIVE",
    registrationStatus: "ACTIVE",
    legalName: "Acme Corporation",
    state: "Delhi",
    filingStatus: "UP_TO_DATE",
    nameMatch: true,
    lastVerified: "2026-09-27"
  },
  udyam: {
    provider: "UDYAM_REGISTRY",
    identifier: "UDYAM-DL-01-0001234",
    status: "VERIFIED",
    enterpriseName: "Acme Corporation",
    enterpriseType: "SMALL",
    majorActivity: "SERVICES",
    nameMatch: true,
    lastVerified: "2026-09-27"
  },
  experience: {
    provider: "EXPERIENCE_REGISTRY",
    vendorId: "VEN-ACME-001",
    identifier: "VEN-ACME-001",
    status: "VERIFIED",
    totalRelevantExperienceYears: 7,
    completedProjects: 11,
    publicSectorProjects: 4,
    relevantDomain: "IT AND NETWORK INFRASTRUCTURE",
    nameMatch: true,
    lastVerified: "2026-09-27"
  },
  itr: {
    provider: "ITR_FINANCIAL_REGISTRY",
    identifier: "AACAC1234A",
    status: "VERIFIED",
    legalName: "Acme Corporation",
    financialYears: [
      { year: "2023-24", annualTurnoverINR: 32000000 },
      { year: "2024-25", annualTurnoverINR: 38000000 },
      { year: "2025-26", annualTurnoverINR: 42000000 }
    ],
    averageAnnualTurnoverINR: 37333333,
    nameMatch: true,
    lastVerified: "2026-09-27"
  },
  aadhaar: {
    provider: "IDENTITY_REGISTRY",
    identifier: "999988887777",
    status: "VERIFIED",
    name: "Rahul Mehta",
    identityStatus: "VERIFIED",
    authorizedRepresentative: true,
    representativeNameMatch: true,
    linkedVendorId: "VEN-ACME-001",
    lastVerified: "2026-09-27"
  },
  mca: {
    provider: "MCA_REGISTRY",
    identifier: "U72900DL2019PTC123456",
    identifierType: "CIN",
    status: "ACTIVE",
    legalName: "Acme Corporation",
    companyType: "PRIVATE LIMITED COMPANY",
    incorporationYear: 2019,
    registeredState: "Delhi",
    nameMatch: true,
    lastVerified: "2026-09-27"
  }
};

export const OTHER_CANONICAL_PROVIDERS = [
  // Apex Network Solutions
  { providerType: "PAN_REGISTRY", identifier: "AAACA1234F", vendorId: "VEN-APEX-001", status: "ACTIVE", referenceData: { pan: "AAACA1234F", legalName: "Apex Network Solutions Private Limited", status: "ACTIVE", category: "Company", dateOfIncorporation: "2018-05-14", itrFilingStatus: "COMPLIANT" } },
  { providerType: "GST_REGISTRY", identifier: "07AAACA1234F1Z5", vendorId: "VEN-APEX-001", status: "ACTIVE", referenceData: { gstin: "07AAACA1234F1Z5", legalName: "Apex Network Solutions Private Limited", tradeName: "Apex Network Solutions", status: "ACTIVE", taxpayerType: "Regular", stateJurisdiction: "State - Haryana", returnsFiledTill: "Aug-2026", filingUpToDate: true } },
  { providerType: "UDYAM_REGISTRY", identifier: "UDYAM-HR-05-0012345", vendorId: "VEN-APEX-001", status: "VERIFIED", referenceData: { udyamNumber: "UDYAM-HR-05-0012345", enterpriseName: "Apex Network Solutions Private Limited", enterpriseType: "Small", majorActivity: "Services", status: "VERIFIED" } },
  { providerType: "EXPERIENCE_REGISTRY", identifier: "VEN-APEX-001", vendorId: "VEN-APEX-001", status: "VERIFIED", referenceData: { vendorName: "Apex Network Solutions Private Limited", verifiedYearsOfExperience: 8, completedProjectsCount: 12, publicSectorProjectsCount: 5, status: "VERIFIED" } },
  { providerType: "EXPERIENCE_REGISTRY", identifier: "APEX NETWORK SOLUTIONS PRIVATE LIMITED", vendorId: "VEN-APEX-001", status: "VERIFIED", referenceData: { vendorName: "Apex Network Solutions Private Limited", verifiedYearsOfExperience: 8, completedProjectsCount: 12, publicSectorProjectsCount: 5, status: "VERIFIED" } },
  { providerType: "ITR_FINANCIAL_REGISTRY", identifier: "AAACA1234F", vendorId: "VEN-APEX-001", status: "VERIFIED", referenceData: { pan: "AAACA1234F", legalName: "Apex Network Solutions Private Limited", assessmentYears: ["2023-24", "2024-25", "2025-26"], averageAnnualTurnover: 45000000, averageAnnualTurnoverFormatted: "Rs 4.5 Crore", filingStatus: "COMPLIANT", lastFilingDate: "2026-07-31" } },
  { providerType: "IDENTITY_REGISTRY", identifier: "9999-8888-9012", vendorId: "VEN-APEX-001", status: "VERIFIED", referenceData: { representativeName: "Rahul Sharma", designation: "Director - Business Operations", aadhaarRef: "9999-8888-9012", verificationStatus: "VERIFIED", gender: "Male" } },
  { providerType: "IDENTITY_REGISTRY", identifier: "RAHUL SHARMA", vendorId: "VEN-APEX-001", status: "VERIFIED", referenceData: { representativeName: "Rahul Sharma", designation: "Director - Business Operations", aadhaarRef: "9999-8888-9012", verificationStatus: "VERIFIED", gender: "Male" } },
  { providerType: "MCA_REGISTRY", identifier: "U72900HR2018PTC074123", vendorId: "VEN-APEX-001", status: "ACTIVE", referenceData: { cin: "U72900HR2018PTC074123", companyName: "Apex Network Solutions Private Limited", companyCategory: "Company limited by Shares", classOfCompany: "Private", companyStatus: "Active", dateOfIncorporation: "2018-05-14" } },

  // Brightline Technologies
  { providerType: "PAN_REGISTRY", identifier: "AALCB5678G", vendorId: "VEN-BRIGHT-002", status: "ACTIVE", referenceData: { pan: "AALCB5678G", legalName: "Brightline Technologies LLP", status: "ACTIVE", category: "LLP", dateOfIncorporation: "2021-02-10", itrFilingStatus: "COMPLIANT" } },
  { providerType: "GST_REGISTRY", identifier: "27BBBBB1111B2Z6", vendorId: "VEN-BRIGHT-002", status: "SUSPENDED", referenceData: { gstin: "27BBBBB1111B2Z6", legalName: "Brightline Technologies LLP", tradeName: "Brightline Tech", status: "SUSPENDED", taxpayerType: "Regular", stateJurisdiction: "State - Maharashtra", returnsFiledTill: "Mar-2026", filingUpToDate: false } },
  { providerType: "UDYAM_REGISTRY", identifier: "UDYAM-MH-19-0098765", vendorId: "VEN-BRIGHT-002", status: "VERIFIED", referenceData: { udyamNumber: "UDYAM-MH-19-0098765", enterpriseName: "Brightline Technologies LLP", enterpriseType: "Micro", majorActivity: "Trading", status: "VERIFIED" } },
  { providerType: "EXPERIENCE_REGISTRY", identifier: "BRIGHTLINE TECHNOLOGIES LLP", vendorId: "VEN-BRIGHT-002", status: "VERIFIED", referenceData: { vendorName: "Brightline Technologies LLP", verifiedYearsOfExperience: 3, completedProjectsCount: 4, publicSectorProjectsCount: 1, status: "VERIFIED" } },
  { providerType: "ITR_FINANCIAL_REGISTRY", identifier: "AALCB5678G", vendorId: "VEN-BRIGHT-002", status: "VERIFIED", referenceData: { pan: "AALCB5678G", legalName: "Brightline Technologies LLP", assessmentYears: ["2023-24", "2024-25", "2025-26"], averageAnnualTurnover: 12000000, averageAnnualTurnoverFormatted: "Rs 1.2 Crore", filingStatus: "COMPLIANT", lastFilingDate: "2026-08-15" } },
  { providerType: "IDENTITY_REGISTRY", identifier: "8888-7777-6034", vendorId: "VEN-BRIGHT-002", status: "VERIFIED", referenceData: { representativeName: "Vikram Kumar Mehta", designation: "Partner", aadhaarRef: "8888-7777-6034", verificationStatus: "NAME_MISMATCH", gender: "Male" } },
  { providerType: "IDENTITY_REGISTRY", identifier: "VIKRAM MEHTA", vendorId: "VEN-BRIGHT-002", status: "VERIFIED", referenceData: { representativeName: "Vikram Kumar Mehta", designation: "Partner", aadhaarRef: "8888-7777-6034", verificationStatus: "NAME_MISMATCH", gender: "Male" } },
  { providerType: "MCA_REGISTRY", identifier: "AAA-5678", vendorId: "VEN-BRIGHT-002", status: "ACTIVE", referenceData: { cin: "AAA-5678", companyName: "Brightline Technologies LLP", companyCategory: "Limited Liability Partnership", classOfCompany: "LLP", companyStatus: "Active", dateOfIncorporation: "2021-02-10" } },
];

export async function seedAcmeProviderRecords() {
  console.log("=== SEEDING ACME CORPORATION MOCK PROVIDER RECORDS ===");

  // 1. Ensure Vendor VEN-ACME-001 exists
  let acmeVendor = await Vendor.findOne({
    $or: [{ vendorCode: "VEN-ACME-001" }, { company_name: "Acme Corporation" }, { legalName: "Acme Corporation" }]
  });

  if (!acmeVendor) {
    acmeVendor = await Vendor.create({
      vendorCode: "VEN-ACME-001",
      company_name: "Acme Corporation",
      legalName: "Acme Corporation",
      status: "Active",
      email: "contact@acme.com",
      pan: "AACAC1234A",
      gstin: "07AACAC1234A1Z5",
      udyam_number: "UDYAM-DL-01-0001234"
    });
  }

  const acmeRecords = [
    { providerType: "PAN_REGISTRY", identifier: "AACAC1234A", vendorId: "VEN-ACME-001", status: "ACTIVE", referenceData: ACME_CANONICAL_DATA.pan },
    { providerType: "GST_REGISTRY", identifier: "07AACAC1234A1Z5", vendorId: "VEN-ACME-001", status: "ACTIVE", referenceData: ACME_CANONICAL_DATA.gst },
    { providerType: "UDYAM_REGISTRY", identifier: "UDYAM-DL-01-0001234", vendorId: "VEN-ACME-001", status: "VERIFIED", referenceData: ACME_CANONICAL_DATA.udyam },
    { providerType: "EXPERIENCE_REGISTRY", identifier: "VEN-ACME-001", vendorId: "VEN-ACME-001", status: "VERIFIED", referenceData: ACME_CANONICAL_DATA.experience },
    { providerType: "EXPERIENCE_REGISTRY", identifier: "ACME CORPORATION", vendorId: "VEN-ACME-001", status: "VERIFIED", referenceData: ACME_CANONICAL_DATA.experience },
    { providerType: "ITR_FINANCIAL_REGISTRY", identifier: "AACAC1234A", vendorId: "VEN-ACME-001", status: "VERIFIED", referenceData: ACME_CANONICAL_DATA.itr },
    { providerType: "IDENTITY_REGISTRY", identifier: "999988887777", vendorId: "VEN-ACME-001", status: "VERIFIED", referenceData: ACME_CANONICAL_DATA.aadhaar },
    { providerType: "IDENTITY_REGISTRY", identifier: "RAHUL MEHTA", vendorId: "VEN-ACME-001", status: "VERIFIED", referenceData: ACME_CANONICAL_DATA.aadhaar },
    { providerType: "MCA_REGISTRY", identifier: "U72900DL2019PTC123456", vendorId: "VEN-ACME-001", status: "ACTIVE", referenceData: ACME_CANONICAL_DATA.mca },
  ];

  let insertedCount = 0;
  let updatedCount = 0;

  const allRecords = [...acmeRecords, ...OTHER_CANONICAL_PROVIDERS];

  for (const item of allRecords) {
    const filter = { providerType: item.providerType, identifier: item.identifier };
    const existing = await MockProviderRecord.findOne(filter);
    if (existing) {
      await MockProviderRecord.findOneAndUpdate(filter, {
        $set: {
          vendorId: item.vendorId,
          status: item.status,
          referenceData: item.referenceData,
        }
      });
      updatedCount++;
    } else {
      await MockProviderRecord.create(item);
      insertedCount++;
    }
  }

  const totalAcmeInDb = await MockProviderRecord.countDocuments({ vendorId: "VEN-ACME-001" });
  console.log(`✅ Acme Provider Seeding Complete. Inserted: ${insertedCount}, Updated: ${updatedCount}, Total Acme Records in DB: ${totalAcmeInDb}`);
  return { insertedCount, updatedCount, totalAcmeInDb };
}

// Run directly if called as a script
if (process.argv[1] && process.argv[1].includes("seed-acme-providers")) {
  seedAcmeProviderRecords().then(() => process.exit(0)).catch((err) => {
    console.error("❌ Acme Seed Error:", err);
    process.exit(1);
  });
}
