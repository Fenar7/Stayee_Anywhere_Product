import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors, fontSizes, layout } from "./styles";

const primitiveStyles = StyleSheet.create({
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
    marginBottom: layout.row.marginBottom,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    width: 130,
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
  signatureBlock: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureLine: {
    width: 180,
    borderTopWidth: 1,
    borderTopColor: colors.textMuted,
    paddingTop: 6,
    marginTop: 40,
  },
  signatureLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontFamily: "Helvetica-Bold",
    color: colors.background,
  },
});

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <View style={{ marginBottom: layout.section.marginBottom }}>
      <Text style={primitiveStyles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

interface KeyValueRowProps {
  label: string;
  value: string;
  valueBold?: boolean;
}

export function KeyValueRow({ label, value, valueBold = true }: KeyValueRowProps) {
  return (
    <View style={primitiveStyles.row}>
      <Text style={primitiveStyles.label}>{label}</Text>
      <Text
        style={[
          primitiveStyles.value,
          !valueBold ? { fontFamily: "Helvetica" } : {},
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function Divider() {
  return <View style={primitiveStyles.divider} />;
}

interface SignatureProps {
  leftLabel: string;
  rightLabel: string;
}

export function SignatureBlock({ leftLabel, rightLabel }: SignatureProps) {
  return (
    <View style={primitiveStyles.signatureBlock}>
      <View>
        <View style={primitiveStyles.signatureLine} />
        <Text style={primitiveStyles.signatureLabel}>{leftLabel}</Text>
      </View>
      <View>
        <View style={primitiveStyles.signatureLine} />
        <Text style={primitiveStyles.signatureLabel}>{rightLabel}</Text>
      </View>
    </View>
  );
}

interface BadgeProps {
  text: string;
  color?: string;
}

export function Badge({ text, color = colors.success }: BadgeProps) {
  return (
    <View style={[primitiveStyles.badge, { backgroundColor: color }]}>
      <Text style={primitiveStyles.badgeText}>{text}</Text>
    </View>
  );
}

interface HeaderProps {
  hostelName: string;
  receiptNumber: string;
  generatedAt: string;
}

export function ReceiptHeader({ hostelName, receiptNumber, generatedAt }: HeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 16,
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
        marginBottom: 20,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: fontSizes.title,
            fontFamily: "Helvetica-Bold",
            color: colors.primary,
          }}
        >
          PAYMENT RECEIPT
        </Text>
        <Text
          style={{
            fontSize: fontSizes.sm,
            color: colors.textMuted,
            marginTop: 4,
          }}
        >
          {hostelName}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={{
            fontSize: fontSizes.sm,
            fontFamily: "Helvetica-Bold",
            color: colors.text,
          }}
        >
          {receiptNumber}
        </Text>
        <Text
          style={{
            fontSize: fontSizes.xs,
            color: colors.textMuted,
            marginTop: 2,
          }}
        >
          {generatedAt}
        </Text>
      </View>
    </View>
  );
}
