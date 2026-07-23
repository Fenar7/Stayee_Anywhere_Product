import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { ActivityEventType } from "@prisma/client";
import { logActivity } from "@/services/activity/activity.service";
import { progressSchema } from "@/lib/validation/onboarding";



export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const onboardingRequest = await prisma.onboardingRequest.findUnique({
      where: { id },
    });

    if (!onboardingRequest) {
      throw new NotFoundError("Onboarding request not found");
    }

    if (onboardingRequest.status !== "PENDING") {
      return NextResponse.json({ step: 0, hasProgress: false });
    }

    const step = Math.max(1, onboardingRequest.onboardingCurrentStep);

    // Find the draft tenant via the stay linked to this onboarding request's bed
    const stay = await prisma.stay.findFirst({
      where: {
        bedId: onboardingRequest.bedId,
        status: "ONBOARDING_PENDING",
        tenant: { userId: null },
      },
      include: { tenant: true },
      orderBy: { createdAt: "desc" },
    });

    if (!stay?.tenant) {
      return NextResponse.json({ step, hasProgress: false });
    }

    const t = stay.tenant;
    const hasData =
      Boolean(t.fullName && !t.fullName.startsWith("Prospect ")) ||
      Boolean(t.placeOfBirth) ||
      Boolean(t.permanentAddress) ||
      Boolean(t.emergencyContactName);

    return NextResponse.json({
      step,
      hasProgress: hasData || step > 1,
      tenant: {
        fullName: stay.tenant.fullName,
        dateOfBirth: stay.tenant.dateOfBirth,
        gender: stay.tenant.gender,
        placeOfBirth: stay.tenant.placeOfBirth,
        permanentAddress: stay.tenant.permanentAddress,
        emergencyContactName: stay.tenant.emergencyContactName,
        relationship: stay.tenant.relationship,
        emergencyContactNumber: stay.tenant.emergencyContactNumber,
        parentGuardianName: stay.tenant.parentGuardianName,
        parentGuardianContact: stay.tenant.parentGuardianContact,
        occupationType: stay.tenant.occupationType,
        collegeName: stay.tenant.collegeName,
        courseOrBranch: stay.tenant.courseOrBranch,
        companyName: stay.tenant.companyName,
        designation: stay.tenant.designation,
        purposeOfStay: stay.tenant.purposeOfStay,
        email: null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const parsed = progressSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path?.join(".") || "Form Field";
      const issueMsg = issue?.message;
      const finalMsg =
        !issueMsg || issueMsg === "Invalid input" || issueMsg === "Required"
          ? `Invalid input provided for ${field}`
          : issueMsg;
      throw new ValidationError(finalMsg);
    }

    const { step, data } = parsed.data;

    const onboardingRequest = await prisma.onboardingRequest.findUnique({
      where: { id },
      include: { hostel: { select: { organizationId: true } } },
    });

    if (!onboardingRequest) {
      throw new NotFoundError("Onboarding request not found");
    }

    if (onboardingRequest.status !== "PENDING") {
      throw new ConflictError("This onboarding request is no longer active");
    }

    // If tenant updated their password in Step 1, sync password hash immediately
    if (data?.password && typeof data.password === "string" && data.password.length >= 8) {
      const { createHash } = await import("crypto");
      const newHash = createHash("sha256").update(data.password).digest("hex");
      await prisma.onboardingRequest.update({
        where: { id },
        data: { tempPasswordHash: newHash },
      });
    }

    // Preserve highest step reached
    const prevStep = onboardingRequest.onboardingCurrentStep;
    const nextStep = Math.max(prevStep, step);
    await prisma.onboardingRequest.update({
      where: { id },
      data: { onboardingCurrentStep: nextStep },
    });

    if (nextStep > prevStep) {
      void logActivity({
        organizationId: onboardingRequest.hostel.organizationId,
        hostelId: onboardingRequest.hostelId,
        eventType: ActivityEventType.TENANT_ONBOARDING_PROGRESS,
        actorName: onboardingRequest.phone,
        subjectName: onboardingRequest.phone,
        subjectId: id,
        subjectType: "OnboardingRequest",
        targetUrl: `/warden/onboards/${id}`,
      });
    }

    // If we have tenant data to save, update the tenant record
    if (data && Object.keys(data).length > 0) {
      const updateData: Record<string, unknown> = {};

      if (data.fullName) updateData.fullName = data.fullName;
      if (data.dateOfBirth) updateData.dateOfBirth = new Date(String(data.dateOfBirth));
      if (data.gender) updateData.gender = data.gender;
      if (data.placeOfBirth) updateData.placeOfBirth = data.placeOfBirth;
      if (data.permanentAddress) updateData.permanentAddress = data.permanentAddress;
      if (data.emergencyContactName) updateData.emergencyContactName = data.emergencyContactName;
      if (data.relationship) updateData.relationship = data.relationship;
      if (data.parentGuardianName) updateData.parentGuardianName = data.parentGuardianName;
      if (data.parentGuardianContact) updateData.parentGuardianContact = data.parentGuardianContact;
      if (data.occupationType) updateData.occupationType = data.occupationType;
      if (data.collegeName !== undefined) updateData.collegeName = data.collegeName;
      if (data.courseOrBranch !== undefined) updateData.courseOrBranch = data.courseOrBranch;
      if (data.companyName !== undefined) updateData.companyName = data.companyName;
      if (data.designation !== undefined) updateData.designation = data.designation;
      if (data.purposeOfStay) updateData.purposeOfStay = data.purposeOfStay;

      if (Object.keys(updateData).length > 0) {
        // Use bed + status to find the draft stay, NOT emergencyContactNumber
        // (it hasn't been finalized yet and could be overwritten by progress saves)
        const draftStay = await prisma.stay.findFirst({
          where: {
            bedId: onboardingRequest.bedId,
            status: "ONBOARDING_PENDING",
            tenant: { userId: null },
          },
          select: { tenantId: true },
        });
        if (draftStay) {
          await prisma.tenant.update({
            where: { id: draftStay.tenantId },
            data: updateData as import("@prisma/client").Prisma.TenantUpdateInput,
          });
        }
      }
    }

    return NextResponse.json({ success: true, step });
  } catch (error) {
    return handleApiError(error);
  }
}
