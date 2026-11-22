/**
 * A book's EAN is its ISBN-13: shown beside the ISBN on the record and in
 * the list view, after the CDI's reference screens. An ISBN-10 becomes one
 * by the 978 prefix and a new check digit; anything else has no EAN.
 */
export function eanOf(isbn: string | null): string | null {
  const digits = (isbn ?? "").replace(/[^0-9Xx]/g, "");
  if (/^\d{13}$/.test(digits)) return digits;
  if (!/^\d{9}[\dXx]$/.test(digits)) return null;
  const body = `978${digits.slice(0, 9)}`;
  const sum = [...body].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return `${body}${(10 - (sum % 10)) % 10}`;
}
