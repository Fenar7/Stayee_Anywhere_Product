import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/services/activity/activity.service";
import { ActivityEventType } from "@prisma/client";
import { createClient } from "@/lib/auth/server";
import { z } from "zod";

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
      where: { cognitoSub: authUser.id }
    });

    if (!user || user.role !== "MAIN_ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Not an Admin" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const hostelFilter = searchParams.get("hostelId");

    const whereClause: any = { hostel: { organizationId: user.organizationId } };
    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }
    if (hostelFilter && hostelFilter !== "ALL") {
      whereClause.hostelId = hostelFilter;
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        hostel: { select: { name: true } },
        tenant: { select: { fullName: true, userId: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Error fetching admin tickets:", error);
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
      where: { cognitoSub: authUser.id }
    });

    if (!user || user.role !== "MAIN_ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Not an Admin" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const existingTicket = await prisma.ticket.findUnique({
      where: { id: parsed.data.id },
      include: { 
        tenant: { select: { userId: true } },
        hostel: { select: { organizationId: true, warden: { select: { userId: true } } } }
      }
    });

    if (!existingTicket || existingTicket.hostel.organizationId !== user.organizationId) {
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
          message: `Admin updated your ticket "${ticket.title}" to ${ticket.status}.`,
          type: "TICKET"
        }
      });
    }

    // 2. Notify Warden
    if (existingTicket.hostel.warden?.userId) {
      await prisma.notification.create({
        data: {
          userId: existingTicket.hostel.warden.userId,
          title: "Ticket Updated by Admin",
          message: `Admin updated Ticket "${ticket.title}" to ${ticket.status}.`,
          type: "TICKET"
        }
      });
    }

    void logActivity({
      organizationId: user.organizationId,
      hostelId: existingTicket.hostelId,
      eventType: ActivityEventType.TICKET_STATUS_UPDATED,
      actorId: user.id,
      actorName: "Admin",
      subjectName: ticket.title,
      subjectId: ticket.id,
      subjectType: "Ticket",
      metadata: {
        oldStatus: existingTicket.status,
        newStatus: ticket.status,
      },
      targetUrl: `/admin/tickets`,
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error updating ticket by admin:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
