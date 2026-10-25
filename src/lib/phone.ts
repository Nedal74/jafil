/**
 * Saudi mobile numbers: accepts 05XXXXXXXX, 5XXXXXXXX, +9665XXXXXXXX, 009665XXXXXXXX,
 * including Arabic-Indic digits. Returns canonical 9665XXXXXXXX or null.
 */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function normalizeSaudiMobile(input: string): string | null {
  const digits = toLatinDigits(input).replace(/[^\d+]/g, "").replace(/^\+/, "").replace(/^00/, "");
  let local: string;
  if (/^9665\d{8}$/.test(digits)) local = digits.slice(3);
  else if (/^05\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^5\d{8}$/.test(digits)) local = digits;
  else return null;
  return `966${local}`;
}

/** Display form 05XXXXXXXX. */
export function displaySaudiMobile(normalized: string): string {
  return normalized.startsWith("966") ? `0${normalized.slice(3)}` : normalized;
}

/** wa.me link for a phone in any accepted format. */
export function whatsappLink(phone: string, text?: string): string | null {
  const n = normalizeSaudiMobile(phone) ?? toLatinDigits(phone).replace(/\D/g, "");
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
