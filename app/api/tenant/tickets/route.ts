import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/services/activity/activity.service";
import { ActivityEventType, StayStatus } from "@prisma/client";
import { createClient } from "@/lib/auth/server";
import { z } from "zod";

const ticketSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),
  priority: z.preprocess(
    (val) => (val === "URGENT" ? "CRITICAL" : val),
    z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).default("NORMAL")
  ),
  category: z.enum(["MAINTENANCE", "CLEANING", "ELECTRICAL", "PLUMBING", "OTHER"]).default("OTHER"),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { cognitoSub: authUser.id },
      include: { tenant: true }
    });

    if (!user || user.role !== "TENANT" || !user.tenant) {
      return NextResponse.json({ error: "Unauthorized - Not a Tenant" }, { status: 401 });
    }

    const tickets = await prisma.ticket.findMany({
      where: { tenantId: user.tenant.id },
      include: {
        comments: {
          include: {
            user: {
              select: {
                role: true,
                phone: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { cognitoSub: authUser.id },
      include: { 
        tenant: {
          include: {
            stays: {
              where: {
                status: {
                  in: [
                    StayStatus.ACTIVE,
                    StayStatus.EXTENDED,
                    StayStatus.APPROVED_AWAITING_PAYMENT,
                    StayStatus.ONBOARDING_PENDING,
                  ],
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!user || user.role !== "TENANT" || !user.tenant) {
      return NextResponse.json({ error: "Unauthorized - Not a Tenant" }, { status: 401 });
    }

    const activeStay = user.tenant.stays[0];
    if (!activeStay) {
      return NextResponse.json({ error: "Must have a valid stay record to create a ticket" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = ticketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const ticket = await prisma.ticket.create({
      data: {
        tenantId: user.tenant.id,
        hostelId: activeStay.hostelId,
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        category: parsed.data.category,
      }
    });

    // --- Fanout Notifications ---
    // 1. Notify Warden of that hostel
    const warden = await prisma.warden.findUnique({ where: { hostelId: activeStay.hostelId } });
    if (warden) {
      await prisma.notification.create({
        data: {
          userId: warden.userId,
          title: "New Ticket Received",
          message: `A new ${parsed.data.priority} priority ticket was raised: ${parsed.data.title}`,
          type: "TICKET",
          referenceId: ticket.id
        }
      });
    }

    // 2. Notify Main Admins (in same organization)
    const admins = await prisma.user.findMany({ where: { role: "MAIN_ADMIN", organizationId: user.organizationId } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "New Ticket Received",
          message: `Hostel Ticket: ${parsed.data.title}`,
          type: "TICKET"
        }
      });
    }

    void logActivity({
      organizationId: user.organizationId,
      hostelId: activeStay.hostelId,
      eventType: ActivityEventType.TICKET_RAISED,
      actorId: user.id,
      actorName: user.tenant.fullName ?? user.phone ?? "Tenant",
      subjectName: parsed.data.title,
      subjectId: ticket.id,
      subjectType: "Ticket",
      targetUrl: `/warden/complaints?ticketId=${ticket.id}`,
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
