/**
 * Feature flags — één bron voor optionele/gefaseerde diensten.
 *
 * Elke vlag staat standaard UIT en wordt expliciet aangezet via een
 * environment variable. Zo rollen we onderdelen los van een release uit
 * zonder code te wijzigen — en zetten we ze net zo eenvoudig weer stil.
 */

/**
 * Rechtstreekse Digipoort-aangifte naar de Belastingdienst.
 *
 * Vereist een PKIoverheid-services­certificaat (mTLS) én
 * `NEXT_PUBLIC_DIGIPOORT_ENABLED=true`. Standaard uit: de productie-
 * integratie is nog niet gecertificeerd, dus tonen we de knop niet en
 * weigeren we de actie. Tot die tijd exporteert de gebruiker de aangifte
 * als PDF en dient deze zelf in via Mijn Belastingdienst Zakelijk.
 */
export function isDigipoortEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DIGIPOORT_ENABLED === "true";
}

/**
 * Bèta-modus: gratis toegang zonder paywall, met actieve feedback-werving.
 *
 * Aangezet via `NEXT_PUBLIC_BETA_MODE=true`. Registratie blijft afgeschermd
 * met een uitnodigingscode (`BETA_INVITE_CODE`, server-side). Zet de vlag
 * later uit om het normale abonnementsmodel te activeren.
 */
export function isBetaMode(): boolean {
  return process.env.NEXT_PUBLIC_BETA_MODE === "true";
}

/**
 * Groei-/community-extra's: het referral-programma en het publieke netwerk.
 *
 * Niet-fiscale features die los van de kern staan. Standaard UIT — de kern
 * van VAT100 is de fiscale tool, niet een community. Zet aan via
 * `NEXT_PUBLIC_GROWTH_ENABLED=true` wanneer je deze wilt tonen.
 */
export function isGrowthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GROWTH_ENABLED === "true";
}
