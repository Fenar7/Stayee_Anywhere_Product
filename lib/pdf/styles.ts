// Brand color palette
export const colors = {
  primary: "#1E3A5F",      // Deep navy
  secondary: "#2E86AB",    // Teal blue
  accent: "#F18F01",       // Warm orange
  success: "#28A745",      // Green
  warning: "#FFC107",      // Yellow
  danger: "#DC3545",       // Red
  text: "#212529",         // Near-black
  textMuted: "#6C757D",    // Gray
  textLight: "#ADB5BD",    // Light gray
  background: "#FFFFFF",   // White
  surface: "#F8F9FA",      // Off-white
  border: "#DEE2E6",       // Border gray
  tableHeader: "#E9ECEF",  // Table header bg
  tableStripe: "#F8F9FA",  // Alternating row
};

// Typography sizes
export const fontSizes = {
  xs: 8,
  sm: 9,
  md: 10,
  lg: 11,
  xl: 13,
  xxl: 16,
  title: 20,
};

// Margins and spacing
export const layout = {
  page: {
    padding: { top: 40, bottom: 40, left: 50, right: 50 },
  },
  section: {
    marginBottom: 16,
  },
  row: {
    marginBottom: 6,
  },
  gap: {
    sm: 6,
    md: 10,
    lg: 16,
  },
};

// Common style objects for @react-pdf/renderer
export const styles = {
  page: {
    fontFamily: "Helvetica",
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.background,
    ...layout.page,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: fontSizes.title,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
  tableContainer: {
    marginTop: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingVertical: 6,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: colors.tableHeader,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: fontSizes.sm,
    fontFamily: "Helvetica-Bold",
    color: colors.textMuted,
  },
  tableCell: {
    fontSize: fontSizes.sm,
    color: colors.text,
    paddingHorizontal: 8,
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
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.primary,
    marginTop: 8,
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
};
