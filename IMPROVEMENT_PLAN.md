# VAT100 Verbeterplan — Micro-stappen

Elk item is 1 bestand, 1 wijziging, ~15 minuten werk.

---

## Sprint 1: Taal & Tekst (5 min per stuk)

- [ ] **1a** `InvoiceForm.tsx` — "Select Client" → "Selecteer klant"
- [ ] **1b** `InvoiceMetadata.tsx` — "High/Low/Zero" → "Hoog (21%)/Laag (9%)/Nul (0%)"
- [ ] **1c** `QuoteForm.tsx` — Engelse placeholders → NL
- [ ] **1d** Scan alle overige componenten op Engels → fix per bestand

---

## Sprint 2: Input veiligheid (1 bestand per keer)

- [ ] **2a** `InvoiceLineRow.tsx` — `min="0"` op quantity input
- [ ] **2b** `InvoiceLineRow.tsx` — `min="0"` op rate input
- [ ] **2c** `ReceiptForm.tsx` — `min="0"` op bedrag inputs
- [ ] **2d** `ClientForm.tsx` — email format check toevoegen
- [ ] **2e** `ClientForm.tsx` — KVK format check (8 cijfers)
- [ ] **2f** `ClientForm.tsx` — BTW nummer format check

---

## Sprint 3: Type safety (1 fix per keer)

- [ ] **3a** `CommandMenu.tsx` — `ChatMessage` interface maken, `any` weg
- [ ] **3b** `CommandMenu.tsx` — API response type valideren
- [ ] **3c** Zoek alle `any` types → lijst maken
- [ ] **3d** Fix `any` types één voor één (per bestand)

---

## Sprint 4: Accessibility basics (1 component per keer)

- [ ] **4a** `CommandMenu.tsx` — `role="dialog"` + `aria-modal="true"` toevoegen
- [ ] **4b** `DashboardError.tsx` — `role="alert"` toevoegen
- [ ] **4c** `DashboardNav.tsx` — `aria-current="page"` op actieve link
- [ ] **4d** Dashboard `layout.tsx` — skip-to-content link toevoegen
- [ ] **4e** Invoice status select — `aria-busy` tijdens mutatie

---

## Sprint 5: Kleine bug fixes (1 fix per keer)

- [ ] **5a** `DashboardClient.tsx` — event listener cleanup in useEffect return
- [ ] **5b** `ClientQuickCreate.tsx` — wacht op invalidateQueries voor submit
- [ ] **5c** `InvoiceForm.tsx` — auto-save error tonen aan gebruiker
- [ ] **5d** `ReceiptForm.tsx` — specifiekere AI-foutmelding

---

## Sprint 6: Tests toevoegen (1 test file per keer)

- [ ] **6a** `lib/format.test.ts` — 3 extra edge case tests toevoegen
- [ ] **6b** `lib/validation/validation.test.ts` — email validatie tests
- [ ] **6c** `lib/export/csv.test.ts` — nieuw: CSV output testen
- [ ] **6d** `features/invoices/actions.test.ts` — nieuw: createInvoice mock test
- [ ] **6e** `features/clients/actions.test.ts` — nieuw: createClient mock test

---

## Sprint 7: Responsive fixes (1 component per keer)

- [ ] **7a** `DashboardNav.tsx` — font scaling consistent maken
- [ ] **7b** `Table.tsx` — horizontaal scrollbaar op mobiel
- [ ] **7c** Factuur lijst pagina — touch targets 44x44px
- [ ] **7d** Receipt lijst pagina — touch targets 44x44px

---

## Sprint 8: UX kleine verbeteringen

- [ ] **8a** Lege state tekst voor factuurlijst ("Nog geen facturen")
- [ ] **8b** Lege state tekst voor klantenlijst
- [ ] **8c** Lege state tekst voor bonnetjeslijst
- [ ] **8d** Loading skeleton consistent maken op alle lijstpagina's

---

## Sprint 9: Security quick wins

- [ ] **9a** Share token — expiry veld toevoegen aan DB schema
- [ ] **9b** Share token — expiry check in `fetch-public.ts`
- [ ] **9c** File upload — magic byte check toevoegen in `ReceiptUpload.tsx`
- [ ] **9d** API rate limit — simpele in-memory limiter op `/api/ai/chat`

---

## Sprint 10: Feature afronding

- [ ] **10a** Factuur dupliceren — server action toevoegen
- [ ] **10b** Factuur dupliceren — knop in UI
- [ ] **10c** Credit nota — visuele markering in lijst (rood/label)
- [ ] **10d** BTW pagina — kwartaal selector dropdown

---

## Volgorde

Start bij Sprint 1, werk naar beneden. Elke sprint is onafhankelijk — je kunt er ook doorheen springen. De nummering (1a, 1b, ...) geeft de volgorde binnen een sprint.
