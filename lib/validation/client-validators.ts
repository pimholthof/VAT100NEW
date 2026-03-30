/**
 * Shared client-field validators.
 * Returns a Dutch error message string on failure, or null on success.
 */

export function validateEmail(email: string): string | null {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Ongeldig e-mailadres.";
  }
  return null;
}

export function validateKvk(kvkNumber: string): string | null {
  if (kvkNumber && !/^\d{8}$/.test(kvkNumber.replace(/\s/g, ""))) {
    return "KVK-nummer moet 8 cijfers zijn.";
  }
  return null;
}

export function validateBtw(btwNumber: string): string | null {
  if (btwNumber && !/^NL\d{9}B\d{2}$/i.test(btwNumber.replace(/[\s.]/g, ""))) {
    return "BTW-nummer moet het formaat NL123456789B01 hebben.";
  }
  return null;
}
