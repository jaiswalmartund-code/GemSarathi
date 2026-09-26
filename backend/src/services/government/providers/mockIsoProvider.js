// Mock ISO Certification Provider
export async function verifyIsoCertification(hasIsoClaim, documents = []) {
  const isoDoc = documents.find((d) => /iso/i.test(`${d.originalFilename || ""} ${d.documentType || ""}`));
  if (hasIsoClaim || isoDoc) {
    return {
      status: "verified",
      detail: `ISO 9001 Quality Certification verified.${isoDoc ? ` Attached file: ${isoDoc.originalFilename}.` : ""}`,
      evidence: { isoVerified: true, certificateFile: isoDoc?.originalFilename || null },
    };
  }
  return { status: "needs_review", detail: "No ISO certification claim or certificate file extracted; officer review required.", evidence: null };
}
