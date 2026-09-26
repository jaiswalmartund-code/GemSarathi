// Mock OEM Authorisation Provider
export async function verifyOemAuthorization(hasOemAuthClaim, docText = "") {
  const oemRegex = /OEM\s*authori[sz]ation|authori[sz]ed\s+(?:by\s+)?(?:the\s+)?OEM|manufacturer'?s?\s*authori[sz]ation|MAF\b/i;
  if (hasOemAuthClaim || oemRegex.test(docText)) {
    return { status: "verified", detail: "OEM Authorisation Form (MAF) verified against manufacturer database.", evidence: { verified: true } };
  }
  return { status: "needs_review", detail: "OEM Authorisation letter not explicitly verified; requires officer review.", evidence: null };
}
