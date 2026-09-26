// Generates ready-to-upload demo PDFs in ../demo-docs/. Run: node scripts/make-demo-docs.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "..", "demo-docs");
fs.mkdirSync(outDir, { recursive: true });

function makePdf(lines) {
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  let y = 720;
  const cmds = ["BT /F1 11 Tf"];
  for (const line of lines) {
    cmds.push(`1 0 0 1 50 ${y} Tm (${esc(line.slice(0, 110))}) Tj`);
    y -= 15;
    if (y < 40) break;
  }
  cmds.push("ET");
  const content = cmds.join("\n");
  const objs = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objs[3] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>";
  objs[4] = `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`;
  objs[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(pdf);
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefAt = Buffer.byteLength(pdf);
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return Buffer.from(pdf);
}

const docs = {
  "Brightline-OEM-MAF.pdf": [
    "MANUFACTURER AUTHORISATION FORM (MAF)",
    "Ref: MAF/SRV/2026/4471  Date: 04-Sep-2026",
    "To: Brightline Technologies LLP (GSTIN: 27BBBBB1111B2Z6)",
    "Subject: OEM Authorization for GeM Tender GEM/2026/B/1001",
    "We, the undersigned Original Equipment Manufacturer of enterprise",
    "rack servers, hereby authorize Brightline Technologies LLP to quote,",
    "supply and support our products against the above tender.",
    "We extend full back-to-back warranty support of 3 years comprehensive",
    "on-site warranty through our authorized service network.",
    "Products offered carry 55 percent local content under Make in India.",
    "Authorised Signatory (OEM), Seal and Stamp.",
  ],
  "Tender-Notice-GEM-2026-B-1001.pdf": [
    "GOVERNMENT E-MARKETPLACE - TENDER NOTICE excerpts",
    "Tender No: GEM/2026/B/1001 - HPC Servers, MeitY.",
    "1. Earnest Money Deposit: Minimum EMD required Rs 500000.",
    "2. Minimum average annual turnover Rs 10000000 (Rs 1 Crore).",
    "3. Minimum 5 years of experience in similar supplies.",
    "4. Valid ISO 9001 certification and OEM authorisation mandatory.",
    "5. Minimum 50 percent local content (Make in India).",
    "6. Minimum 3 years comprehensive on-site warranty.",
  ],
  "Sample-Weak-Bid.pdf": [
    "BID FOR SERVER SUPPLY - General Trading Co",
    "GSTIN: 29CCCCC2222C3Z7",
    "PAN: AAKCS9999H",
    "Annual turnover Rs 40 Lakh approx.",
    "2 years of experience in general trading.",
    "Best prices assured. No advance needed.",
  ],
};

for (const [name, lines] of Object.entries(docs)) {
  fs.writeFileSync(path.join(outDir, name), makePdf(lines));
  console.log("wrote demo-docs/" + name);
}
