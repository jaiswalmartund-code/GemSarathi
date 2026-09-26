// Attaches the styled cert-pack PDFs to the seeded vendor bids.
// Idempotent (skips filenames already attached). Keeps the original
// technical-bid.pdf as the primary evidence doc, so scores cannot regress.
// Run: node scripts/attach-doc-pack.js (server may stay running for reads,
// but restart it after so its in-memory DB picks up the new rows).
await import("dotenv/config");
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDatabase, Vendor, Bid, Tender, Document } from "../src/db/models.js";
import { saveBuffer } from "../src/services/documents/fileStorageService.js";

const packDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "demo-docs", "supporting-documents");

const DOC_TYPES = [
  ["pan-card", "PAN Card"],
  ["gst-cert", "GST Certificate"],
  ["udyam-cert", "Udyam Certificate"],
  ["iso-cert", "ISO Certificate"],
  ["oem-letter", "OEM Letter"],
  ["startup-cert", "Startup Certificate"],
];

function docTypeFor(filename) {
  const entry = DOC_TYPES.find(([suffix]) => filename.includes(suffix));
  return entry ? entry[1] : "Supporting Document";
}

await connectDatabase();
const tender = await Tender.findOne({ referenceNumber: "GEM/2026/B/1001" }).lean();
if (!tender) throw new Error("Seed tender GEM/2026/B/1001 not found - run npm run seed first");

const files = fs.readdirSync(packDir).filter((f) => f.endsWith(".pdf"));
let attached = 0;
for (const file of files) {
  const vendorCode = file.split("-").slice(0, 3).join("-"); // VEN-XXX-NNN
  const vendor = await Vendor.findOne({ vendorCode }).lean();
  if (!vendor) {
    console.log("skip (unknown vendor):", file);
    continue;
  }
  const bid = await Bid.findOne({ tenderId: tender._id, vendorId: vendor._id }).lean();
  if (!bid) {
    console.log("skip (no bid):", file);
    continue;
  }
  const exists = await Document.findOne({ bidId: bid._id, originalFilename: file });
  if (exists) continue;
  const buffer = fs.readFileSync(path.join(packDir, file));
  const stored = await saveBuffer(file, buffer, "application/pdf");
  await Document.create({
    bidId: bid._id,
    tenderId: tender._id,
    vendorId: vendor._id,
    documentType: docTypeFor(file),
    originalFilename: file,
    storagePath: stored.storagePath,
    mimeType: "application/pdf",
    fileSize: stored.fileSize,
    uploadedBy: vendor.userId,
    visibility: "vendor_and_officer",
    status: "ACTIVE",
    uploadedAt: new Date(),
  });
  attached++;
  console.log("attached:", file, "->", vendor.legalName);
}
console.log(`done, ${attached} new document(s). Restart the backend so it reloads the DB.`);
process.exit(0);
