import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { escapeHtml } from "@/lib/format";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: prefs } = await supabase
    .from("email_preferences")
    .select("marketing_emails, reminder_emails")
    .eq("unsubscribe_token", token)
    .single();

  if (!prefs) {
    return new NextResponse("Ongeldige link.", { status: 404 });
  }

  const html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Emailvoorkeuren — VAT100</title>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 60px 24px; color: #000; background: #fff; }
    .container { max-width: 480px; margin: 0 auto; }
    h1 { font-size: 32px; font-weight: 900; letter-spacing: -0.03em; margin: 0 0 8px; }
    .sub { font-size: 13px; opacity: 0.4; margin: 0 0 40px; }
    label { display: flex; align-items: center; gap: 12px; padding: 16px 0; border-bottom: 0.5px solid rgba(0,0,0,0.08); font-size: 14px; cursor: pointer; }
    input[type="checkbox"] { width: 18px; height: 18px; accent-color: #000; }
    button { margin-top: 32px; background: #000; color: #fff; border: none; padding: 14px 28px; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; }
    .success { color: #16a34a; font-size: 13px; margin-top: 16px; display: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>EMAILVOORKEUREN</h1>
    <p class="sub">Beheer welke emails je van VAT100 ontvangt.</p>
    <form id="prefs" method="POST" action="/api/unsubscribe/${escapeHtml(token)}">
      <label>
        <input type="checkbox" name="marketing_emails" ${prefs.marketing_emails ? "checked" : ""}>
        Marketing en product updates
      </label>
      <label>
        <input type="checkbox" name="reminder_emails" ${prefs.reminder_emails ? "checked" : ""}>
        Betaalherinneringen en waarschuwingen
      </label>
      <button type="submit">Opslaan</button>
      <p class="success" id="msg">Voorkeuren opgeslagen.</p>
    </form>
    <script>
      document.getElementById('prefs').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await fetch(e.target.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            marketing_emails: fd.has('marketing_emails'),
            reminder_emails: fd.has('reminder_emails'),
          }),
        });
        document.getElementById('msg').style.display = 'block';
      });
    </script>
  </div>
</body>
</html>`.trim();

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createServiceClient();

  let body: { marketing_emails?: boolean; reminder_emails?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { error } = await supabase
    .from("email_preferences")
    .update({
      marketing_emails: body.marketing_emails ?? false,
      reminder_emails: body.reminder_emails ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("unsubscribe_token", token);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
