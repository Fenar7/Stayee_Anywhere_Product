/**
 * WhatsApp utilities for payment receipt sharing.
 *
 * Delegates to the centralized lib/whatsapp/templates and lib/whatsapp/utils
 * modules for message formatting and phone normalization.
 */
import { normalizePhoneNumber, buildWaMeLink } from "@/lib/whatsapp/utils";

/**
 * Generate a WhatsApp message string for payment receipt sharing.
 * Preserves backward compatibility with the original amountFormatted parameter.
 */
export function buildReceiptWhatsAppMessage(params: {
  tenantName: string;
  amountFormatted: string;
  downloadLink: string;
}): string {
  const { tenantName, amountFormatted, downloadLink } = params;
  return `Hello ${tenantName}, your payment of ${amountFormatted} has been verified. Download your receipt: ${downloadLink}`;
}

/**
 * Build a wa.me URL with the pre-filled message.
 */
export function buildReceiptWhatsAppUrl(params: {
  phone: string;
  tenantName: string;
  amountFormatted: string;
  downloadLink: string;
}): string {
  const message = buildReceiptWhatsAppMessage(params);
  return buildWaMeLink(params.phone, message);
}
