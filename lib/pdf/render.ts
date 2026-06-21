import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { PaymentReceiptDocument, ReceiptData } from "./templates/payment-receipt";
import { RegistrationFormDocument, RegistrationFormData } from "./templates/registration-form";
import { RefundInvoiceDocument, RefundInvoiceData } from "./templates/refund-invoice";

/**
 * Render a Payment Receipt PDF to a Buffer for storage upload.
 */
export async function renderPaymentReceipt(data: ReceiptData): Promise<Buffer> {
  const element = React.createElement(PaymentReceiptDocument, { data });
  const buffer = await renderToBuffer(element);
  return buffer as unknown as Buffer;
}

/**
 * Render a 2-Page Resident Registration Form PDF to a Buffer.
 */
export async function renderRegistrationForm(data: RegistrationFormData): Promise<Buffer> {
  const element = React.createElement(RegistrationFormDocument, { data });
  const buffer = await renderToBuffer(element);
  return buffer as unknown as Buffer;
}

/**
 * Render a Refund Invoice PDF to a Buffer.
 */
export async function renderRefundInvoice(data: RefundInvoiceData): Promise<Buffer> {
  const element = React.createElement(RefundInvoiceDocument, { data });
  const buffer = await renderToBuffer(element);
  return buffer as unknown as Buffer;
}
