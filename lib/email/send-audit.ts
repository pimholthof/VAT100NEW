import { Resend } from "resend";
import { buildBaseEmailHtml } from "./template";
import { formatCurrency, formatDateLong } from "@/lib/format";

const resend = new Resend(process.env.RESEND_API_KEY);

interface AuditFinding {
  type: "receipt" | "invoice" | "hour";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}

interface AuditReportOptions {
  email: string;
  quarter: number;
  year: number;
  score: number;
  findings: AuditFinding[];
}

export async function sendAuditReport(options: AuditReportOptions) {
  const { email, quarter, year, score, findings } = options;

  const scoreColor = score > 90 ? "#10B981" : score > 70 ? "#F59E0B" : "#EF4444";
  const statusLabel = score > 90 ? "GEZOND" : score > 70 ? "AANDACHT VEREIST" : "KRITIEK";

  let findingsHtml = findings.length > 0
    ? `
      <div style="margin-top:40px;">
        <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:16px;">Audit Bevindingen</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${findings.map(f => `
            <tr style="border-bottom:1px solid #F0F0F0;">
              <td style="padding:16px 0;">
                <div style="font-size:14px;font-weight:bold;margin-bottom:4px;">${f.title}</div>
                <div style="font-size:12px;opacity:0.6;">${f.description}</div>
              </td>
              <td style="padding:16px 0;text-align:right;">
                <span style="font-size:9px;font-weight:900;text-transform:uppercase;padding:4px 8px;border:1px solid #000;color:${f.severity === 'high' ? '#EF4444' : f.severity === 'medium' ? '#F59E0B' : '#000'}">${f.severity}</span>
              </td>
            </tr>
          `).join("")}
        </table>
      </div>
    `
    : `<p style="margin-top:32px;font-style:italic;opacity:0.5;">Geen kritieke missers gevonden. Je administratie is in topvorm.</p>`;

  const contentHtml = `
    <p style="margin-bottom:32px;">Beste founder,</p>
    <p style="margin-bottom:32px;">De VAT100 Tax Auditor heeft een scan uitgevoerd op je administratie voor <strong>Kwartaal ${quarter}, ${year}</strong>.</p>
    
    <div style="background:#000000;color:#FFFFFF;padding:40px;text-align:center;margin-bottom:48px;">
      <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.3em;opacity:0.5;margin-bottom:16px;">Fiscale Gezondheid Score</div>
      <div style="font-size:72px;font-weight:900;line-height:1;margin-bottom:8px;">${score}%</div>
      <div style="font-size:12px;font-weight:900;letter-spacing:0.2em;color:${scoreColor}">${statusLabel}</div>
    </div>

    ${findingsHtml}

    <p style="margin-top:48px;font-size:14px;opacity:0.6;">Log in op de VAT100 Hub voor een gedetailleerd overzicht per missende bon of factuur.</p>
  `;

  return resend.emails.send({
    from: process.env.EMAIL_FROM || "VAT100 Auditor <auditor@vat100.nl>",
    to: [email],
    subject: `VAT100 Fiscale Scan: Q${quarter} ${year} - Score ${score}%`,
    html: buildBaseEmailHtml({
      title: "Audit Rapport",
      contentHtml,
      cta: {
        label: "BEKIJK AUDIT LOG",
        url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/audit`
      }
    }),
  });
}
