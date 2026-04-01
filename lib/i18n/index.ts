import type { Locale } from "./types";
import nl from "./dictionaries/nl";
import en from "./dictionaries/en";

export type { Locale };

// Deep-widen all readonly string literals to string
type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export type Dictionary = DeepString<typeof nl>;

const dictionaries: Record<Locale, Dictionary> = { nl, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function getLocaleFromCookie(cookieHeader?: string | null): Locale {
  if (!cookieHeader) return "nl";
  const match = cookieHeader.match(/(?:^|;\s*)locale=(\w+)/);
  const value = match?.[1];
  if (value === "en") return "en";
  return "nl";
}

export { nl, en };
