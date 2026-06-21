import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { PaymentReceiptDocument, ReceiptData } from "./templates/payment-receipt";

/**
 * Render a Payment Receipt PDF to a Buffer for storage upload.
 */
export async function renderPaymentReceipt(data: ReceiptData): Promise<Buffer> {
  const element = React.createElement(PaymentReceiptDocument, { data });
  const buffer = await renderToBuffer(element);
  return buffer as unknown as Buffer;
}
