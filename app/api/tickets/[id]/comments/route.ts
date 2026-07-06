import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/auth/server";
import { z } from "zod";

const commentSchema = z.object({
  message: z.string().min(1).max(2000),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { supabaseAuthId: authUser.id },
      include: { tenant: true, warden: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: ticketId } = await params;
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Authorization checks
    let isAuthorized = false;
    let isInternal = false;

    if (user.role === "TENANT") {
      isAuthorized = ticket.tenantId === user.tenant?.id;
    } else if (user.role === "WARDEN") {
      isAuthorized = ticket.hostelId === user.warden?.hostelId;
      isInternal = true; // Wardens/Admins make internal notes by default? The plan said "so tenants can see it", so I'll set isInternal = false so tenants can see notes.
      isInternal = false; 
    } else if (user.role === "MAIN_ADMIN") {
      // Main admin can comment on anything in their org
      isAuthorized = true;
      isInternal = false;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        userId: user.id,
        message: parsed.data.message,
        isInternal: isInternal
      }
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Error creating ticket comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
