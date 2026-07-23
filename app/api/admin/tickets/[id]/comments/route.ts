import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comments = await prisma.ticketComment.findMany({
      where: { ticketId: id },
      include: {
        user: {
          select: { role: true, tenant: { select: { fullName: true } } }
        }
      },
      orderBy: { createdAt: "asc" }
    });
    
    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { message, isInternal } = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { cognitoSub: user.id }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: dbUser.id,
        message,
        isInternal: isInternal || false,
      },
      include: {
        user: { select: { role: true, tenant: { select: { fullName: true } } } }
      }
    });

    // Notify tenant if non-internal comment
    if (!isInternal) {
      try {
        const ticket = await prisma.ticket.findUnique({
          where: { id },
          include: { tenant: true }
        });

        if (ticket?.tenant?.userId) {
          await prisma.notification.create({
            data: {
              userId: ticket.tenant.userId,
              title: "New Warden Response",
              message: `A response was added to your ticket: ${ticket.title}`,
              type: "TICKET",
              referenceId: ticket.id,
            }
          });
        }
      } catch (err) {
        console.error("Failed to notify tenant:", err);
      }
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Comment creation error:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
