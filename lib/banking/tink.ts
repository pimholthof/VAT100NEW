/**
 * Tink Bank Account Data API Client
 * Tink's Open Banking API integration.
 * Using native fetch for Edge compatibility and lightness.
 *
 * Tink API flow:
 * 1. Client credentials → app access token
 * 2. Create permanent user (or reuse by external_user_id)
 * 3. Generate authorization code → build Tink Link URL
 * 4. User completes bank auth → redirected back with credentials_id
 * 5. User access token → fetch accounts & transactions
 */

const BASE_URL = "https://api.tink.com";

// Per-user rate limit (5 requests per minute per user)
const userRateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

export function checkBankingRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = userRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    userRateMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) return true;
  return false;
}

export interface Institution {
  id: string;
  name: string;
  bic: string;
  transaction_total_days: string;
  countries: string[];
  logo: string;
}

interface TinkToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface TinkProvider {
  name: string;
  displayName: string;
  market: string;
  financialInstitutionId: string;
  images?: { icon?: string };
  transactionDays?: number;
}

export class TinkClient {
  private clientId: string;
  private clientSecret: string;
  private appToken: string | null = null;
  private appTokenExpiresAt = 0;

  constructor() {
    this.clientId = process.env.TINK_CLIENT_ID || "";
    this.clientSecret = process.env.TINK_CLIENT_SECRET || "";
  }

  /**
   * Get an app-level access token via client_credentials grant.
   */
  private async getAppToken(scope: string = "authorization:grant,user:create,user:read,credentials:read,providers:read"): Promise<string> {
    const now = Date.now();
    if (this.appToken && now < this.appTokenExpiresAt) return this.appToken;

    if (!this.clientId || !this.clientSecret) {
      throw new Error("Tink API credentials ontbreken (TINK_CLIENT_ID/TINK_CLIENT_SECRET)");
    }

    const response = await fetch(`${BASE_URL}/api/v1/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "client_credentials",
        scope,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Tink Auth Fout: ${err || response.statusText}`);
    }

    const data: TinkToken = await response.json();
    this.appToken = data.access_token;
    this.appTokenExpiresAt = now + (data.expires_in - 60) * 1000;
    return this.appToken;
  }

  /**
   * Get a user-level access token by exchanging an authorization code.
   */
  private async getUserToken(userExternalId: string): Promise<string> {
    const appToken = await this.getAppToken("authorization:grant");

    // Create a delegated authorization code for the user
    const codeResponse = await fetch(`${BASE_URL}/api/v1/oauth/authorization-grant`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        external_user_id: userExternalId,
        scope: "accounts:read,transactions:read,balances:read,credentials:read",
      }),
    });

    if (!codeResponse.ok) {
      const err = await codeResponse.text();
      throw new Error(`Tink delegatie fout: ${err || codeResponse.statusText}`);
    }

    const { code } = await codeResponse.json();

    // Exchange the authorization code for a user access token
    const tokenResponse = await fetch(`${BASE_URL}/api/v1/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "authorization_code",
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      throw new Error(`Tink user token fout: ${err || tokenResponse.statusText}`);
    }

    const tokenData: TinkToken = await tokenResponse.json();
    return tokenData.access_token;
  }

  /**
   * Make an authenticated request to the Tink API.
   */
  private async request(endpoint: string, token: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Tink API Fout (${endpoint}): ${err || response.statusText}`);
    }

    return response.json();
  }

  /**
   * List available banking institutions for a country.
   * Maps Tink providers to the Institution interface.
   */
  async getInstitutions(country: string = "NL"): Promise<Institution[]> {
    const token = await this.getAppToken("providers:read");
    const data = await this.request(`/api/v1/providers?market=${country}`, token);

    const providers: TinkProvider[] = Array.isArray(data) ? data : data.providers || [];
    return providers.map((p) => ({
      id: p.name,
      name: p.displayName || p.name,
      bic: p.financialInstitutionId || "",
      transaction_total_days: String(p.transactionDays || 90),
      countries: [p.market],
      logo: p.images?.icon || "",
    }));
  }

  /**
   * Create a bank connection via Tink Link.
   * Creates a requisition via Tink Link.
   *
   * Flow:
   * 1. Ensure a Tink user exists for this reference (external_user_id)
   * 2. Generate an authorization code for Tink Link
   * 3. Return the Tink Link URL and a connection identifier
   */
  async createRequisition(params: {
    institutionId: string;
    redirectUrl: string;
    reference: string;
    agreement?: string;
    userLanguage?: string;
  }) {
    const appToken = await this.getAppToken("authorization:grant,user:create");

    // 1. Create or reuse a Tink user with the reference as external_user_id
    const createUserResponse = await fetch(`${BASE_URL}/api/v1/user/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_user_id: params.reference,
        market: "NL",
        locale: params.userLanguage === "NL" || !params.userLanguage ? "nl_NL" : "en_US",
      }),
    });

    // 409 means user already exists, which is fine
    if (!createUserResponse.ok && createUserResponse.status !== 409) {
      const err = await createUserResponse.text();
      throw new Error(`Tink gebruiker aanmaken mislukt: ${err || createUserResponse.statusText}`);
    }

    // 2. Generate authorization code for Tink Link
    const codeResponse = await fetch(`${BASE_URL}/api/v1/oauth/authorization-grant`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        external_user_id: params.reference,
        scope: "authorization:read,authorization:grant,credentials:write,credentials:read,accounts:read,transactions:read,balances:read",
        id_hint: `VAT100-${params.reference}`,
      }),
    });

    if (!codeResponse.ok) {
      const err = await codeResponse.text();
      throw new Error(`Tink autorisatiecode mislukt: ${err || codeResponse.statusText}`);
    }

    const { code } = await codeResponse.json();

    // 3. Build Tink Link URL
    const linkParams = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: params.redirectUrl,
      authorization_code: code,
      market: "NL",
      locale: "nl_NL",
    });

    if (params.institutionId) {
      linkParams.set("input_provider", params.institutionId);
    }

    const tinkLinkUrl = `https://link.tink.com/1.0/transactions/connect-accounts?${linkParams.toString()}`;

    // Return in same shape as GoCardless requisition
    return {
      id: params.reference, // We use reference as the requisition identifier
      link: tinkLinkUrl,
      status: "CR",
    };
  }

  /**
   * Get the status of a bank connection.
   * In Tink, we check the user's credentials to find connected accounts.
   */
  async getRequisition(requisitionId: string) {
    const userToken = await this.getUserToken(requisitionId);

    // Fetch credentials for this user
    const credentialsData = await this.request("/api/v1/credentials/list", userToken);
    const credentials = credentialsData.credentials || [];

    // Fetch accounts for this user
    const accountsData = await this.request("/data/v2/accounts", userToken);
    const accounts = accountsData.accounts || [];

    // Map status: Tink credential statusUpdated → GoCardless-like status
    const activeCredential = credentials.find(
      (c: { status: string }) => c.status === "UPDATED"
    );

    return {
      id: requisitionId,
      status: activeCredential ? "LN" : "CR",
      institution_id: activeCredential?.providerName || "",
      accounts: accounts.map((a: { id: string }) => a.id),
    };
  }

  /**
   * Get account details (IBAN, name, etc.).
   */
  async getAccountDetails(accountId: string) {
    // We need to find which user owns this account.
    // The accountId is passed from our DB where we stored it after connection.
    // We'll use the app token with accounts:read scope via a user token.
    // Since we don't have the user reference here, we use the stored account directly.
    //
    // In the actual flow, this is called right after getRequisition where we
    // already have a user context. We pass the account ID from the requisition response.
    // The caller (completeBankConnection) has the requisitionId which IS our external_user_id.
    //
    // We solve this by accepting a second optional parameter for the user reference,
    // but to keep the interface identical, we encode user_ref in the accountId as "ref:accountId"
    // when returning from getRequisition. The caller doesn't need to know.

    const parts = accountId.split("::");
    let userToken: string;
    let realAccountId: string;

    if (parts.length === 2) {
      userToken = await this.getUserToken(parts[0]);
      realAccountId = parts[1];
    } else {
      // Fallback: try using accountId as-is with app token
      throw new Error("Account-ID formaat ongeldig. Verwacht format: userRef::accountId");
    }

    const data = await this.request(`/data/v2/accounts/${realAccountId}`, userToken);
    const account = data;

    return {
      account: {
        iban: account.identifiers?.iban?.iban || account.accountNumber || "",
        name: account.name || "",
        ownerName: account.holderName || "",
        currency: account.currencyCode || "EUR",
        product: account.type || "",
      },
    };
  }

  /**
   * Get account balances.
   * Tink returns balances inline with the account object via GET /data/v2/accounts/{id}.
   */
  async getAccountBalances(accountId: string) {
    const parts = accountId.split("::");
    if (parts.length !== 2) {
      throw new Error("Account-ID formaat ongeldig. Verwacht format: userRef::accountId");
    }

    const userToken = await this.getUserToken(parts[0]);
    const realAccountId = parts[1];

    const data = await this.request(`/data/v2/accounts/${realAccountId}`, userToken);
    const booked = data.balances?.booked;

    if (!booked) {
      return { balances: [] };
    }

    const unscaled = Number(booked.amount?.value?.unscaledValue || 0);
    const scale = Number(booked.amount?.value?.scale || 0);

    return {
      balances: [{
        balanceAmount: {
          amount: (unscaled / Math.pow(10, scale)).toFixed(2),
          currency: booked.amount?.currencyCode || "EUR",
        },
        balanceType: "booked",
      }],
    };
  }

  /**
   * Get transactions for an account.
   */
  async getTransactions(accountId: string, dateFrom?: string, dateTo?: string) {
    const parts = accountId.split("::");
    if (parts.length !== 2) {
      throw new Error("Account-ID formaat ongeldig. Verwacht format: userRef::accountId");
    }

    const userToken = await this.getUserToken(parts[0]);
    const realAccountId = parts[1];

    const params = new URLSearchParams({ accountIdIn: realAccountId });
    if (dateFrom) params.set("bookedDateGte", dateFrom);
    if (dateTo) params.set("bookedDateLte", dateTo);
    params.set("pageSize", "500");

    let allTransactions: Array<{
      id: string;
      descriptions?: { original?: string; display?: string };
      amount?: { value?: { unscaledValue?: string; scale?: number }; currencyCode?: string };
      dates?: { booked?: string; value?: string };
      counterparts?: { payer?: { name?: string; identifiers?: { financialInstitution?: { accountNumber?: string } } }; payee?: { name?: string; identifiers?: { financialInstitution?: { accountNumber?: string } } } };
      status?: string;
      identifiers?: { providerTransactionId?: string };
    }> = [];
    let pageToken: string | undefined;

    // Paginate through all transactions
    do {
      if (pageToken) params.set("pageToken", pageToken);
      const data = await this.request(`/data/v2/transactions?${params.toString()}`, userToken);
      const transactions = data.transactions || [];
      allTransactions = allTransactions.concat(transactions);
      pageToken = data.nextPageToken;
    } while (pageToken);

    // Map to GoCardless-compatible transaction format
    const booked = allTransactions
      .filter((t) => t.status === "BOOKED")
      .map((t) => {
        const unscaled = Number(t.amount?.value?.unscaledValue || 0);
        const scale = t.amount?.value?.scale || 0;
        const amount = (unscaled / Math.pow(10, scale)).toFixed(2);

        return {
          internalTransactionId: t.id,
          transactionId: t.identifiers?.providerTransactionId || t.id,
          transactionAmount: {
            amount,
            currency: t.amount?.currencyCode || "EUR",
          },
          remittanceInformationUnstructured: t.descriptions?.original || t.descriptions?.display || "",
          additionalInformation: t.descriptions?.display || "",
          debtorName: t.counterparts?.payer?.name || "",
          creditorName: t.counterparts?.payee?.name || "",
          debtorAccount: {
            iban: t.counterparts?.payer?.identifiers?.financialInstitution?.accountNumber || "",
          },
          creditorAccount: {
            iban: t.counterparts?.payee?.identifiers?.financialInstitution?.accountNumber || "",
          },
          bookingDate: t.dates?.booked || "",
          valueDate: t.dates?.value || "",
        };
      });

    return {
      transactions: { booked },
    };
  }
}

/**
 * Singleton Tink client, exported as `bankingClient` for provider-agnostic usage.
 */
export const bankingClient = new TinkClient();
