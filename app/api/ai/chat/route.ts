import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Geen vraag gesteld" }, { status: 400 });
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }

    // Fetch real user context
    const [invoicesRes, receiptsRes, profileRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("invoice_number, status, total_inc_vat, due_date, client:clients(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("receipts")
        .select("vendor_name, amount_inc_vat, category, receipt_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("profiles")
        .select("full_name, studio_name")
        .eq("id", user.id)
        .single(),
    ]);

    const profile = profileRes.data;
    const invoices = invoicesRes.data ?? [];
    const receipts = receiptsRes.data ?? [];

    type InvoiceRow = { invoice_number: string; status: string; total_inc_vat: number; due_date: string | null; client: { name: string } | null };
    const openInvoices = (invoices as unknown as InvoiceRow[]).filter(
      (i) => i.status === "sent" || i.status === "overdue"
    );
    const openTotal = openInvoices.reduce((s, i) => s + Number(i.total_inc_vat), 0);

    const contextStr = `
Gebruiker: ${profile?.full_name ?? "Onbekend"} (${profile?.studio_name ?? "Geen bedrijfsnaam"})
Openstaande facturen: ${openInvoices.length} (totaal: €${openTotal.toFixed(2)})
Recente facturen: ${(invoices as unknown as InvoiceRow[]).map((i) => `${i.invoice_number} - ${i.status} - €${i.total_inc_vat}`).join("; ")}
Recente bonnen: ${receipts.map((r) => `${r.vendor_name ?? "?"} - €${r.amount_inc_vat} (${r.category})`).join("; ")}
`;

    const systemPrompt = `Je bent de VAT100 Autonome CFO Assistent.
Je helpt zzp'ers en freelancers met inzicht in hun cashflow, facturen en bonnetjes.
Houd je antwoorden professioneel, zeer beknopt, to-the-point en behulpzaam. Vermijd markdown formatting tenzij nodig (zoals opsommingen of vetgedrukt).
Context van de gebruiker:\n${contextStr}`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: query,
        }
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");

    return NextResponse.json({
      text: textContent?.type === "text" ? textContent.text : "Ik kon helaas geen antwoord formuleren."
    });

  } catch (error) {
    console.error("Error in AI Chat:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij de verwerking van je vraag." },
      { status: 500 }
    );
  }
}
