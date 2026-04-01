import { Resend } from "resend";
import { buildBaseEmailHtml } from "./template";
import type { ActionResult } from "@/lib/types";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendStrategyBriefing(options: {
  email: string;
  mrr: string;
  churn: string;
  pipeline: string;
  users: number;
  insight: string;
}): Promise<ActionResult> {
  const { email, mrr, churn, pipeline, users, insight } = options;
  const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vat100.nl'}/admin`;

  const contentHtml = `
    <div style="background-color:#F5F5F7;padding:24px;border:4px solid #000000;margin-bottom:32px;">
      <h2 style="font-family:serif;font-style:italic;font-weight:900;font-size:32px;letter-spacing:-1px;margin:0 0 16px 0;">WEEKLY SCAN</h2>
      
      <div style="display:grid;grid-template-cols:1fr 1fr;gap:16px;">
        <div style="border-top:2px solid #000000;padding-top:12px;">
          <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0;opacity:0.6;">Current MRR</p>
          <p style="font-size:24px;font-weight:900;margin:4px 0 0 0;">${mrr}</p>
        </div>
        <div style="border-top:2px solid #000000;padding-top:12px;">
          <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0;opacity:0.6;">Pipeline Value</p>
          <p style="font-size:24px;font-weight:900;margin:4px 0 0 0;">${pipeline}</p>
        </div>
      </div>

      <div style="margin-top:24px;border-top:2px solid #000000;padding-top:12px;">
        <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0;opacity:0.6;">Revenue at Risk (Churn)</p>
        <p style="font-size:20px;font-weight:900;color:#D0021B;margin:4px 0 0 0;">${churn}</p>
      </div>
    </div>

    <p style="font-size:16px;line-height:1.6;margin-bottom:24px;">${insight}</p>
    
    <div style="background-color:#000000;color:#FFFFFF;padding:16px;text-align:center;margin-bottom:32px;">
      <p style="margin:0;font-size:14px;font-weight:bold;">Active Users: ${users}</p>
    </div>

    <p style="font-size:14px;opacity:0.6;margin-bottom:32px;">Deze wekelijkse scan is geconsolideerd op basis van live data uit de Founder Hub.</p>
  `;

  try {
    const { error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || "ai@vat100.nl",
      to: email,
      subject: `Strategic Briefing: Status ${mrr} MRR`,
      html: buildBaseEmailHtml({
        title: "CFO Advisor",
        contentHtml,
        cta: { label: "Bekijk Radar", url: adminUrl },
        footerText: "Your asset is evolving."
      }),
    });

    if (sendError) return { error: sendError.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}
