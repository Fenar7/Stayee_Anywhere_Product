/**
 * Centralized WhatsApp message templates for all transactional events.
 *
 * Each function returns the pre-filled message text that can be used
 * with `buildWaMeLink` or copied to the clipboard.
 */

/**
 * Onboarding invitation link sent to a new prospect.
 *
 * @param registrationUrl - The full URL for the prospect to complete registration.
 * @param name - Optional name to personalize the greeting.
 */
export function onboardingLink(registrationUrl: string, name?: string): string {
  const nameSuffix = name ? ` ${name}` : "";
  return `Hello${nameSuffix}, welcome to NextHome. Please complete your registration here: ${registrationUrl}`;
}

/**
 * Application-approved payment request message.
 *
 * @param params.name - Tenant's full name.
 * @param params.amount - Total due amount in rupees.
 * @param params.paymentUrl - Portal URL where the tenant uploads their payment screenshot.
 * @param params.breakdown - Optional detailed fee breakdown. When provided, the enhanced
 *   detailed template is used instead of the default short one.
 */
export function applicationApprovedPaymentRequest(params: {
  name: string;
  amount: number;
  paymentUrl: string;
  breakdown?: {
    admissionFee: number;
    monthlyRent: number;
    securityDeposit: number;
    foodCharges: number;
    discount: number;
    roomBedLabel?: string;
  };
}): string {
  const { name, amount, paymentUrl, breakdown } = params;
  const formattedAmount = amount.toLocaleString("en-IN");

  if (breakdown) {
    const roomLabel = breakdown.roomBedLabel ?? "your room";
    return (
      `Hello ${name}! Your registration for ${roomLabel} in NextHome Hostel has been approved!\n\n` +
      `Due Amount: \u20B9${formattedAmount}\n` +
      `Breakdown:\n` +
      `- Admission Fee: \u20B9${breakdown.admissionFee.toLocaleString("en-IN")}\n` +
      `- Monthly Rent: \u20B9${breakdown.monthlyRent.toLocaleString("en-IN")}\n` +
      `- Security Deposit: \u20B9${breakdown.securityDeposit.toLocaleString("en-IN")}\n` +
      `- Food Charges: \u20B9${breakdown.foodCharges.toLocaleString("en-IN")}\n` +
      `- Discount: \u20B9${breakdown.discount.toLocaleString("en-IN")}\n\n` +
      `Please transfer to UPI ID: payment@nexthome or scan the hostel code. ` +
      `Kindly upload the receipt screenshot in your portal at ${paymentUrl} or share it here.\n\n` +
      `Thank you!`
    );
  }

  return (
    `Hi ${name}, your application has been approved! Please verify your stay by uploading ` +
    `your first payment screenshot of \u20B9${formattedAmount} here: ${paymentUrl}`
  );
}

/**
 * Payment receipt ready notification.
 *
 * @param name - Tenant's full name.
 * @param amount - Verified payment amount in rupees.
 * @param receiptUrl - URL to download the receipt PDF.
 */
export function paymentReceiptReady(name: string, amount: number, receiptUrl: string): string {
  const formattedAmount = amount.toLocaleString("en-IN");
  return `Hello ${name}, your payment of \u20B9 ${formattedAmount} has been verified. Download your receipt: ${receiptUrl}`;
}

/**
 * Stay extension confirmation.
 *
 * @param name - Tenant's full name.
 * @param newEndDate - The new exit date as a human-readable string.
 */
export function extensionConfirmed(name: string, newEndDate: string): string {
  return `Hi ${name}, your stay extension is confirmed. Your new exit date is ${newEndDate}.`;
}

/**
 * Rent due reminder with variant based on days remaining.
 *
 * @param params.name - Tenant's full name.
 * @param params.dueDate - Human-readable due date string.
 * @param params.amount - Due amount in rupees.
 * @param params.paymentUrl - Portal URL for payment.
 * @param params.daysRemaining - Number of days until the due date.
 */
export function rentDueReminder(params: {
  name: string;
  dueDate: string;
  amount: number;
  paymentUrl: string;
  daysRemaining: number;
}): string {
  const { name, dueDate, amount, paymentUrl, daysRemaining } = params;
  const formattedAmount = amount.toLocaleString("en-IN");

  if (daysRemaining === 0) {
    return `URGENT: ${name}, your rent of \u20B9${formattedAmount} is due today. Please complete your payment: ${paymentUrl}`;
  }

  if (daysRemaining <= 3) {
    return `Dear ${name}, your rent of \u20B9${formattedAmount} is due in ${daysRemaining} days (${dueDate}). Pay here: ${paymentUrl}`;
  }

  return `Hi ${name}, your rent of \u20B9${formattedAmount} is due on ${dueDate}. Pay here: ${paymentUrl}`;
}

/**
 * Refund processed notification.
 *
 * @param name - Tenant's full name.
 * @param amount - Refund amount in rupees.
 * @param stayId - The stay ID for reference.
 */
export function refundProcessed(name: string, amount: number, stayId: string): string {
  const formattedAmount = amount.toLocaleString("en-IN");
  return (
    `Hello ${name}, your early checkout settlement is processed. A refund of ` +
    `\u20B9${formattedAmount} has been credited for Stay ${stayId}.`
  );
}
