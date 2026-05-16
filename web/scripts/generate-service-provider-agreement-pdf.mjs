import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");

const logoPath = path.join(publicDir, "images", "logos", "Taskzing-Logo-light-mode_1.png");
const outputPath = path.join(publicDir, "service-provider-agreement-taskzing.pdf");

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([595.28, 841.89]); // A4
const { width, height } = page.getSize();

const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

const logoBytes = await fs.readFile(logoPath);
const logoJpgBytes = await sharp(logoBytes).flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer();
const logoImage = await pdfDoc.embedJpg(logoJpgBytes);
const logoDims = logoImage.scale(0.11);
page.drawImage(logoImage, { x: 22, y: height - 48, width: logoDims.width, height: logoDims.height });

const headerRuleY = height - 58;
page.drawLine({
  start: { x: 22, y: headerRuleY },
  end: { x: width - 22, y: headerRuleY },
  thickness: 1.6,
  color: rgb(0.75, 0.79, 0.85),
});

const heading = "Service Provider Agreement (Form)";
const headingSize = 20;
const headingWidth = fontBold.widthOfTextAtSize(heading, headingSize);
page.drawText(heading, {
  x: (width - headingWidth) / 2,
  y: headerRuleY - 30,
  size: headingSize,
  font: fontBold,
  color: rgb(0.11, 0.17, 0.24),
});

let y = headerRuleY - 58;

function line(text, opts = {}) {
  const size = opts.size ?? 10;
  const font = opts.bold ? fontBold : fontRegular;
  page.drawText(text, { x: opts.x ?? 48, y, size, font, color: rgb(0.15, 0.2, 0.28) });
  y -= opts.gap ?? 14;
}

function section(title) {
  y -= 4;
  line(title, { bold: true, size: 11, gap: 16 });
}

line("Document ID: ______________________      Agreement Date: ______________________", { size: 9, gap: 16 });
line("Please complete this agreement form accurately before starting the service.", { size: 9, gap: 12 });
line("Both parties should review all sections, confirm payment terms, and keep a signed copy for records.", {
  size: 9,
  gap: 18,
});

section("1) Service Provider Details");
line("Provider Full Name: _____________________________________________________________");
line("Provider TaskZing User ID: ______________________________________________________");
line("Provider Phone: _____________________________  Provider Email: _____________________");
line("Provider Address: _______________________________________________________________");
line("Primary Skills / Services: _______________________________________________________", { gap: 18 });

section("2) Client Details");
line("Client Full Name: ______________________________________________________________");
line("Client TaskZing User ID: ________________________________________________________");
line("Client Phone: ______________________________  Client Email: ________________________");
line("Client Address: _________________________________________________________________", { gap: 18 });

section("3) Service Scope and Deliverables");
line("Service Title: ___________________________________________________________________");
line("Service Category: _______________________________________________________________");
line("Location of Work: _______________________________________________________________");
line("Start Date: _______________________________   End Date: ____________________________");
line("Estimated Duration: _____________________________________________________________");
line("Detailed Scope / Deliverables:");
line("________________________________________________________________________________");
line("________________________________________________________________________________", { gap: 18 });

section("4) Payment Terms");
line("Payment Type (Fixed / Hourly / Milestone): ________________________________________");
line("Currency: ___________________   Agreed Amount / Rate: ______________________________");
line("Advance Payment (if any): ________________________________________________________");
line("Milestones / Payout Terms:");
line("________________________________________________________________________________");
line("________________________________________________________________________________");
line("Payment Method Agreed: __________________________________________________________", { gap: 18 });

section("5) Service Standards and Conditions");
line("Provider commitments (quality, timeline, communication):");
line("________________________________________________________________________________");
line("Client commitments (access, approvals, cooperation):");
line("________________________________________________________________________________");
line("Cancellation / Change Terms:");
line("________________________________________________________________________________", { gap: 18 });

section("6) Signatures");
line("Provider Name: _____________________  Signature: _______________________  Date: ________");
line("Client Name: _______________________  Signature: _______________________  Date: ________");
line("Witness (optional): _________________  Signature: _______________________  Date: ________");

section("Note");
line("By signing this form, both parties agree to TaskZing Terms & Conditions.", { size: 9, gap: 12 });
line("TaskZing is not liable for payment disputes, non-payment, service disputes, damages, delays,", {
  size: 9,
  gap: 12,
});
line("or contractual claims between client and provider unless explicitly provided in official TaskZing workflow.", {
  size: 9,
  gap: 12,
});

const bytes = await pdfDoc.save();
await fs.writeFile(outputPath, bytes);
console.log(`Generated ${outputPath}`);
