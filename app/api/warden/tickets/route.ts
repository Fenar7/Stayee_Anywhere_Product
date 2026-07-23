import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/auth/server";
import { z } from "zod";
import { logActivity } from "@/services/activity/activity.service";
import { ActivityEventType } from "@prisma/client";

const updateTicketSchema = z.object({
  id: z.string(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { cognitoSub: authUser.id },
      include: { warden: true }
    });

    if (!user || user.role !== "WARDEN" || !user.warden) {
      return NextResponse.json({ error: "Unauthorized - Not a Warden" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const whereClause: any = { hostelId: user.warden.hostelId };
    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        tenant: {
          select: { fullName: true, userId: true, user: { select: { phone: true } } }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Error fetching warden tickets:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { cognitoSub: authUser.id },
      include: { warden: true }
    });

    if (!user || user.role !== "WARDEN" || !user.warden) {
      return NextResponse.json({ error: "Unauthorized - Not a Warden" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    // Ensure the ticket belongs to the warden's hostel
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: parsed.data.id },
      include: { tenant: { select: { userId: true } } }
    });

    if (!existingTicket || existingTicket.hostelId !== user.warden.hostelId) {
      return NextResponse.json({ error: "Ticket not found or unauthorized" }, { status: 404 });
    }

    const updateData: any = { status: parsed.data.status };
    if (parsed.data.status === "RESOLVED" && existingTicket.status !== "RESOLVED") {
      updateData.resolvedAt = new Date();
    }
    if (parsed.data.status === "CLOSED" && existingTicket.status !== "CLOSED") {
      updateData.closedAt = new Date();
    }

    const ticket = await prisma.ticket.update({
      where: { id: parsed.data.id },
      data: updateData
    });

    // --- Fanout Notifications ---
    // 1. Notify Tenant
    if (existingTicket.tenant.userId) {
      await prisma.notification.create({
        data: {
          userId: existingTicket.tenant.userId,
          title: "Ticket Status Updated",
          message: `Your ticket "${ticket.title}" is now ${ticket.status}.`,
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
          title: "Ticket Updated",
          message: `Warden updated Ticket "${ticket.title}" to ${ticket.status}.`,
          type: "TICKET",
          referenceId: ticket.id
        }
      });
    }

    void logActivity({
      organizationId: user.organizationId,
      hostelId: user.warden.hostelId,
      eventType: ActivityEventType.TICKET_STATUS_UPDATED,
      actorId: user.id,
      actorName: "Warden",
      subjectName: ticket.title,
      subjectId: ticket.id,
      subjectType: "Ticket",
      metadata: {
        oldStatus: existingTicket.status,
        newStatus: ticket.status,
      },
      targetUrl: `/warden/tickets`,
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
