/**
 * GoCardless (Nordigen) Bank Account Data API Client
 * Using native fetch for Edge compatibility and lightness.
 */

const BASE_URL = "https://bankaccountdata.gocardless.com/api/v2";

// Per-user rate limit for GoCardless API (5 requests per minute per user)
const userRateMap = new Map<string, { count: number; resetAt: number }>();
const GC_RATE_LIMIT = 5;
const GC_RATE_WINDOW_MS = 60_000;

export function checkGoCardlessRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = userRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    userRateMap.set(userId, { count: 1, resetAt: now + GC_RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  if (entry.count > GC_RATE_LIMIT) return true;
  return false;
}

export interface GoCardlessToken {
  access: string;
  access_expires: number;
  refresh: string;
  refresh_expires: number;
}

export interface Institution {
  id: string;
  name: string;
  bic: string;
  transaction_total_days: string;
  countries: string[];
  logo: string;
}

export class GoCardlessClient {
  private secretId: string;
  private secretKey: string;
  private token: string | null = null;

  constructor() {
    this.secretId = process.env.GOCARDLESS_SECRET_ID || "";
    this.secretKey = process.env.GOCARDLESS_SECRET_KEY || "";
  }

  private async getValidToken(): Promise<string> {
    if (this.token) return this.token;

    if (!this.secretId || !this.secretKey) {
      throw new Error("GoCardless API credentials missing (GOCARDLESS_SECRET_ID/KEY)");
    }

    const response = await fetch(`${BASE_URL}/token/new/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret_id: this.secretId,
        secret_key: this.secretKey,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`GoCardless Auth Error: ${err.detail || response.statusText}`);
    }

    const data: GoCardlessToken = await response.json();
    this.token = data.access;
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = await this.getValidToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(`GoCardless API Error (${endpoint}): ${err.detail || response.statusText}`);
    }

    return response.json();
  }

  async getInstitutions(country: string = "NL"): Promise<Institution[]> {
    return this.request(`/institutions/?country=${country}`);
  }

  async createRequisition(params: {
    institutionId: string;
    redirectUrl: string;
    reference: string;
    agreement?: string;
    userLanguage?: string;
  }) {
    return this.request("/requisitions/", {
      method: "POST",
      body: JSON.stringify({
        institution_id: params.institutionId,
        redirect: params.redirectUrl,
        reference: params.reference,
        agreement: params.agreement,
        user_language: params.userLanguage || "NL",
      }),
    });
  }

  async getRequisition(requisitionId: string) {
    return this.request(`/requisitions/${requisitionId}/`);
  }

  async getAccountDetails(accountId: string) {
    return this.request(`/accounts/${accountId}/details/`);
  }

  async getAccountBalances(accountId: string) {
    return this.request(`/accounts/${accountId}/balances/`);
  }

  async getTransactions(accountId: string, dateFrom?: string, dateTo?: string) {
    let url = `/accounts/${accountId}/transactions/`;
    if (dateFrom || dateTo) {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      url += `?${params.toString()}`;
    }
    return this.request(url);
  }
}

export const gocardless = new GoCardlessClient();
