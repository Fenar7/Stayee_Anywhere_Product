import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { colors, fontSizes } from "../styles";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: fontSizes.sm,
    color: colors.text,
    backgroundColor: colors.background,
    paddingTop: 36,
    paddingBottom: 36,
    paddingLeft: 44,
    paddingRight: 44,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: fontSizes.xxl,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  headerSub: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  photoBox: {
    width: 56,
    height: 68,
    border: 1,
    borderColor: colors.border,
    borderRadius: 3,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  photoImg: {
    width: 56,
    height: 68,
    objectFit: "cover",
  },
  photoPlaceholder: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    width: 100,
  },
  value: {
    fontSize: fontSizes.xs,
    color: colors.text,
    fontFamily: "Helvetica-Bold",
    flex: 1,
  },
  grid2: {
    flexDirection: "row",
    gap: 8,
  },
  gridCol: {
    flex: 1,
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    marginVertical: 8,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  checkbox: {
    width: 10,
    height: 10,
    border: 1,
    borderColor: colors.textMuted,
    marginRight: 6,
    borderRadius: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: {
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  page2Title: {
    fontSize: fontSizes.xxl,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    textAlign: "center",
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  rulesText: {
    fontSize: fontSizes.xs,
    color: colors.text,
    lineHeight: 1.5,
    marginBottom: 14,
  },
  signatureBlock: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sigLine: {
    width: 180,
    borderTopWidth: 1,
    borderTopColor: colors.textMuted,
    paddingTop: 4,
    marginTop: 36,
  },
  sigLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 3,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: colors.textLight,
  },
});

function truncate(text: string, maxLen: number): string {
  if (!text) return "—";
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{truncate(value, 60)}</Text>
    </View>
  );
}

function Checkbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={s.checkRow}>
      <View style={s.checkbox}>
        {checked && (
          <Text style={{ fontSize: 7, color: colors.primary, fontFamily: "Helvetica-Bold" }}>✓</Text>
        )}
      </View>
      <Text style={s.checkLabel}>{label}</Text>
    </View>
  );
}

const DEFAULT_AFFIDAVIT = `I, the undersigned resident, hereby agree to abide by all rules and regulations of the hostel as set forth by the management. I understand that:

1. The hostel premises must be kept clean and tidy at all times.
2. Visitors are allowed only during designated visiting hours.
3. Any damage to hostel property will be charged to the resident.
4. The management reserves the right to terminate accommodation with 30 days notice.
5. Quiet hours must be observed between 10:00 PM and 6:00 AM.
6. Cooking is strictly prohibited inside the rooms.
7. The management is not responsible for loss of personal belongings.
8. This registration form serves as a binding agreement between the resident and the hostel management.`;

export interface RegistrationFormData {
  generatedAt: string;
  stayId: string;
  hostelName: string;
  tenant: {
    fullName: string;
    dateOfBirth: string;
    gender: string;
    placeOfBirth: string;
    permanentAddress: string;
    emergencyContactName: string;
    relationship: string;
    emergencyContactNumber: string;
    parentGuardianName: string;
    parentGuardianContact: string;
    occupationType: string;
    collegeName?: string;
    courseOrBranch?: string;
    companyName?: string;
    designation?: string;
    purposeOfStay: string;
    photoUrl?: string;
  };
  accommodation: {
    roomNumber: string;
    bedLabel: string;
    sharingType: string;
  };
  fees: {
    admissionFee: string;
    securityDeposit: string;
    monthlyRent: string;
    foodCharges: string;
    totalPayable: string;
  };
  marketing: {
    executive: string;
    leadSource: string;
  };
  documents: {
    aadhaar: boolean;
    pan: boolean;
    passportPhoto: boolean;
    collegeId: boolean;
    companyId: boolean;
  };
  affidavitText?: string;
}

export function RegistrationFormDocument({ data }: { data: RegistrationFormData }) {
  const rules = data.affidavitText || DEFAULT_AFFIDAVIT;

  return (
    <Document>
      {/* Page 1: Personal & Billing Data */}
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>RESIDENT REGISTRATION FORM</Text>
            <Text style={s.headerSub}>{data.hostelName}</Text>
          </View>
          <View style={s.photoBox}>
            {data.tenant.photoUrl ? (
              <Image src={data.tenant.photoUrl} style={s.photoImg} />
            ) : (
              <Text style={s.photoPlaceholder}>Photo{"\n"}N/A</Text>
            )}
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ fontSize: fontSizes.xs, color: colors.textMuted }}>Stay ID: {data.stayId.slice(0, 8)}...</Text>
          <Text style={{ fontSize: fontSizes.xs, color: colors.textMuted }}>{data.generatedAt}</Text>
        </View>

        <View style={s.grid2}>
          {/* Left Column */}
          <View style={s.gridCol}>
            {/* Section 1: Personal Information */}
            <Text style={s.sectionTitle}>1. Personal Information</Text>
            <Row label="Full Name" value={data.tenant.fullName} />
            <Row label="Date of Birth" value={data.tenant.dateOfBirth} />
            <Row label="Gender" value={data.tenant.gender} />
            <Row label="Place of Birth" value={data.tenant.placeOfBirth} />
            <Row label="Address" value={data.tenant.permanentAddress} />
            <Row label="Occupation" value={data.tenant.occupationType} />
            {data.tenant.occupationType === "STUDENT" && (
              <>
                <Row label="College" value={data.tenant.collegeName || "—"} />
                <Row label="Course" value={data.tenant.courseOrBranch || "—"} />
              </>
            )}
            {data.tenant.occupationType === "WORKING_PROFESSIONAL" && (
              <>
                <Row label="Company" value={data.tenant.companyName || "—"} />
                <Row label="Designation" value={data.tenant.designation || "—"} />
              </>
            )}
            <Row label="Purpose" value={data.tenant.purposeOfStay} />
            <Row label="Emergency" value={`${data.tenant.emergencyContactName} (${data.tenant.relationship})`} />
            <Row label="Emergency Ph." value={data.tenant.emergencyContactNumber} />
            <Row label="Parent/Guardian" value={data.tenant.parentGuardianName} />
            <Row label="Parent Ph." value={data.tenant.parentGuardianContact} />

            {/* Section 4: Marketing Details */}
            <View style={{ marginTop: 6 }}>
              <Text style={s.sectionTitle}>4. Marketing Details</Text>
              <Row label="Executive" value={data.marketing.executive || "—"} />
              <Row label="Lead Source" value={data.marketing.leadSource || "—"} />
            </View>
          </View>

          {/* Right Column */}
          <View style={s.gridCol}>
            {/* Section 2: Accommodation Details */}
            <Text style={s.sectionTitle}>2. Accommodation Details</Text>
            <Row label="Hostel" value={data.hostelName} />
            <Row label="Room Number" value={data.accommodation.roomNumber} />
            <Row label="Bed Label" value={data.accommodation.bedLabel} />
            <Row label="Sharing Type" value={data.accommodation.sharingType} />

            <View style={s.divider} />

            {/* Section 3: Fee Details */}
            <Text style={s.sectionTitle}>3. Fee Details</Text>
            <Row label="Admission Fee" value={data.fees.admissionFee} />
            <Row label="Security Dep." value={data.fees.securityDeposit} />
            <Row label="Monthly Rent" value={data.fees.monthlyRent} />
            <Row label="Food Charges" value={data.fees.foodCharges} />
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.primary, marginVertical: 4 }} />
            <Row label="Total Payable" value={data.fees.totalPayable} />

            <View style={s.divider} />

            {/* Section 5: Documents Checklist */}
            <Text style={s.sectionTitle}>5. Documents Submitted</Text>
            <Checkbox checked={data.documents.aadhaar} label="Aadhaar Card" />
            <Checkbox checked={data.documents.pan} label="PAN Card" />
            <Checkbox checked={data.documents.passportPhoto} label="Passport Photo" />
            <Checkbox checked={data.documents.collegeId} label="College ID" />
            <Checkbox checked={data.documents.companyId} label="Company ID" />
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>{data.hostelName} — NextHome Hostel Management</Text>
          <Text style={s.footerText}>Page 1 of 2</Text>
        </View>
      </Page>

      {/* Page 2: Rules & Affidavit */}
      <Page size="A4" style={s.page}>
        <Text style={s.page2Title}>HOSTEL RULES & AFFIDAVIT</Text>

        <Text style={s.sectionTitle}>Terms & Conditions</Text>
        <Text style={s.rulesText}>{rules}</Text>

        <Text style={s.sectionTitle}>Affidavit</Text>
        <Text style={s.rulesText}>
          I solemnly affirm that the information provided in this registration form is true and correct to the best of my knowledge. I agree to comply with all the rules and regulations of {data.hostelName}. I understand that any violation of these rules may result in termination of my accommodation.
        </Text>

        {/* Signature Blocks */}
        <View style={s.signatureBlock}>
          <View>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Resident Signature</Text>
            <Text style={[s.sigLabel, { marginTop: 2 }]}>{truncate(data.tenant.fullName, 30)}</Text>
          </View>
          <View>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Authorized Signatory</Text>
            <Text style={[s.sigLabel, { marginTop: 2 }]}>{data.hostelName}</Text>
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>{data.hostelName} — NextHome Hostel Management</Text>
          <Text style={s.footerText}>Page 2 of 2</Text>
        </View>
      </Page>
    </Document>
  );
}
