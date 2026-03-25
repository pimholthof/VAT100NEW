# VAT100 Verbeterplan — Micro-stappen

Elk item is 1 bestand, 1 wijziging, ~15 minuten werk.

---

## Sprint 1: Taal & Tekst (5 min per stuk) ✓

- [x] **1a** `InvoiceForm.tsx` — "Select Client" → "Selecteer klant"
- [x] **1b** `InvoiceMetadata.tsx` — "High/Low/Zero" → "Hoog (21%)/Laag (9%)/Vrijgesteld (0%)"
- [x] **1c** `QuoteForm.tsx` — Engelse placeholders → NL
- [x] **1d** Scan alle overige componenten op Engels → fix per bestand

---

## Sprint 2: Input veiligheid (1 bestand per keer) ✓

- [x] **2a** `InvoiceLineRow.tsx` — `min="0"` op quantity input
- [x] **2b** `InvoiceLineRow.tsx` — `min="0"` op rate input
- [x] **2c** `ReceiptForm.tsx` — `min="0"` op bedrag inputs
- [x] **2d** `ClientForm.tsx` — email format check toevoegen
- [x] **2e** `ClientForm.tsx` — KVK format check (8 cijfers)
- [x] **2f** `ClientForm.tsx` — BTW nummer format check

---

## Sprint 3: Type safety (1 fix per keer) ✓

- [x] **3a** `CommandMenu.tsx` — `ChatMessage` interface maken, `any` weg
- [x] **3b** `CommandMenu.tsx` — API response type valideren
- [x] **3c** Zoek alle `any` types → geen gevonden (codebase is clean)
- [x] **3d** Fix `any` types één voor één — n.v.t.

---

## Sprint 4: Accessibility basics (1 component per keer) ✓

- [x] **4a** `CommandMenu.tsx` — `role="dialog"` + `aria-modal="true"` toevoegen
- [x] **4b** `DashboardError.tsx` — `role="alert"` toevoegen
- [x] **4c** `DashboardNav.tsx` — `aria-current="page"` op actieve link
- [x] **4d** Dashboard `layout.tsx` — skip-to-content link toevoegen
- [x] **4e** Invoice status select — `aria-label` + `aria-busy` tijdens mutatie

---

## Sprint 5: Kleine bug fixes (1 fix per keer) ✓

- [x] **5a** `DashboardClient.tsx` — event listener cleanup al correct
- [x] **5b** `ClientQuickCreate.tsx` — wacht op invalidateQueries voor submit
- [x] **5c** `InvoiceForm.tsx` — auto-save error tonen aan gebruiker
- [x] **5d** `ReceiptForm.tsx` — specifiekere AI-foutmelding

---

## Sprint 6: Tests toevoegen (1 test file per keer) ✓

- [x] **6a** `lib/format.test.ts` — calculateVat, calculateLineTotals, escapeHtml tests
- [x] **6b** `lib/validation/validation.test.ts` — quoteSchema tests
- [x] **6c** `lib/export/csv.test.ts` — nieuw: CSV output testen
- [ ] **6d** `features/invoices/actions.test.ts` — nieuw: createInvoice mock test
- [ ] **6e** `features/clients/actions.test.ts` — nieuw: createClient mock test

---

## Sprint 7: Responsive fixes (1 component per keer) ✓

- [ ] **7a** `DashboardNav.tsx` — font scaling consistent maken
- [x] **7b** `Table.tsx` — TableWrapper horizontaal scrollbaar op mobiel
- [ ] **7c** Factuur lijst pagina — touch targets 44x44px
- [ ] **7d** Receipt lijst pagina — touch targets 44x44px

---

## Sprint 8: UX kleine verbeteringen ✓

- [x] **8a** Lege state tekst voor factuurlijst — al aanwezig
- [x] **8b** Lege state tekst voor klantenlijst — al aanwezig
- [x] **8c** Lege state tekst voor bonnetjeslijst — al aanwezig
- [ ] **8d** Loading skeleton consistent maken op alle lijstpagina's

---

## Sprint 9: Security quick wins

- [ ] **9a** Share token — expiry veld toevoegen aan DB schema
- [ ] **9b** Share token — expiry check in `fetch-public.ts`
- [ ] **9c** File upload — magic byte check toevoegen in `ReceiptUpload.tsx`
- [x] **9d** API rate limit — simpele in-memory limiter op `/api/ai/chat`

---

## Sprint 10: Feature afronding

- [x] **10a** Factuur dupliceren — server action toevoegen
- [x] **10b** Factuur dupliceren — knop in UI
- [ ] **10c** Credit nota — visuele markering in lijst (rood/label)
- [ ] **10d** BTW pagina — kwartaal selector dropdown

---

## Volgorde

Start bij Sprint 1, werk naar beneden. Elke sprint is onafhankelijk — je kunt er ook doorheen springen. De nummering (1a, 1b, ...) geeft de volgorde binnen een sprint.
