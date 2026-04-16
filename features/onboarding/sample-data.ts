"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils/errors";

/**
 * Maakt een realistische set voorbeelddata aan voor een nieuwe gebruiker:
 * 2 fictieve klanten, 3 facturen (betaald, verzonden, concept) en 3 bonnen.
 * Alle records krijgen is_sample = true zodat ze met één klik te wissen zijn.
 *
 * Idempotent: als er al voorbeelddata bestaat, doet deze functie niets.
 * Ook: als de gebruiker al eigen facturen of bonnen heeft, slaan we over.
 */
export async function seedSampleData(): Promise<
  ActionResult<{ created: boolean; reason?: string }>
> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    // Al voorbeelddata? Dan niets doen.
    const { count: existingSamples } = await supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_sample", true);
    if ((existingSamples ?? 0) > 0) {
      return { error: null, data: { created: false, reason: "already_seeded" } };
    }

    // Al echte data? Niets doen — niet vervuilen.
    const [{ count: invoiceCount }, { count: receiptCount }] = await Promise.all([
      supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("receipts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);
    if ((invoiceCount ?? 0) > 0 || (receiptCount ?? 0) > 0) {
      return { error: null, data: { created: false, reason: "user_has_data" } };
    }

    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const daysAgo = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return d;
    };
    const daysAhead = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d;
    };

    // 1. Twee voorbeeldklanten
    const { data: clients, error: clientsErr } = await supabase
      .from("clients")
      .insert([
        {
          user_id: user.id,
          name: "Voorbeeld Studio B.V.",
          contact_name: "Anna de Vries",
          email: "anna@voorbeeldstudio.nl",
          city: "Amsterdam",
          postal_code: "1012 AB",
          address: "Prinsengracht 100",
          kvk_number: "12345678",
          is_sample: true,
        },
        {
          user_id: user.id,
          name: "Voorbeeld Galerie",
          contact_name: "Kees Janssen",
          email: "kees@voorbeeldgalerie.nl",
          city: "Rotterdam",
          postal_code: "3011 AA",
          address: "Coolsingel 5",
          is_sample: true,
        },
      ])
      .select("id, name");

    if (clientsErr || !clients || clients.length < 2) {
      return {
        error: clientsErr?.message ?? "Kon voorbeeldklanten niet aanmaken.",
      };
    }

    const [clientA, clientB] = clients;

    // 2. Drie facturen: betaald, verzonden, concept
    const invoicesToInsert = [
      {
        user_id: user.id,
        client_id: clientA.id,
        invoice_number: "VOORBEELD-001",
        status: "paid",
        issue_date: iso(daysAgo(45)),
        due_date: iso(daysAgo(15)),
        subtotal_ex_vat: 1250,
        vat_amount: 262.5,
        total_inc_vat: 1512.5,
        notes: "Voorbeeldfactuur — reeds betaald.",
        is_sample: true,
      },
      {
        user_id: user.id,
        client_id: clientB.id,
        invoice_number: "VOORBEELD-002",
        status: "sent",
        issue_date: iso(daysAgo(10)),
        due_date: iso(daysAhead(20)),
        subtotal_ex_vat: 2000,
        vat_amount: 420,
        total_inc_vat: 2420,
        notes: "Voorbeeldfactuur — verzonden, wacht op betaling.",
        is_sample: true,
      },
      {
        user_id: user.id,
        client_id: clientA.id,
        invoice_number: "VOORBEELD-003",
        status: "draft",
        issue_date: iso(today),
        due_date: iso(daysAhead(30)),
        subtotal_ex_vat: 750,
        vat_amount: 157.5,
        total_inc_vat: 907.5,
        notes: "Voorbeeldfactuur — concept.",
        is_sample: true,
      },
    ];

    const { data: insertedInvoices, error: invoicesErr } = await supabase
      .from("invoices")
      .insert(invoicesToInsert)
      .select("id, invoice_number");

    if (invoicesErr || !insertedInvoices) {
      // Rol klanten niet terug — gebruiker kan ze handmatig wissen; logisch spoor is OK.
      return { error: invoicesErr?.message ?? "Kon voorbeeldfacturen niet aanmaken." };
    }

    // 3. Factuurregels
    const linesToInsert = [
      {
        invoice_id: insertedInvoices[0].id,
        description: "Grafisch ontwerp voorjaarscampagne",
        quantity: 25,
        unit: "uren",
        rate: 50,
        amount: 1250,
        sort_order: 0,
      },
      {
        invoice_id: insertedInvoices[1].id,
        description: "Redactie & art direction magazine",
        quantity: 20,
        unit: "uren",
        rate: 100,
        amount: 2000,
        sort_order: 0,
      },
      {
        invoice_id: insertedInvoices[2].id,
        description: "Fotobewerking productshoot",
        quantity: 15,
        unit: "uren",
        rate: 50,
        amount: 750,
        sort_order: 0,
      },
    ];

    await supabase.from("invoice_lines").insert(linesToInsert);

    // 4. Drie bonnen
    const receiptsToInsert = [
      {
        user_id: user.id,
        vendor_name: "Coolblue",
        amount_ex_vat: 1000,
        vat_amount: 210,
        amount_inc_vat: 1210,
        vat_rate: 21,
        category: "Computer & software",
        cost_code: 4330,
        receipt_date: iso(daysAgo(30)),
        business_percentage: 100,
        is_sample: true,
      },
      {
        user_id: user.id,
        vendor_name: "Albert Heijn",
        amount_ex_vat: 18.35,
        vat_amount: 1.65,
        amount_inc_vat: 20,
        vat_rate: 9,
        category: "Representatie",
        cost_code: 4610,
        receipt_date: iso(daysAgo(14)),
        business_percentage: 100,
        is_sample: true,
      },
      {
        user_id: user.id,
        vendor_name: "NS",
        amount_ex_vat: 22.94,
        vat_amount: 2.06,
        amount_inc_vat: 25,
        vat_rate: 9,
        category: "Reiskosten",
        cost_code: 4510,
        receipt_date: iso(daysAgo(5)),
        business_percentage: 100,
        is_sample: true,
      },
    ];

    await supabase.from("receipts").insert(receiptsToInsert);

    return { error: null, data: { created: true } };
  } catch (e) {
    return { error: getErrorMessage(e) };
  }
}

/**
 * Verwijdert alle is_sample = true records van de gebruiker.
 * Invoice_lines worden via ON DELETE CASCADE meegenomen.
 */
export async function clearSampleData(): Promise<
  ActionResult<{ deleted: { invoices: number; clients: number; receipts: number } }>
> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    const [invRes, rcptRes, clientRes] = await Promise.all([
      supabase
        .from("invoices")
        .delete({ count: "exact" })
        .eq("user_id", user.id)
        .eq("is_sample", true),
      supabase
        .from("receipts")
        .delete({ count: "exact" })
        .eq("user_id", user.id)
        .eq("is_sample", true),
      supabase
        .from("clients")
        .delete({ count: "exact" })
        .eq("user_id", user.id)
        .eq("is_sample", true),
    ]);

    return {
      error: null,
      data: {
        deleted: {
          invoices: invRes.count ?? 0,
          receipts: rcptRes.count ?? 0,
          clients: clientRes.count ?? 0,
        },
      },
    };
  } catch (e) {
    return { error: getErrorMessage(e) };
  }
}

/**
 * Lichtgewicht check voor dashboard-banner: heeft deze gebruiker nog
 * voorbeelddata? Gebruik head:true om round-trip snel te houden.
 */
export async function hasSampleData(): Promise<ActionResult<{ exists: boolean }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  try {
    const { count } = await supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_sample", true);

    return { error: null, data: { exists: (count ?? 0) > 0 } };
  } catch (e) {
    return { error: getErrorMessage(e) };
  }
}
