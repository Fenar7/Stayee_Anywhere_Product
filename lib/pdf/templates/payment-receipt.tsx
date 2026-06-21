import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors, fontSizes, layout } from "../styles";
import {
  ReceiptHeader,
  Section,
  KeyValueRow,
  Divider,
  SignatureBlock,
  Badge,
} from "../primitives";

export interface ReceiptData {
  receiptNumber: string;
  generatedAt: string;
  hostelName: string;
  tenant: {
    fullName: string;
    roomNumber: string;
    bedLabel: string;
    durationType: string;
  };
  transaction: {
    amountPaise: number;
    amountFormatted: string;
    paymentMode: string;
    transactionRefNo: string | null;
    verifiedAt: string;
    verifiedByName: string;
  };
}

const receiptStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.background,
    padding: { top: 40, bottom: 40, left: 50, right: 50 },
  },
  amountSection: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 4,
    marginTop: 16,
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: fontSizes.xxl,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  footer: {
    marginTop: 30,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  disclaimer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 4,
  },
  disclaimerText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    lineHeight: 1.4,
  },
});

function generateReceiptNumber(paymentId: string): string {
  const shortId = paymentId.slice(0, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `RCP-${shortId}-${timestamp}`;
}

export function PaymentReceiptDocument({ data }: { data: ReceiptData }) {
  return (
    <Document>
      <Page size="A4" style={receiptStyles.page}>
        <ReceiptHeader
          hostelName={data.hostelName}
          receiptNumber={data.receiptNumber}
          generatedAt={data.generatedAt}
        />

        {/* Amount Display */}
        <View style={receiptStyles.amountSection}>
          <Text style={receiptStyles.amountLabel}>Amount Received</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={receiptStyles.amountValue}>{data.transaction.amountFormatted}</Text>
            <Badge text="PAID" />
          </View>
        </View>

        {/* Payer Details */}
        <Section title="Payer Details">
          <KeyValueRow label="Tenant Name" value={data.tenant.fullName} />
          <KeyValueRow label="Room Number" value={data.tenant.roomNumber} />
          <KeyValueRow label="Bed Label" value={data.tenant.bedLabel} />
          <KeyValueRow label="Duration Type" value={data.tenant.durationType} />
        </Section>

        <Divider />

        {/* Transaction Details */}
        <Section title="Transaction Details">
          <KeyValueRow label="Payment Mode" value={data.transaction.paymentMode} />
          {data.transaction.transactionRefNo && (
            <KeyValueRow
              label="Transaction Ref (UTR)"
              value={data.transaction.transactionRefNo}
            />
          )}
          <KeyValueRow label="Verified On" value={data.transaction.verifiedAt} />
          <KeyValueRow label="Verified By" value={data.transaction.verifiedByName} />
        </Section>

        <Divider />

        {/* Signature Block */}
        <SignatureBlock leftLabel="Tenant Signature" rightLabel="Warden Signature" />

        {/* Disclaimer */}
        <View style={receiptStyles.disclaimer}>
          <Text style={receiptStyles.disclaimerText}>
            This is a computer-generated receipt. For any discrepancies, please contact the hostel
            management within 7 days of the transaction date.
          </Text>
        </View>

        {/* Footer */}
        <View style={receiptStyles.footer}>
          <Text style={receiptStyles.footerText}>
            {data.hostelName} — NextHome Hostel Management
          </Text>
          <Text style={receiptStyles.footerText}>
            Receipt: {data.receiptNumber}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export { generateReceiptNumber };
