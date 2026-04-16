#!/usr/bin/env tsx
/**
 * Mollie webhook simulator — lokale QA-helper.
 *
 * POST een Mollie-stijl webhook naar de /api/webhooks/mollie endpoint.
 * Alleen te gebruiken tegen STAGING met een test-API-key. Nooit tegen productie.
 *
 * Voorbeeld:
 *   npx tsx scripts/mollie-webhook-sim.ts \
 *     --url=https://staging.vat100.nl/api/webhooks/mollie \
 *     --payment-id=tr_test_abc123
 *
 * De server zelf valideert de payment bij de Mollie API; dit script
 * simuleert alleen de notificatie. De payment zelf moet bestaan in
 * Mollie's test-mode.
 */

interface Args {
  url: string;
  paymentId: string;
  verbose: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { verbose: false };
  for (const raw of argv.slice(2)) {
    const [key, value] = raw.replace(/^--/, "").split("=");
    switch (key) {
      case "url":
        args.url = value;
        break;
      case "payment-id":
        args.paymentId = value;
        break;
      case "verbose":
        args.verbose = true;
        break;
      case "help":
      case "h":
        printHelp();
        process.exit(0);
    }
  }
  if (!args.url || !args.paymentId) {
    printHelp();
    process.exit(1);
  }
  return args as Args;
}

function printHelp(): void {
  console.log(`Mollie webhook simulator

Gebruik:
  npx tsx scripts/mollie-webhook-sim.ts \\
    --url=<webhook-url> \\
    --payment-id=<tr_...> \\
    [--verbose]

Argumenten:
  --url          De webhook-URL (bv. https://staging.vat100.nl/api/webhooks/mollie)
  --payment-id   De Mollie payment-ID (begint altijd met 'tr_')
  --verbose      Laat de volledige response zien
  --help         Toon deze help

LET OP: gebruik dit script nooit tegen productie. Alleen staging met Mollie test-key.
`);
}

function assertSafeTarget(url: string): void {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const safeHosts = ["localhost", "127.0.0.1", "staging.vat100.nl"];
  const isSafe =
    safeHosts.includes(host) ||
    host.endsWith(".staging.vat100.nl") ||
    host.endsWith(".vercel.app");

  if (!isSafe) {
    console.error(
      `✖ Onveilig target: ${host}\n` +
        `  Simulator mag alleen tegen localhost, staging.vat100.nl of *.vercel.app draaien.`
    );
    process.exit(2);
  }
}

function assertSafePaymentId(id: string): void {
  if (!id.startsWith("tr_")) {
    console.error("✖ Payment-ID moet beginnen met 'tr_'.");
    process.exit(2);
  }
  if (id.length > 50) {
    console.error("✖ Payment-ID is te lang (max 50 tekens).");
    process.exit(2);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  assertSafeTarget(args.url);
  assertSafePaymentId(args.paymentId);

  console.log(`→ POST ${args.url}`);
  console.log(`  id=${args.paymentId}`);

  const body = new URLSearchParams();
  body.set("id", args.paymentId);

  const startedAt = Date.now();
  const response = await fetch(args.url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const elapsed = Date.now() - startedAt;

  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();

  console.log(`← ${response.status} ${response.statusText} (${elapsed}ms)`);

  if (args.verbose) {
    console.log(`  content-type: ${contentType}`);
    console.log(`  body: ${responseText.slice(0, 500)}`);
  }

  if (response.status >= 500) {
    console.error(
      "\n✖ Server-error — bekijk Sentry en webhook_events tabel voor retry-status."
    );
    process.exit(1);
  }
  if (response.status >= 400) {
    console.warn(
      "\n⚠ Client-error — payment-ID onbekend bij Mollie of gevalideerd als ongeldig?"
    );
    process.exit(1);
  }
  console.log("\n✓ Webhook geaccepteerd. Check de subscriptions-tabel voor status.");
}

main().catch((e) => {
  console.error("Onverwachte fout:", e);
  process.exit(1);
});
