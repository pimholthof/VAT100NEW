/**
 * Hardcoded transactie classificatie op basis van trefwoorden.
 * Werkt zonder AI, zonder externe koppelingen. Altijd beschikbaar.
 *
 * Dit is de kern van Nederlandse freelancer-boekhouding:
 * elke uitgave valt in een categorie, elke categorie heeft een BTW-tarief.
 */

interface ClassificationRule {
  keywords: string[];
  category: string;
  costCode: number;
  defaultVatRate: 0 | 9 | 21;
  businessPercentage: number;
}

/**
 * Hardcoded regels: trefwoord → categorie + kostsoort + BTW-tarief.
 * Volgorde is prioriteit: eerste match wint.
 */
const CLASSIFICATION_RULES: ClassificationRule[] = [
  // Huisvesting
  { keywords: ["huur", "rent", "verhuur", "huurcontract"], category: "Huur", costCode: 4100, defaultVatRate: 21, businessPercentage: 100 },
  { keywords: ["energie", "eneco", "vattenfall", "greenchoice", "essent", "stroom", "gas", "elektr"], category: "Energie", costCode: 4105, defaultVatRate: 21, businessPercentage: 100 },

  // Kantoor
  { keywords: ["adobe", "figma", "sketch", "notion", "slack", "zoom", "microsoft", "google workspace", "dropbox", "1password", "github", "gitlab", "vercel", "netlify", "heroku", "aws", "azure", "digitalocean", "cloudflare"], category: "Computer & software", costCode: 4330, defaultVatRate: 21, businessPercentage: 100 },
  { keywords: ["apple", "macbook", "ipad", "keyboard", "monitor", "muis", "headset", "webcam", "printer", "scanner"], category: "Computer & software", costCode: 4330, defaultVatRate: 21, businessPercentage: 100 },
  { keywords: ["kpn", "t-mobile", "vodafone", "tele2", "simyo", "telefoon", "mobiel"], category: "Telefoonkosten", costCode: 4340, defaultVatRate: 21, businessPercentage: 100 },
  { keywords: ["ziggo", "xs4all", "internet", "hosting", "domein", "domain", "ssl", "webhosting", "transip", "strato"], category: "Webhosting & internet", costCode: 4341, defaultVatRate: 21, businessPercentage: 100 },
  { keywords: ["postnl", "dhl", "ups", "fedex", "porto", "postzegel"], category: "Portokosten", costCode: 4350, defaultVatRate: 21, businessPercentage: 100 },
  { keywords: ["bol.com kantoor", "ikea", "action kantoor", "bureau", "stoel", "lamp"], category: "Kantoorkosten", costCode: 4300, defaultVatRate: 21, businessPercentage: 100 },

  // Vervoer
  { keywords: ["ns ", "ns.nl", "ov-chipkaart", "connexxion", "arriva", "ret", "gvb", "htm", "breng"], category: "Vervoerskosten (OV/auto)", costCode: 4500, defaultVatRate: 9, businessPercentage: 100 },
  { keywords: ["shell", "bp ", "total", "esso", "tango", "tinq", "benzine", "diesel", "tankstation", "laadpaal", "fastned"], category: "Vervoerskosten (OV/auto)", costCode: 4500, defaultVatRate: 21, businessPercentage: 100 },
  { keywords: ["q-park", "parkeer", "parkbee", "yellowbrick", "parkmobile"], category: "Parkeerkosten", costCode: 4520, defaultVatRate: 21, businessPercentage: 100 },
  { keywords: ["booking.com", "airbnb", "hotel", "hostel", "vliegticket", "klm", "transavia", "ryanair", "easyjet"], category: "Reiskosten (verblijf/buitenland)", costCode: 4510, defaultVatRate: 21, businessPercentage: 100 },

  // Marketing
  { keywords: ["facebook ads", "meta ads", "google ads", "linkedin ads", "instagram", "advertentie", "reclame", "flyer", "drukwerk", "vistaprint"], category: "Reclame & marketing", costCode: 4600, defaultVatRate: 21, businessPercentage: 100 },
  { keywords: ["seo", "webdesign", "website", "wordpress", "squarespace", "wix"], category: "Website & SEO", costCode: 4620, defaultVatRate: 21, businessPercentage: 100 },

  // Representatie (80/20 regel)
  { keywords: ["restaurant", "eetcafe", "bistro", "diner", "lunch zakelijk", "borrel", "cadeau klant", "relatiegeschenk"], category: "Representatiekosten", costCode: 4610, defaultVatRate: 21, businessPercentage: 80 },
  { keywords: ["thuisbezorgd", "uber eats", "deliveroo", "just eat", "domino", "mcdonalds", "starbucks", "koffie"], category: "Eten & drinken (zakelijk)", costCode: 4900, defaultVatRate: 21, businessPercentage: 80 },

  // Professioneel
  { keywords: ["accountant", "belastingadviseur", "fiscalist", "boekhouder"], category: "Accountant & advies", costCode: 4700, defaultVatRate: 21, businessPercentage: 100 },
  { keywords: ["advocaat", "notaris", "juridisch", "rechtsbijstand"], category: "Juridische kosten", costCode: 4720, defaultVatRate: 21, businessPercentage: 100 },

  // Verzekeringen
  { keywords: ["verzekering", "insurance", "allianz", "aegon", "nationale nederlanden", "centraal beheer", "aov", "arbeidsongeschiktheid", "beroepsaansprakelijkheid"], category: "Verzekeringen", costCode: 4400, defaultVatRate: 21, businessPercentage: 100 },

  // Bank
  { keywords: ["bankkosten", "abnamro", "abn amro", "ing bank", "rabobank", "rabo", "knab", "bunq", "n26", "revolut", "wise", "transaction fee"], category: "Bankkosten", costCode: 4750, defaultVatRate: 0, businessPercentage: 100 },

  // Abonnementen
  { keywords: ["spotify", "netflix", "linkedin premium", "chatgpt", "openai", "anthropic", "canva", "miro", "asana", "monday", "trello", "basecamp"], category: "Abonnementen & licenties", costCode: 4800, defaultVatRate: 21, businessPercentage: 100 },
];

export interface ClassificationResult {
  category: string;
  costCode: number;
  defaultVatRate: 0 | 9 | 21;
  businessPercentage: number;
  confidence: number;
  matchedKeyword: string;
}

/**
 * Classificeer een banktransactie op basis van omschrijving en tegenpartij.
 * Geen AI nodig. Werkt altijd.
 */
export function classifyTransaction(
  description: string,
  counterpartName: string
): ClassificationResult | null {
  const text = `${description} ${counterpartName}`.toLowerCase().trim();
  if (!text) return null;

  for (const rule of CLASSIFICATION_RULES) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return {
          category: rule.category,
          costCode: rule.costCode,
          defaultVatRate: rule.defaultVatRate,
          businessPercentage: rule.businessPercentage,
          confidence: 0.85,
          matchedKeyword: keyword,
        };
      }
    }
  }

  return null;
}

/**
 * Bepaal automatisch het BTW-tarief op basis van kostsoort.
 * Hardcoded Nederlandse wetgeving — geen externe afhankelijkheid.
 */
export function getDefaultVatRateForCostCode(costCode: number): 0 | 9 | 21 {
  const rule = CLASSIFICATION_RULES.find((r) => r.costCode === costCode);
  return rule?.defaultVatRate ?? 21;
}

/**
 * Bepaal automatisch het zakelijk percentage op basis van kostsoort.
 */
export function getDefaultBusinessPercentage(costCode: number): number {
  const rule = CLASSIFICATION_RULES.find((r) => r.costCode === costCode);
  return rule?.businessPercentage ?? 100;
}
