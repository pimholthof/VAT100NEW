/**
 * Kleineondernemersregeling (KOR) — Dutch small-business VAT exemption.
 *
 * Rules (geldig 2026):
 *  - Aanmelden bij Belastingdienst, geldt minimaal 3 jaar (lock-in).
 *  - Drempel: bij overschrijding van €20.000 jaaromzet vervalt KOR per
 *    direct, vanaf de transactie waarmee de drempel wordt gepasseerd.
 *    Vanaf dat moment moet de ondernemer weer BTW factureren en
 *    aangifte doen tot het einde van het lopende jaar.
 *  - Pas 3 jaar later mag opnieuw aangemeld worden.
 *
 * Bron: https://www.belastingdienst.nl (omzetbelasting / KOR).
 */

export const KOR_OMZET_THRESHOLD = 20_000;

/**
 * Bij welk percentage van de drempel waarschuwen we de gebruiker dat
 * KOR-overschrijding nadert. 90% = €18.000.
 */
export const KOR_WARNING_RATIO = 0.9;

export type KorStatus = "within" | "approaching" | "exceeded";

export interface KorCheck {
  /** Of de gebruiker KOR gebruikt volgens hun profiel. */
  usesKor: boolean;
  /** Status t.o.v. de €20.000 drempel. */
  status: KorStatus;
  /** Jaaromzet (excl. BTW) waarop de check is gebaseerd. */
  yearRevenue: number;
  /** Resterend bedrag tot de drempel (0 als al overschreden). */
  remainingHeadroom: number;
  /** Nederlandse waarschuwingstekst, of null als alles in orde is. */
  warning: string | null;
}

/**
 * Toets of de gebruiker nog binnen de KOR-drempel valt.
 *
 * @param yearRevenue Jaaromzet (excl. BTW) tot nu toe.
 * @param usesKor Of de gebruiker is aangemeld voor KOR.
 */
export function checkKor(yearRevenue: number, usesKor: boolean): KorCheck {
  const safeRevenue = Number.isFinite(yearRevenue) ? Math.max(0, yearRevenue) : 0;
  const remainingHeadroom = Math.max(0, KOR_OMZET_THRESHOLD - safeRevenue);

  if (!usesKor) {
    return {
      usesKor: false,
      status: "within",
      yearRevenue: safeRevenue,
      remainingHeadroom,
      warning: null,
    };
  }

  if (safeRevenue >= KOR_OMZET_THRESHOLD) {
    return {
      usesKor: true,
      status: "exceeded",
      yearRevenue: safeRevenue,
      remainingHeadroom: 0,
      warning:
        "Je hebt de KOR-drempel van €20.000 overschreden. Vanaf de transactie " +
        "die de drempel passeert moet je weer BTW in rekening brengen en " +
        "aangifte doen. Meld je af bij de Belastingdienst.",
    };
  }

  if (safeRevenue >= KOR_OMZET_THRESHOLD * KOR_WARNING_RATIO) {
    return {
      usesKor: true,
      status: "approaching",
      yearRevenue: safeRevenue,
      remainingHeadroom,
      warning:
        `Let op: je nadert de KOR-drempel. Nog €${remainingHeadroom.toFixed(0)} ` +
        "ruimte tot €20.000 jaaromzet. Bij overschrijding vervalt KOR per direct.",
    };
  }

  return {
    usesKor: true,
    status: "within",
    yearRevenue: safeRevenue,
    remainingHeadroom,
    warning: null,
  };
}
