// Government Verification Service Boundary Interface
// High-level service interface for cross-verifying vendor credentials against reference providers.
// Standardized across 7 provider domains: PAN, GST, Udyam, Experience, ITR, Aadhaar, MCA.
// Currently uses mock reference providers. In production, real API adapters will replace mock providers.

import { panProvider, verifyPanInRegistry } from "./providers/mockPanProvider.js";
import { gstProvider, verifyGstInRegistry } from "./providers/mockGstProvider.js";
import { udyamProvider, verifyUdyamInRegistry } from "./providers/mockUdyamProvider.js";
import { experienceProvider, verifyExperienceInRegistry } from "./providers/mockExperienceProvider.js";
import { itrProvider, verifyItrInRegistry } from "./providers/mockItrProvider.js";
import { aadhaarProvider, verifyAadhaarInRegistry, verifyDebarmentInRegistry, verifyDigiLockerInRegistry } from "./providers/mockIdentityProvider.js";
import { mcaProvider, verifyMcaInRegistry } from "./providers/mockMcaProvider.js";
import { verifyOemAuthorization } from "./providers/mockOemProvider.js";
import { verifyIsoCertification } from "./providers/mockIsoProvider.js";

export class GovernmentVerificationService {
  constructor() {
    this.panProvider = panProvider;
    this.gstProvider = gstProvider;
    this.udyamProvider = udyamProvider;
    this.experienceProvider = experienceProvider;
    this.itrProvider = itrProvider;
    this.aadhaarProvider = aadhaarProvider;
    this.mcaProvider = mcaProvider;
  }

  async verifyPan(pan) {
    return await this.panProvider.verify(pan);
  }

  async verifyGst(gstin) {
    return await this.gstProvider.verify(gstin);
  }

  async verifyUdyam(udyamNo) {
    return await this.udyamProvider.verify(udyamNo);
  }

  async verifyExperience(vendorIdentifier) {
    return await this.experienceProvider.verify(vendorIdentifier);
  }

  async verifyItr(pan) {
    return await this.itrProvider.verify(pan);
  }

  async verifyAadhaar(identifier) {
    return await this.aadhaarProvider.verify(identifier);
  }

  async verifyMca(cin) {
    return await this.mcaProvider.verify(cin);
  }

  async verifyDebarment(legalName, vendorCode) {
    return await verifyDebarmentInRegistry(legalName, vendorCode);
  }

  async verifyDigiLocker(docNames) {
    return await verifyDigiLockerInRegistry(docNames);
  }

  async verifyOem(hasOemClaim, docText) {
    return await verifyOemAuthorization(hasOemClaim, docText);
  }

  async verifyIso(hasIsoClaim, documents) {
    return await verifyIsoCertification(hasIsoClaim, documents);
  }

  async getSevenProviderReferenceData(vendorData = {}) {
    const pan = vendorData.pan || "AAACA1234F";
    const gstin = vendorData.gstin || "07AAACA1234F1Z5";
    const udyamNo = vendorData.udyamNumber || vendorData.udyam_number || "UDYAM-HR-05-0012345";
    const vendorName = vendorData.legalName || vendorData.company_name || vendorData.companyName || "Apex Network Solutions Private Limited";
    const cin = vendorData.cin || vendorData.llpin || "U72900HR2018PTC074123";
    const aadhaarRef = vendorData.aadhaarRef || vendorData.contact_person || vendorData.contactPerson || "Rahul Sharma";

    const [panData, gstData, udyamData, expData, itrData, aadhaarData, mcaData] = await Promise.all([
      this.verifyPan(pan),
      this.verifyGst(gstin),
      this.verifyUdyam(udyamNo),
      this.verifyExperience(vendorName),
      this.verifyItr(pan),
      this.verifyAadhaar(aadhaarRef),
      this.verifyMca(cin)
    ]);

    return {
      pan: panData,
      gst: gstData,
      udyam: udyamData,
      experience: expData,
      itr: itrData,
      aadhaar: aadhaarData,
      mca: mcaData
    };
  }
}

export const governmentVerificationService = new GovernmentVerificationService();
