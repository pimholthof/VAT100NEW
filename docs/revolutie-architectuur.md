# Revolutie-architectuur — van slimme kopie naar live projectie

> Hoe een revolutionair boekhoudprogramma werkt: niet de werkelijkheid overtypen,
> maar erop abonneren. Dit document werkt de richting uit; de eerste steen staat
> al in code (`lib/ledger/fiscal-events.ts`).

## De omkering

Boekhouden is vandaag het handmatig opnieuw afleiden van feiten die al digitaal
bestaan (bank, facturen, tarieven, KVK). De revolutie:

> **De administratie is geen ding dat je onderhoudt — het is een live projectie
> van stromen waarop je geabonneerd bent.**

Het grootboek wordt een *read-model* over een onveranderlijke gebeurtenisstroom.

## De pijlers

1. **Continue afsluiting.** Elke gebeurtenis wordt direct geboekt; de aangifte is
   altijd af en indienbaar. Het kwartaaleinde is een non-event — je tikt "verstuur"
   op iets dat al klopt.
2. **Event-sourced kern.** Alles is een onveranderlijke gebeurtenis
   (`invoice.issued`, `payment.received`, `expense.captured`, `tax.paid`,
   `rate.changed`, …); elke weergave is een projectie. Gevolg: realtime,
   tijdreizen (`asOf`), retroactieve herberekening, en de 7-jaar-bewaarplicht is
   triviaal (replay de stroom). **Seed: `lib/ledger/fiscal-events.ts`.**
3. **Koppelingen zijn het product.** Bank (PSD2/AIS), e-facturatie
   (Peppol/UBL → ViDA), Belastingdienst (SBR/Digipoort als twee-richtingen-feed:
   ook aanslag/kenmerk/tarieven *ophalen*), KVK, pensioen/AOV, betaalproviders,
   agenda. Elke koppeling is een sensor die de stroom voedt.
4. **De Drie Potten worden échte rekeningen.** Bij binnenkomst sweept het systeem
   BTW + IB naar een geringfencede reserve — je kunt het geld van de fiscus niet
   meer uitgeven. Geldhelderheid wordt geldfysica.
5. **ViDA-native.** Bouw voor near-realtime transactie-rapportage: transacties
   stromen terwijl ze gebeuren; de "aangifte" wordt bevestigen/reconciliëren.
   Vooraf-ingevulde aangifte *ophalen* en alleen de verschillen tonen.
6. **Collectieve intelligentie, privé per persoon.** Geanonimiseerde priors
   (patroon → categorie) lossen de koude start op; ieders data blijft privé.
7. **Continue assurance.** De controle-laag + onveranderlijke log produceren een
   realtime "je boeken kloppen aantoonbaar"-attest i.p.v. een jaarlijkse controle.
8. **Zero-UI.** Eén levend getal (*Van jou*) + een gegronde copiloot (LLM met de
   deterministische engine als tool, verzint geen getallen). De app is meestal
   stil en bereikt je alleen bij een echt besluit.

## Efficiëntie = menselijke input naar het irreducibele minimum

```
gestructureerde data bij de bron   → geen invoer
geleerde classificatie + priors    → geen categoriseren
continue afsluiting                → geen periode-einde
live tarieven van de fiscus        → geen handmatige updates
─────────────────────────────────────────────────────────
wat overblijft: alleen de echte oordelen (zakelijk of privé?)
```

## Gouden regel

Bold in architectuur, conservatief op het onomkeerbare. Live ≠ roekeloos:
indienen, versturen en betalen blijven één menselijke tik (de tier-poort,
`lib/autonomy/dispatcher.ts`).

## Routekaart (event-sourcing erin groeien, niet big-bang)

1. **Seed (gedaan):** `projectFiscalState` — positie als projectie + tijdreizen.
2. **Dubbele weergave:** bestaande tabellen blijven bron; gebeurtenissen worden
   ernaast afgeleid, projecties vergeleken met de huidige berekeningen
   (reconciliatie-tests, zoals bij de BTW-rubrieken).
3. **Sensoren als producenten:** bank-sync / Peppol-ontvangst / betalingen
   schrijven gebeurtenissen.
4. **Projecties worden de waarheid:** Drie Potten, BTW-aangifte en jaarrekening
   gaan over de stroom; de tabellen worden caches.
5. **Auto-sweep & ViDA:** echte reserve-rekening en realtime rapportage.
