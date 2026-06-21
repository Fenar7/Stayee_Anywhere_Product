import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors, fontSizes } from "../styles";
import { SignatureBlock } from "../primitives";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.background,
    padding: { top: 40, bottom: 40, left: 50, right: 50 },
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: fontSizes.title,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  headerSub: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    width: 160,
  },
  value: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontFamily: "Helvetica-Bold",
    flex: 1,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.primary,
    marginTop: 12,
    borderRadius: 3,
  },
  totalLabel: {
    fontSize: fontSizes.lg,
    fontFamily: "Helvetica-Bold",
    color: colors.background,
  },
  totalValue: {
    fontSize: fontSizes.lg,
    fontFamily: "Helvetica-Bold",
    color: colors.background,
  },
  notesBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 3,
  },
  notesLabel: {
    fontSize: fontSizes.xs,
    fontFamily: "Helvetica-Bold",
    color: colors.textMuted,
    marginBottom: 4,
  },
  notesText: {
    fontSize: fontSizes.sm,
    color: colors.text,
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
});

export interface RefundInvoiceData {
  hostelName: string;
  invoiceDate: string;
  stayId: string;
  originalAmountPaise: number;
  originalAmountFormatted: string;
  daysUsed: number;
  daysRemaining: number;
  refundAmountPaise: number;
  refundAmountFormatted: string;
  processedByName: string;
  notes: string | null;
}

export function RefundInvoiceDocument({ data }: { data: RefundInvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>REFUND INVOICE — EARLY EXIT</Text>
            <Text style={s.headerSub}>{data.hostelName}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: fontSizes.sm, fontFamily: "Helvetica-Bold", color: colors.text }}>
              {data.invoiceDate}
            </Text>
            <Text style={{ fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 }}>
              Stay: {data.stayId.slice(0, 8)}...
            </Text>
          </View>
        </View>

        {/* Invoice Details */}
        <Text style={s.sectionTitle}>Invoice Details</Text>
        <View style={s.row}>
          <Text style={s.label}>Stay ID</Text>
          <Text style={s.value}>{data.stayId}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Invoice Date</Text>
          <Text style={s.value}>{data.invoiceDate}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Original Total Payable</Text>
          <Text style={s.value}>{data.originalAmountFormatted}</Text>
        </View>

        <View style={s.divider} />

        {/* Usage Summary */}
        <Text style={s.sectionTitle}>Stay Usage Summary</Text>
        <View style={s.row}>
          <Text style={s.label}>Days Used</Text>
          <Text style={s.value}>{data.daysUsed} days</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Days Remaining</Text>
          <Text style={s.value}>{data.daysRemaining} days</Text>
        </View>

        <View style={s.divider} />

        {/* Refund Amount */}
        <Text style={s.sectionTitle}>Refund Details</Text>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Refund Amount</Text>
          <Text style={s.totalValue}>{data.refundAmountFormatted}</Text>
        </View>

        <View style={s.row} style={{ marginTop: 12 }}>
          <Text style={s.label}>Processed By</Text>
          <Text style={s.value}>{data.processedByName}</Text>
        </View>

        {data.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Signature Blocks */}
        <SignatureBlock leftLabel="Tenant Signature" rightLabel="Warden Signature" />

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>{data.hostelName} — NextHome Hostel Management</Text>
          <Text style={s.footerText}>Refund Invoice</Text>
        </View>
      </Page>
    </Document>
  );
}
