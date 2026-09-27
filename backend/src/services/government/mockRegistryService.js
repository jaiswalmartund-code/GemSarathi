// Persistent Mock Government/Reference Provider Registry Service
// Queries persistent database (MockProviderRecord) across all 7 provider domains.

import { panProvider } from "./providers/mockPanProvider.js";
import { gstProvider } from "./providers/mockGstProvider.js";
import { udyamProvider } from "./providers/mockUdyamProvider.js";
import { experienceProvider } from "./providers/mockExperienceProvider.js";
import { itrProvider } from "./providers/mockItrProvider.js";
import { aadhaarProvider } from "./providers/mockIdentityProvider.js";
import { mcaProvider } from "./providers/mockMcaProvider.js";

export class MockRegistryService {
  async getPanRecord(identifier) {
    return await panProvider.verify(identifier);
  }

  async getGstRecord(identifier) {
    return await gstProvider.verify(identifier);
  }

  async getUdyamRecord(identifier) {
    return await udyamProvider.verify(identifier);
  }

  async getExperienceRecord(identifier) {
    return await experienceProvider.verify(identifier);
  }

  async getItrRecord(identifier) {
    return await itrProvider.verify(identifier);
  }

  async getAadhaarRecord(identifier) {
    return await aadhaarProvider.verify(identifier);
  }

  async getMcaRecord(identifier) {
    return await mcaProvider.verify(identifier);
  }
}

export const mockRegistryService = new MockRegistryService();
