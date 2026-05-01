import { test, expect } from '@playwright/test';

/**
 * Pin dat alle fiscale export-endpoints geen data lekken aan ongeauthenticeerde
 * requests. We accepteren alle 4xx/5xx statussen — het enige dat we zeker
 * willen weten is dat de happy-path payload (PDF/CSV) niet wordt geserveerd.
 */
const FISCAL_EXPORTS = [
  { path: '/api/export/btw-aangifte?year=2026&quarter=1', label: 'BTW-aangifte PDF' },
  { path: '/api/export/btw?year=2026&quarter=1', label: 'BTW CSV' },
  { path: '/api/export/icp?year=2026&quarter=1', label: 'ICP-opgave CSV' },
  { path: '/api/export/ib-aangifte?year=2025', label: 'IB-aangifte CSV' },
  { path: '/api/export/activastaat?year=2025', label: 'Activastaat CSV' },
  { path: '/api/export/invoices', label: 'Facturen CSV' },
  { path: '/api/export/receipts', label: 'Bonnen CSV' },
  { path: '/api/export/transactions', label: 'Transacties CSV' },
];

test.describe('Fiscale export-endpoints — auth-gate', () => {
  for (const { path, label } of FISCAL_EXPORTS) {
    test(`${label} weigert ongeauthenticeerde request`, async ({ request }) => {
      const res = await request.get(path);

      // Geen succes-status — alles 4xx/5xx is acceptabel zolang er maar
      // geen daadwerkelijke export wordt teruggegeven.
      expect(res.status()).toBeGreaterThanOrEqual(400);

      const contentType = res.headers()['content-type'] ?? '';
      expect(contentType).not.toContain('application/pdf');
      expect(contentType).not.toContain('text/csv');
    });
  }
});
