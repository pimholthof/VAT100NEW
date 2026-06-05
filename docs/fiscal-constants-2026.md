# Fiscale constanten 2026 — verificatielog

Verificatie van de constanten in `lib/tax/dutch-tax-2026.ts` tegen publieke
bronnen (juni 2026). De primaire bron (belastingdienst.nl) blokkeert
geautomatiseerd ophalen; onderstaande is geverifieerd via overheids- en
accountantsbronnen. **Laat een fiscalist/RB dit één keer aftekenen vóór de
overgang van bèta naar betaald**, met name de arbeidskorting-trajecten.

## Aftekening

**Afgetekend voor de gratis bèta op 2026-06-05 door de producteigenaar.** De
constanten in `lib/tax/dutch-tax-2026.ts` zijn akkoord voor de bèta, waarin elke
fiscale uitkomst expliciet een **indicatie met disclaimer** is ("Indicatie op
basis van de tarieven 2026. Geen belastingadvies.").

Eén eerlijke kanttekening: drie randwaarden konden niet onafhankelijk tegen de
officiële Belastingdienst-tabel worden geverifieerd (die blokkeert geautomati-
seerd ophalen) en wijken ≤ €27 af van een secundaire bron. Het effect op de
indicatie is verwaarloosbaar. **Cross-check deze vóór de overgang naar betaald**
tegen het officiële tabellenboek 2026:
- Arbeidskorting-maximum (€5.712 vs €5.685) en traject-3-grens (€45.593 vs €45.592).
- AHK-afbouwgrens (€29.739 vs €29.736).
- KIA-tabel 2026 en de afschrijvingsdrempel (wettelijk stabiel, maar bevestigen).

## ✅ Bevestigd correct

| Constante | Code | Bevestigd 2026 | Bron |
|-----------|------|----------------|------|
| Box 1 schijf 1 | €38.883 @ 35,75% | €38.883 @ 35,75% | Ondernemersplein, MKB Servicedesk |
| Box 1 schijf 2 | €78.426 @ 37,56% | €78.426 @ 37,56% | idem |
| Box 1 schijf 3 | 49,5% | 49,5% | idem |
| MKB-winstvrijstelling | 12,7% | 12,7% (ná ondernemersaftrek) | Belastingdienst (mkb-winstvrijstelling-2026) |
| Zelfstandigenaftrek | €1.200 | €1.200 | zzpnieuws, MKB Servicedesk, Ondernemersplein |
| AHK maximum | €3.115 | €3.115 | accountantsbronnen |
| AHK afbouwpercentage | 6,398% | 6,398% | idem |
| AHK nulpunt | €78.426 | €78.426 | idem |
| Arbeidskorting afbouwpercentage | 6,51% | 6,51% | idem |
| Arbeidskorting nulpunt | €132.920 | €132.920 | idem |

De **volgorde** van de winstberekening (KIA → ondernemersaftrek →
MKB-winstvrijstelling) is bevestigd: de MKB-vrijstelling wordt berekend over de
winst ná de ondernemersaftrek. Dit is per 2026-06-02 in de code gecorrigeerd
(de KIA werd voorheen ná de MKB-vrijstelling toegepast).

## ⚠️ Te bevestigen door fiscalist (kleine afwijkingen)

| Constante | Code | Secundaire bron | Verschil |
|-----------|------|-----------------|----------|
| Arbeidskorting maximum | €5.712 | €5.685 | €27 — vermoedelijk een traject-grens/percentage |
| Arbeidskorting traject-3 grens | €45.593 | €45.592 | €1 |
| AHK afbouwgrens | €29.739 | €29.736 | €3 |

Deze zijn niet tegen de primaire bron geverifieerd (geblokkeerd). Het verschil
is klein en het betreft een **indicatie** met disclaimer, maar corrigeer dit
zodra de officiële Belastingdienst-tabel beschikbaar is. Het arbeidskorting-
maximum is in de code afgeleid uit de drie opbouwtrajecten
(`AK_TRAJECT*_END` × `AK_TRAJECT*_RATE`); pas de trajecten aan, niet alleen
`akMax`.

## ❓ Nog niet geverifieerd deze ronde

- KIA 2026 (`KIA_*`): drempel €2.901, 28% tot €71.683, vast €20.072 tot
  €132.746, afbouw 7,56% tot €398.236. Controleren tegen de officiële
  KIA-tabel 2026.
- Afschrijving (20%/jaar max, €450-drempel) — wettelijk stabiel, maar
  bevestigen.

## Bronnen

- https://ondernemersplein.overheid.nl/wetswijzigingen/belastingschijven-inkomstenbelasting-veranderen-in-2026/
- https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/inkomstenbelasting/veranderingen-inkomstenbelasting-2026/mkb-winstvrijstelling-2026
- https://www.zzpnieuws.nl/zelfstandigenaftrek-2026/
- https://www.mkbservicedesk.nl/nieuws/ondernemersnieuws/zelfstandigenaftrek-2026-verlaagd
