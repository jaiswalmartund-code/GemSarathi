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

  async verifyVendorOnPortals(identifiers = {}, context = {}) {
    const panResult = await verifyPanInRegistry(identifiers.pan);
    const gstResult = await verifyGstInRegistry(identifiers.gstin);
    const udyamResult = await verifyUdyamInRegistry(identifiers.udyamNo || identifiers.udyamNumber);
    const expResult = await verifyExperienceInRegistry(identifiers.legalName || identifiers.vendorCode);
    const itrResult = await verifyItrInRegistry(identifiers.pan);
    const mcaResult = await verifyMcaInRegistry(identifiers.cin || identifiers.pan);
    const debarmentResult = await verifyDebarmentInRegistry(identifiers.legalName, identifiers.vendorCode);
    const digiLockerResult = await verifyDigiLockerInRegistry(context.documentNames || []);

    return {
      results: {
        pan_status: panResult,
        gstin_status: gstResult,
        udyam_status: udyamResult,
        experience_status: expResult,
        itr_status: itrResult,
        mca_status: mcaResult,
        debarment_check: debarmentResult,
        digilocker_verification: digiLockerResult,
      }
    };
  }

  async getSevenProviderReferenceData(vendorData = {}) {
    const pan = vendorData.pan || "AACAC1234A";
    const gstin = vendorData.gstin || "07AACAC1234A1Z5";
    const udyamNo = vendorData.udyamNumber || vendorData.udyam_number || "UDYAM-DL-01-0001234";
    const vendorNameOrId = vendorData.vendorId || vendorData.vendor_id || vendorData.legalName || vendorData.company_name || vendorData.companyName || "VEN-ACME-001";
    const cin = vendorData.cin || vendorData.llpin || "U72900DL2019PTC123456";
    const aadhaarRef = vendorData.aadhaarRef || vendorData.contact_person || vendorData.contactPerson || "999988887777";

    const [panData, gstData, udyamData, expData, itrData, aadhaarData, mcaData] = await Promise.all([
      this.verifyPan(pan),
      this.verifyGst(gstin),
      this.verifyUdyam(udyamNo),
      this.verifyExperience(vendorNameOrId),
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
