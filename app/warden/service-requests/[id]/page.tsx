import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { getSignedUrl } from "@/lib/storage";
import WardenServiceRequestVerificationClient from "./client";

export const dynamic = "force-dynamic";

export default async function WardenServiceRequestVerificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
  const { id } = await params;

  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      stay: {
        include: {
          tenant: true,
          bed: { include: { room: true } },
        },
      },
      payment: {
        include: {
          screenshotDocument: true,
        },
      },
    },
  });

  if (!serviceRequest) {
    notFound();
  }

  // Ensure Warden can only access their own hostel
  if (user.role === UserRole.WARDEN) {
    const warden = await prisma.warden.findUnique({ where: { userId: user.id } });
    if (warden && serviceRequest.stay.hostelId !== warden.hostelId) {
      notFound();
    }
  }

  let screenshotUrl = null;
  if (serviceRequest.payment?.screenshotDocument?.storagePath) {
    screenshotUrl = await getSignedUrl(serviceRequest.payment.screenshotDocument.storagePath);
  }

  const srData = {
    id: serviceRequest.id,
    type: serviceRequest.type,
    amount: serviceRequest.amountPaise / 100,
    metadata: serviceRequest.metadata as Record<string, unknown> | null,
    status: serviceRequest.status,
    tenantName: serviceRequest.stay.tenant.fullName,
    roomNumber: serviceRequest.stay.bed.room.roomNumber,
    bedLabel: serviceRequest.stay.bed.label,
    screenshotUrl,
  };

  return <WardenServiceRequestVerificationClient data={srData} />;
}
