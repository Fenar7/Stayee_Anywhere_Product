import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { paiseToRupees } from "@/lib/money";
import { PaymentForm } from "./PaymentForm";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

function formatType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export default async function ServiceRequestPaymentPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await requireRole([UserRole.TENANT]);
  
  const tenant = await prisma.tenant.findUnique({
    where: { userId: session.user.id },
  });
  
  if (!tenant) {
    redirect("/login");
  }

  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id },
    include: { stay: true },
  });

  if (!serviceRequest || serviceRequest.stay.tenantId !== tenant.id) {
    redirect("/tenant");
  }

  if (serviceRequest.status !== "PENDING_PAYMENT") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border rounded-xl shadow-sm p-8 text-center space-y-4">
          <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-2xl font-bold">Payment Already Uploaded</h1>
          <p className="text-muted-foreground">This service request is no longer pending payment. The warden will verify it soon.</p>
          <Link href="/tenant" className={buttonVariants({ variant: "outline", className: "mt-4 w-full" })}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const amount = paiseToRupees(serviceRequest.amountPaise);
  const typeLabel = formatType(serviceRequest.type);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center">
          <Link href="/tenant" className={buttonVariants({ variant: "ghost", size: "sm", className: "mr-4" })}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Service Request</h1>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-12">
        <PaymentForm serviceRequestId={id} amount={amount} typeLabel={typeLabel} />
      </main>
    </div>
  );
}
