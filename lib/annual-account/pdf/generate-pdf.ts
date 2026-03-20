// ─── PDF generation orchestrator ───
// Renders annual account as PDF bytes for both NL and EN

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { AnnualAccountPdfNL } from "./template-nl";
import { AnnualAccountPdfEN } from "./template-en";
import type { AnnualFigures, RawProfile } from "../types";

export interface GeneratedPdfs {
  nl: Buffer;
  en: Buffer;
}

export async function generateAnnualAccountPdfs(
  figures: AnnualFigures,
  profile: RawProfile
): Promise<GeneratedPdfs> {
  const nlElement = createElement(AnnualAccountPdfNL, { figures, profile });
  const enElement = createElement(AnnualAccountPdfEN, { figures, profile });

  const [nl, en] = await Promise.all([
    renderToBuffer(nlElement as unknown as Parameters<typeof renderToBuffer>[0]),
    renderToBuffer(enElement as unknown as Parameters<typeof renderToBuffer>[0]),
  ]);

  return {
    nl: Buffer.from(nl),
    en: Buffer.from(en),
  };
}
