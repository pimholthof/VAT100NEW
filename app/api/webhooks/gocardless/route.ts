import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const GC_BASE = "https://bankaccountdata.gocardless.com/api/v2";

interface GCTokenResponse {
  access: string;
  access_expires: number;
  refresh: string;
  refresh_expires: number;
}

interface GCRequisition {
  id: string;
  status: string;
  institution_id: string;
  accounts: string[];
  reference: string;
}

interface GCAccount {
  id: string;
  iban: string;
  institution_id: string;
  status: string;
  owner_name: string;
}

interface GCInstitution {
  id: string;
  name: string;
  bic: string;
  logo: string;
  countries: string[];
}

async function getServiceToken(): Promise<string> {
  const secretId = process.env.GOCARDLESS_SECRET_ID;
  const secretKey = process.env.GOCARDLESS_SECRET_KEY;

  if (!secretId || !secretKey) {
    throw new Error("GoCardless API-sleutels niet geconfigureerd.");
  }

  const res = await fetch(`${GC_BASE}/token/new/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret_id: secretId,
      secret_key: secretKey,
    }),
  });

  if (!res.ok) {
    throw new Error(`GoCardless token fout: ${res.status}`);
  }

  const data: GCTokenResponse = await res.json();
  return data.access;
}

/**
 * GoCardless redirect callback.
 * Na bank-autorisatie stuurt GoCardless de gebruiker terug naar deze URL.
 * Query params: ?ref={user_id}
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectTarget = `${baseUrl}/dashboard/settings/bank`;

  if (!ref) {
    return NextResponse.redirect(
      `${redirectTarget}?error=missing_ref`
    );
  }

  try {
    const supabase = createServiceClient();

    // Zoek de pending requisition voor deze gebruiker
    const { data: connection, error: connError } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("user_id", ref)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (connError || !connection) {
      return NextResponse.redirect(
        `${redirectTarget}?error=no_pending_connection`
      );
    }

    // Controleer de requisition status bij GoCardless
    const token = await getServiceToken();

    const reqRes = await fetch(
      `${GC_BASE}/requisitions/${connection.requisition_id}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!reqRes.ok) {
      return NextResponse.redirect(
        `${redirectTarget}?error=requisition_check_failed`
      );
    }

    const requisition: GCRequisition = await reqRes.json();

    // Status "LN" = linked
    if (requisition.status === "LN" && requisition.accounts.length > 0) {
      const accountId = requisition.accounts[0];

      // Haal account details op
      const accRes = await fetch(`${GC_BASE}/accounts/${accountId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      let iban: string | null = null;
      if (accRes.ok) {
        const account: GCAccount = await accRes.json();
        iban = account.iban ?? null;
      }

      // Haal bank naam op
      let institutionName = connection.institution_id;
      try {
        const instRes = await fetch(
          `${GC_BASE}/institutions/${connection.institution_id}/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (instRes.ok) {
          const inst: GCInstitution = await instRes.json();
          institutionName = inst.name;
        }
      } catch {
        // Gebruik institution_id als fallback
      }

      // Werk de connectie bij
      await supabase
        .from("bank_connections")
        .update({
          status: "linked",
          account_id: accountId,
          iban,
          institution_name: institutionName,
        })
        .eq("id", connection.id);

      return NextResponse.redirect(
        `${redirectTarget}?success=linked`
      );
    }

    // Niet succesvol gekoppeld — werk status bij
    const statusMap: Record<string, string> = {
      EX: "expired",
      RJ: "revoked",
      SA: "pending",
      GA: "pending",
    };

    const mappedStatus = statusMap[requisition.status] ?? "pending";

    await supabase
      .from("bank_connections")
      .update({ status: mappedStatus })
      .eq("id", connection.id);

    return NextResponse.redirect(
      `${redirectTarget}?error=not_linked&status=${requisition.status}`
    );
  } catch (err) {
    console.error("GoCardless callback fout:", err);
    return NextResponse.redirect(
      `${redirectTarget}?error=callback_failed`
    );
  }
}
