// Generates visually rich (but machine-readable) dummy certificates.
// Every PDF uses real text operators (no rasterization), so pdf-parse
// extracts all anchor fields. Government look, zero dependencies.
// Run: node scripts/make-doc-pack.js  ->  demo-docs/cert-pack/*.pdf
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "..", "demo-docs", "cert-pack");
fs.mkdirSync(outDir, { recursive: true });

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

// ops builders ---------------------------------------------------------------
const F = {
  Helvetica: "/F1",
  Bold: "/F2",
};
function text(x, y, size, font, str, color = null) {
  const c = color ? `${color} rg\n` : "";
  return `${c}BT ${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(str.slice(0, 120))}) Tj ET`;
}
function fillRect(x, y, w, h, r, g, b) {
  return `${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f 0 0 0 rg`;
}
function strokeRect(x, y, w, h, lw = 1, r = 0, g = 0, b = 0) {
  return `q ${lw} w ${r} ${g} ${b} RG ${x} ${y} ${w} ${h} re S Q 0 0 0 RG`;
}
function line(x1, y1, x2, y2, lw = 1) {
  return `q ${lw} w ${x1} ${y1} m ${x2} ${y2} l S Q`;
}
function seal(x, y, label) {
  // red stamp-style box (axis-aligned; reads as an official seal)
  return [
    strokeRect(x, y, 150, 44, 2, 0.75, 0.1, 0.1),
    text(x + 10, y + 27, 11, F.Bold, label, "0.75 0.1 0.1"),
    text(x + 10, y + 12, 8, F.Helvetica, "Authorised Signatory", "0.75 0.1 0.1"),
  ].join("\n");
}
function rows(items, x, yStart, step = 20) {
  let y = yStart;
  const out = [];
  for (const [label, value] of items) {
    out.push(text(x, y, 10, F.Bold, label));
    out.push(text(x + 190, y, 10, F.Helvetica, value));
    y -= step;
  }
  return { ops: out.join("\n"), y };
}

function buildPdf(ops) {
  const content = ops.join("\n");
  const objs = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objs[3] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>";
  objs[4] = `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`;
  objs[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objs[6] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i <= 6; i++) {
    offsets[i] = Buffer.byteLength(pdf);
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefAt = Buffer.byteLength(pdf);
  pdf += "xref\n0 7\n0000000000 65535 f \n";
  for (let i = 1; i <= 6; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return Buffer.from(pdf);
}

function tricolorBar(y = 752) {
  return [
    fillRect(0, y, 612, 12, 1, 0.6, 0.2),
    fillRect(0, y - 12, 612, 12, 1, 1, 1),
    fillRect(0, y - 24, 612, 12, 0.1, 0.6, 0.2),
  ].join("\n");
}

function govHeader(title, subtitle) {
  return [
    tricolorBar(),
    text(50, 700, 17, F.Bold, title),
    text(50, 680, 10, F.Helvetica, subtitle),
    line(50, 668, 562, 668),
  ].join("\n");
}

// document builders (data matches mock portal registries) --------------------
const NAVY = "0.1 0.25 0.5";
const WHITE = "1 1 1";

function panCard({ holder, pan, father, dob, company }) {
  const ops = [
    fillRect(40, 480, 532, 240, 0.12, 0.3, 0.62),
    strokeRect(40, 480, 532, 240, 2),
    text(70, 690, 15, F.Bold, "INCOME TAX DEPARTMENT", WHITE),
    text(70, 672, 10, F.Bold, "GOVT. OF INDIA", WHITE),
    text(430, 690, 13, F.Bold, "PAN CARD", WHITE),
    strokeRect(70, 560, 90, 100, 1, 1, 1, 1),
    text(78, 605, 8, F.Helvetica, "PHOTO", WHITE),
    text(180, 640, 10, F.Bold, "Name /", WHITE),
    text(180, 624, 12, F.Bold, holder, WHITE),
    text(180, 600, 10, F.Bold, "Father's Name /", WHITE),
    text(180, 584, 11, F.Bold, father, WHITE),
    text(180, 560, 10, F.Bold, "Date of Birth /", WHITE),
    text(180, 544, 11, F.Bold, dob, WHITE),
    text(70, 520, 10, F.Bold, "Permanent Account Number /", WHITE),
    text(70, 500, 16, F.Bold, pan, WHITE),
    fillRect(40, 440, 532, 26, 0.95, 0.95, 0.95),
    text(60, 448, 9, F.Helvetica, company),
  ];
  return buildPdf(ops);
}

function gstCert({ legalName, gstin, state, date }) {
  const r = rows(
    [
      ["Legal Name:", legalName],
      ["GSTIN:", gstin],
      ["State:", state],
      ["Registration Date:", date],
      ["Constitution:", "Private Limited Company"],
      ["Return Filing:", "GSTR-1, GSTR-3B - filed up to date"],
    ],
    70, 620
  );
  const ops = [
    govHeader("FORM GST REG-06 - REGISTRATION CERTIFICATE", "Central Goods and Services Tax Act, 2017"),
    strokeRect(50, 380, 512, 270, 1.5),
    r.ops,
    text(70, 340, 9, F.Helvetica, "This certificate is digitally generated; signature not required."),
    seal(380, 220, "GST OFFICER"),
  ];
  return buildPdf(ops);
}

function udyamCert({ enterprise, udyam, category, date }) {
  const r = rows(
    [
      ["Enterprise Name:", enterprise],
      ["Udyam Registration No:", udyam],
      ["Category:", category],
      ["Date of Registration:", date],
      ["Major Activity:", "Services - IT Infrastructure Supply"],
    ],
    70, 620
  );
  const ops = [
    govHeader("UDYAM REGISTRATION CERTIFICATE", "Ministry of Micro, Small & Medium Enterprises"),
    strokeRect(50, 400, 512, 250, 1.5),
    r.ops,
    text(70, 360, 9, F.Helvetica, "Verify at udyamregistration.gov.in using the registration number."),
    seal(380, 240, "MSME-DI"),
  ];
  return buildPdf(ops);
}

function isoCert({ company, certNo, validTill }) {
  return buildPdf([
    strokeRect(30, 30, 552, 732, 3, 0.1, 0.25, 0.5),
    strokeRect(42, 42, 528, 708, 1, 0.1, 0.25, 0.5),
    text(190, 690, 22, F.Bold, "CERTIFICATE"),
    text(150, 664, 12, F.Helvetica, "ISO 9001:2015 - Quality Management System"),
    line(150, 650, 462, 650),
    text(120, 600, 11, F.Helvetica, "This is to certify that"),
    text(120, 572, 16, F.Bold, company),
    text(120, 540, 11, F.Helvetica, "operates a Quality Management System conforming to ISO 9001:2015"),
    text(120, 500, 10, F.Bold, "Certificate No:"),
    text(280, 500, 10, F.Helvetica, certNo),
    text(120, 478, 10, F.Bold, "Valid Till:"),
    text(280, 478, 10, F.Helvetica, validTill),
    text(120, 456, 10, F.Bold, "Scope:"),
    text(280, 456, 10, F.Helvetica, "Supply & support of enterprise IT hardware"),
    seal(350, 200, "CERTIFICATION BODY"),
  ]);
}

function oemLetter({ oem, vendor, gstin, tender, maf, date }) {
  return buildPdf([
    fillRect(0, 720, 612, 72, 0.1, 0.25, 0.5),
    text(50, 766, 18, F.Bold, oem, WHITE),
    text(50, 746, 10, F.Helvetica, "Enterprise Server Division - Original Equipment Manufacturer", WHITE),
    text(50, 690, 10, F.Bold, `Ref: ${maf}    Date: ${date}`),
    text(50, 668, 13, F.Bold, "MANUFACTURER AUTHORISATION FORM (MAF)"),
    line(50, 658, 562, 658),
    text(50, 630, 10, F.Helvetica, "To whom it may concern:"),
    text(50, 606, 10, F.Helvetica, `We hereby authorize ${vendor} (GSTIN: ${gstin}),`),
    text(50, 588, 10, F.Helvetica, `to quote, supply and support our products against ${tender}.`),
    text(50, 564, 10, F.Helvetica, "We extend full back-to-back 5 years comprehensive on-site"),
    text(50, 546, 10, F.Helvetica, "warranty support through our authorized service network."),
    text(50, 522, 10, F.Helvetica, "Products offered carry 62 percent local content under Make in India."),
    seal(380, 380, oem.split(" ")[0].toUpperCase()),
    text(50, 400, 10, F.Helvetica, "Authorised Signatory, Seal and Stamp."),
  ]);
}

function startupCert({ llp, dpiit, date }) {
  const r = rows(
    [
      ["Entity Name:", llp],
      ["DPIIT Recognition No:", dpiit],
      ["Date of Recognition:", date],
      ["Sector:", "Information Technology - Hardware Supply"],
    ],
    70, 620
  );
  return buildPdf([
    govHeader("DPIIT RECOGNITION CERTIFICATE - STARTUP INDIA", "Department for Promotion of Industry and Internal Trade"),
    strokeRect(50, 420, 512, 230, 1.5),
    r.ops,
    text(70, 380, 9, F.Helvetica, "Recognised startup eligible for GeM Startup exemptions as applicable."),
    seal(380, 260, "DPIIT"),
  ]);
}

// pack -----------------------------------------------------------------------
const pack = [
  ["VEN-ACME-001-pan-card.pdf", () => panCard({ holder: "ACME PROCUREMENT SYSTEMS PVT LTD", pan: "AAACA1234F", father: "NA (Company PAN)", dob: "12-04-2016", company: "Acme Procurement Systems Pvt Ltd - Company PAN" })],
  ["VEN-ACME-001-gst-cert.pdf", () => gstCert({ legalName: "Acme Procurement Systems Pvt Ltd", gstin: "07AAAAA0000A1Z5", state: "Delhi", date: "01-07-2017" })],
  ["VEN-ACME-001-udyam-cert.pdf", () => udyamCert({ enterprise: "Acme Procurement Systems Pvt Ltd", udyam: "UDYAM-DL-06-0012345", category: "Small", date: "14-09-2020" })],
  ["VEN-ACME-001-iso-cert.pdf", () => isoCert({ company: "Acme Procurement Systems Pvt Ltd", certNo: "ISO-2019-44551", validTill: "31-12-2027" })],
  ["VEN-ACME-001-oem-letter.pdf", () => oemLetter({ oem: "NexaServe Systems", vendor: "Acme Procurement Systems Pvt Ltd", gstin: "07AAAAA0000A1Z5", tender: "GEM/2026/B/1001", maf: "MAF/NS/2026/4471", date: "02-Sep-2026" })],
  ["VEN-BRIGHT-002-pan-card.pdf", () => panCard({ holder: "BRIGHTLINE TECHNOLOGIES LLP", pan: "AALCB5678G", father: "NA (LLP PAN)", dob: "03-08-2019", company: "Brightline Technologies LLP - LLP PAN" })],
  ["VEN-BRIGHT-002-gst-cert.pdf", () => gstCert({ legalName: "Brightline Technologies LLP", gstin: "27BBBBB1111B2Z6", state: "Maharashtra", date: "22-11-2019" })],
  ["VEN-BRIGHT-002-udyam-cert.pdf", () => udyamCert({ enterprise: "Brightline Technologies LLP", udyam: "UDYAM-MH-19-0098765", category: "Micro", date: "05-02-2021" })],
  ["VEN-BRIGHT-002-startup-cert.pdf", () => startupCert({ llp: "Brightline Technologies LLP", dpiit: "DIPP67890", date: "19-06-2022" })],
  ["VEN-SHADY-003-pan-card.pdf", () => panCard({ holder: "SHADY TRADERS CO", pan: "AAKCS9999H", father: "NA (Firm PAN)", dob: "27-01-2021", company: "Shady Traders Co - Firm PAN" })],
  ["VEN-SHADY-003-gst-cert.pdf", () => gstCert({ legalName: "Shady Traders Co", gstin: "29CCCCC2222C3Z7", state: "Karnataka", date: "09-05-2021" })],
];

for (const [name, make] of pack) {
  fs.writeFileSync(path.join(outDir, name), make());
  console.log("wrote cert-pack/" + name);
}
