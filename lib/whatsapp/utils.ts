import { ValidationError } from "@/lib/errors";

/**
 * Normalize a phone number to E.164 numeric-only format (without the '+' prefix).
 *
 * Accepts arbitrary formats: "+91 98765 43210", "098765-43210", "+91(98765)43210", "9876543210".
 * Strips all whitespace, dashes, parentheses, leading zeros, and stray non-digit characters.
 * If the cleaned string has fewer than 10 digits, throws a ValidationError.
 * If the country code is missing (exactly 10 digits), defaults to India's country code "91".
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");

  if (cleaned.length < 10) {
    throw new ValidationError(
      `Phone number is too short after cleaning: "${phone}" yields only ${cleaned.length} digits (minimum 10 required)`
    );
  }

  let digits = cleaned;

  // Strip leading zero if present (local dialing prefix)
  if (digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }

  // If exactly 10 digits, prepend India country code
  if (digits.length === 10) {
    digits = "91" + digits;
  }

  return digits;
}

/**
 * Build a pre-filled WhatsApp "wa.me" link with the given phone number and message.
 *
 * If a phone number is provided and non-empty, it is normalized via `normalizePhoneNumber`
 * and included in the URL. If no phone is provided (empty string), the URL omits the phone
 * segment so the user can choose a contact in WhatsApp.
 *
 * The message is URL-encoded using `encodeURIComponent` so that emojis, line breaks (\n),
 * the Rupee symbol (₹), and HTTP links are correctly encoded.
 */
export function buildWaMeLink(phone: string, message: string): string {
  const encoded = encodeURIComponent(message);
  if (!phone) {
    return `https://wa.me/?text=${encoded}`;
  }
  const normalized = normalizePhoneNumber(phone);
  return `https://wa.me/${normalized}?text=${encoded}`;
}
