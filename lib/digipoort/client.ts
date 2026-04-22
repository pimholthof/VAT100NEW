/**
 * Digipoort SBR-Banking integratie — scaffolding.
 *
 * Digipoort is de berichtenbox van de Nederlandse overheid voor SBR-aangiften
 * (BTW, ICP, IB). Inleveren vereist:
 *   - PKIoverheid services-certificaat (mTLS)
 *   - XBRL-instantiedocument volgens NT-taxonomy 2026
 *   - SOAP-envelope tegen aanleverservice.digipoort.nl
 *
 * Deze scaffolding levert het contract + mock-implementatie. De echte
 * mTLS-flow wordt ingevuld zodra het PKIoverheid-certificaat is aangeschaft
 * (~€150-250/jaar via Logius-partner).
 */

export type DigipoortFilingType = "btw_aangifte" | "btw_icp" | "ib_aangifte";

export interface DigipoortSubmission {
  filingType: DigipoortFilingType;
  period: string;       // 2026Q1, 2026
  fiscalNumber: string; // BSN of RSIN
  xbrlDocument: string; // XBRL-instantiedocument als string
}

export interface DigipoortResponse {
  status: "accepted" | "rejected" | "error";
  reference: string | null;
  acceptedAt: string | null;
  errors: string[];
  rawResponse: unknown;
}

const DIGIPOORT_ENDPOINT =
  process.env.DIGIPOORT_ENDPOINT ??
  "https://preprod-aanleveren-creditor.procesinfrastructuur.nl/aanleverservice";

const MOCK_MODE = !process.env.DIGIPOORT_CERT_PEM;

/**
 * Submit een XBRL-aangifte naar Digipoort.
 *
 * In mock-mode (geen certificaat geconfigureerd) wordt een accepted response
 * teruggegeven zonder echt te verzenden — dit maakt lokale/staging tests
 * mogelijk zonder PKIoverheid-kosten.
 */
export async function submitToDigipoort(
  submission: DigipoortSubmission,
): Promise<DigipoortResponse> {
  if (MOCK_MODE) {
    return {
      status: "accepted",
      reference: `MOCK-${submission.filingType}-${submission.period}-${Date.now()}`,
      acceptedAt: new Date().toISOString(),
      errors: [],
      rawResponse: { mock: true, endpoint: DIGIPOORT_ENDPOINT },
    };
  }

  // TODO: vervangen door echte mTLS SOAP-aanroep tegen Digipoort
  // aanleverservice met:
  //   - PKIoverheid client-certificaat (process.env.DIGIPOORT_CERT_PEM)
  //   - WS-Security signed request
  //   - XBRL-payload als MTOM-attachment
  throw new Error("Digipoort productie-integratie nog niet geconfigureerd.");
}

/**
 * Bouw een minimale XBRL-instantie voor een BTW-aangifte.
 *
 * Volledig XBRL-genereren vereist NT-taxonomy lookup; deze functie produceert
 * alleen de skeleton. Complete implementatie gebruikt een XBRL-library zoals
 * arelle-python of een SBR-gateway (bv. Nextens).
 */
export function buildBtwXbrl(input: {
  rsin: string;
  period: string;
  rubrieken: Record<string, number>;
}): string {
  const context = `${input.period}`;
  const lines = Object.entries(input.rubrieken)
    .map(([code, value]) =>
      `  <bd-i:${code} contextRef="${context}" unitRef="EUR" decimals="0">${value}</bd-i:${code}>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<xbrli:xbrl
  xmlns:xbrli="http://www.xbrl.org/2003/instance"
  xmlns:bd-i="http://www.nltaxonomie.nl/nt16/bd/20221207/dictionary/bd-data"
  xmlns:iso4217="http://www.xbrl.org/2003/iso4217">
  <xbrli:context id="${context}">
    <xbrli:entity>
      <xbrli:identifier scheme="http://www.belastingdienst.nl/nlrsin">${input.rsin}</xbrli:identifier>
    </xbrli:entity>
    <xbrli:period><xbrli:instant>${new Date().toISOString().slice(0, 10)}</xbrli:instant></xbrli:period>
  </xbrli:context>
  <xbrli:unit id="EUR"><xbrli:measure>iso4217:EUR</xbrli:measure></xbrli:unit>
${lines}
</xbrli:xbrl>`;
}
