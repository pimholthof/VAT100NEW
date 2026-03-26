import type Anthropic from "@anthropic-ai/sdk";

// ─── Claude Tool Definitions for VAT100 AI CFO ───
// These tools allow Claude to query the user's financial data in Supabase.

export const CFO_TOOLS: Anthropic.Tool[] = [
  {
    name: "zoek_facturen",
    description:
      "Zoek facturen. Kan filteren op status (draft/sent/paid/overdue), klantnaam, datumbereik en bedrag. Geeft factuurdetails terug inclusief klantnaam, bedragen en BTW.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["draft", "sent", "paid", "overdue"],
          description: "Filter op factuurstatus",
        },
        client_name: {
          type: "string",
          description: "Filter op klantnaam (gedeeltelijke match)",
        },
        date_from: {
          type: "string",
          description: "Begindatum (YYYY-MM-DD)",
        },
        date_to: {
          type: "string",
          description: "Einddatum (YYYY-MM-DD)",
        },
        limit: {
          type: "number",
          description: "Maximum aantal resultaten (standaard 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "zoek_bonnetjes",
    description:
      "Zoek bonnetjes en uitgaven. Kan filteren op categorie, leverancier, datumbereik en bedrag.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description: "Filter op kostencategorie",
        },
        vendor_name: {
          type: "string",
          description: "Filter op leveranciersnaam (gedeeltelijke match)",
        },
        date_from: {
          type: "string",
          description: "Begindatum (YYYY-MM-DD)",
        },
        date_to: {
          type: "string",
          description: "Einddatum (YYYY-MM-DD)",
        },
        limit: {
          type: "number",
          description: "Maximum aantal resultaten (standaard 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "zoek_banktransacties",
    description:
      "Zoek banktransacties. Kan filteren op datum, bedrag, omschrijving, tegenpartij en of het inkomsten/uitgaven zijn.",
    input_schema: {
      type: "object" as const,
      properties: {
        date_from: {
          type: "string",
          description: "Begindatum (YYYY-MM-DD)",
        },
        date_to: {
          type: "string",
          description: "Einddatum (YYYY-MM-DD)",
        },
        is_income: {
          type: "boolean",
          description: "true = alleen inkomsten, false = alleen uitgaven",
        },
        counterpart_name: {
          type: "string",
          description: "Filter op naam tegenpartij (gedeeltelijke match)",
        },
        category: {
          type: "string",
          description: "Filter op categorie",
        },
        limit: {
          type: "number",
          description: "Maximum aantal resultaten (standaard 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "bereken_omzet",
    description:
      "Bereken de totale omzet (betaalde facturen) over een opgegeven periode. Kan per maand, kwartaal of jaar.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["maand", "kwartaal", "jaar"],
          description: "Type periode",
        },
        year: {
          type: "number",
          description: "Jaar (bijv. 2026)",
        },
        quarter: {
          type: "number",
          description: "Kwartaal (1-4), alleen bij period=kwartaal",
        },
        month: {
          type: "number",
          description: "Maand (1-12), alleen bij period=maand",
        },
      },
      required: ["period", "year"],
    },
  },
  {
    name: "bereken_btw",
    description:
      "Bereken de BTW-positie over een periode: ontvangen BTW (uit facturen) minus betaalde BTW (uit bonnetjes). Positief = af te dragen, negatief = terug te vragen.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["maand", "kwartaal", "jaar"],
          description: "Type periode",
        },
        year: {
          type: "number",
          description: "Jaar (bijv. 2026)",
        },
        quarter: {
          type: "number",
          description: "Kwartaal (1-4), alleen bij period=kwartaal",
        },
        month: {
          type: "number",
          description: "Maand (1-12), alleen bij period=maand",
        },
      },
      required: ["period", "year"],
    },
  },
  {
    name: "klant_overzicht",
    description:
      "Haal gegevens en factuurhistorie op van een specifieke klant. Toont contactinfo, openstaande en betaalde facturen, en totalen.",
    input_schema: {
      type: "object" as const,
      properties: {
        client_name: {
          type: "string",
          description: "Naam van de klant (gedeeltelijke match)",
        },
      },
      required: ["client_name"],
    },
  },
  {
    name: "financieel_overzicht",
    description:
      "Geeft een compleet financieel overzicht: omzet, kosten, openstaande facturen, BTW-positie, banksaldo, en safe-to-spend. Gebruik dit voor brede vragen over de financiele situatie.",
    input_schema: {
      type: "object" as const,
      properties: {
        year: {
          type: "number",
          description: "Jaar (standaard huidig jaar)",
        },
      },
      required: [],
    },
  },
  {
    name: "zoek_klanten",
    description:
      "Zoek klanten op naam. Geeft contactgegevens en KVK/BTW-nummers terug.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Klantnaam (gedeeltelijke match)",
        },
        limit: {
          type: "number",
          description: "Maximum aantal resultaten (standaard 20)",
        },
      },
      required: [],
    },
  },
];
