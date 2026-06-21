/**
 * Generate a WhatsApp message string for payment receipt sharing.
 * Format: wa.me/<phone>?text=<encoded message>
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
  const encoded = encodeURIComponent(message);
  // Normalize phone: remove + prefix if present, wa.me expects raw digits
  const phone = params.phone.replace(/^\+/, "");
  return `https://wa.me/${phone}?text=${encoded}`;
}
