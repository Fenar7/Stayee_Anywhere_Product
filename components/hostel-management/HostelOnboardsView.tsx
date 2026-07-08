"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Check, Copy, Eye, Clock, Key } from "lucide-react";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { notify } from "@/lib/toast";
import { PageHeader } from "@/components/shared/PageHeader";
import { STAY_STATUS_LABELS, STAY_STATUS_COLORS } from "@/lib/labels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

interface OnboardItem {
  id: string;
  status: string;
  joiningDate: string;
  endDate: string;
  totalPayable: number;
  hasPendingPayment?: boolean;
  tenant: {
    id: string;
    fullName: string;
    phone: string;
    gender: string;
    hasProfile: boolean;
  };
  bed: {
    id: string;
    label: string;
    roomNumber: string;
  };
  onboardingRequest?: {
    id: string;
    status: string;
    createdAt: string;
  } | null;
}

export default function HostelOnboardsView({
  hostelId,
  baseRoute,
}: {
  hostelId: string | null;
  baseRoute: string;
}) {
  const router = useRouter();
  const [onboards, setOnboards] = useState<OnboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Password modal
  const [passwordModal, setPasswordModal] = useState<{
    onboardingReqId: string;
    phone: string;
  } | null>(null);
  const [revealedPassword, setRevealedPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchOnboards = async () => {
    try {
      const url = hostelId ? `/api/warden/onboards?hostelId=${hostelId}` : "/api/warden/onboards";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch onboarding list");
      }
      const data = await response.json();
      setOnboards(data.onboards);
    } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err);
      notify.error(errorMsg || "An error occurred while loading lists");
    } finally {
      setLoading(false);
    }
  };

  const executeCancel = async () => {
    if (!confirmCancelId) return;
    const id = confirmCancelId;
    setConfirmCancelId(null);
    setCancellingId(id);
    try {
      const response = await fetch(`/api/admin/onboards/${id}/cancel`, {
        method: "POST",
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to cancel");
      }
      await fetchOnboards();
      notify.success("Request cancelled successfully");
    } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err);
      notify.error(errorMsg || "Failed to cancel onboarding request");
    } finally {
      setCancellingId(null);
    }
  };

  const handleViewPassword = async (onboardingReqId: string, phone: string) => {
    setPasswordModal({ onboardingReqId, phone });
    setRevealedPassword("");
    setPasswordCopied(false);
    setPasswordLoading(true);
    try {
      const res = await fetch(
        `/api/warden/onboarding-requests/${onboardingReqId}/regenerate-password`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get password");
      setRevealedPassword(data.tempPassword);
    } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err);
      notify.error(errorMsg || "An error occurred");
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboards();
  }, [hostelId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="border-b pb-6">
          <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-96 bg-muted rounded animate-pulse" />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const renderTable = (items: OnboardItem[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <EmptyState
          icon={Loader2}
          title="No Onboards Found"
          description={emptyMessage}
          action={{
            label: "+ Onboard New Tenant",
            href: `${baseRoute}/onboard`
          }}
        />
      );
    }

    return (
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bed Assigned</TableHead>
              <TableHead>Stay Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const label = STAY_STATUS_LABELS[item.status] || item.status;
              const colorClass = STAY_STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800";
              const needsPaymentVerify = item.status === "APPROVED_AWAITING_PAYMENT" && item.hasPendingPayment;

              return (
                <TableRow 
                  key={item.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`${baseRoute}/onboards/${item.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{getInitials(item.tenant.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span>{item.tenant.fullName}</span>
                        <span className="text-xs text-muted-foreground">{item.tenant.phone}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant="outline" className={colorClass}>
                        {label}
                      </Badge>
                      {needsPaymentVerify && (
                        <Badge variant="destructive" className="animate-pulse text-[10px] px-1.5 py-0">
                          Verify Payment
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{item.bed.roomNumber} - {item.bed.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatDate(item.joiningDate)} - {formatDate(item.endDate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      {item.status === "ONBOARDING_PENDING" && !item.tenant.hasProfile && item.onboardingRequest && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPassword(item.onboardingRequest!.id, item.tenant.phone)}
                        >
                          <Key className="h-4 w-4 mr-1" /> Key
                        </Button>
                      )}
                      {item.status === "ONBOARDING_PENDING" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setConfirmCancelId(item.id)}
                        >
                          Cancel
                        </Button>
                      )}
                      <Link href={`${baseRoute}/onboards/${item.id}`}>
                        <Button variant="ghost" size="icon">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const awaitingForm = onboards.filter((i) => i.status === "ONBOARDING_PENDING" && !i.tenant.hasProfile);
  const awaitingReview = onboards.filter((i) => i.status === "ONBOARDING_PENDING" && i.tenant.hasProfile);
  const awaitingPayment = onboards.filter((i) => i.status === "APPROVED_AWAITING_PAYMENT");
  const activeStays = onboards.filter((i) => i.status === "ACTIVE" || i.status === "EXTENDED");
  const cancelled = onboards.filter((i) => i.status === "CANCELLED");

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Onboarding & Stays"
        description="Manage tenant applications, verification, and active stays."
        actions={
          <Link href={`${baseRoute}/onboard`}>
            <Button size="sm">+ Onboard New Tenant</Button>
          </Link>
        }
      />
      <div className="p-6">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6 overflow-x-auto flex-nowrap w-full justify-start h-auto p-1 bg-muted/50">
            <TabsTrigger value="all">All Stays ({onboards.length})</TabsTrigger>
            <TabsTrigger value="form">Awaiting Form ({awaitingForm.length})</TabsTrigger>
            <TabsTrigger value="review">Awaiting Review ({awaitingReview.length})</TabsTrigger>
            <TabsTrigger value="payment">Awaiting Payment ({awaitingPayment.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeStays.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="m-0">
            {renderTable(onboards, "No onboarding applications or stays found.")}
          </TabsContent>
          <TabsContent value="form" className="m-0">
            {renderTable(awaitingForm, "No tenants currently filling out forms.")}
          </TabsContent>
          <TabsContent value="review" className="m-0">
            {renderTable(awaitingReview, "No applications pending warden review.")}
          </TabsContent>
          <TabsContent value="payment" className="m-0">
            {renderTable(awaitingPayment, "No approved applications waiting for payment.")}
          </TabsContent>
          <TabsContent value="active" className="m-0">
            {renderTable(activeStays, "No active stays found.")}
          </TabsContent>
          <TabsContent value="cancelled" className="m-0">
            {renderTable(cancelled, "No cancelled applications found.")}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!confirmCancelId} onOpenChange={() => setConfirmCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Onboarding Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the application as cancelled and immediately free up the reserved bed. The tenant will no longer be able to log in or complete this form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                executeCancel();
              }}
              disabled={!!cancellingId}
            >
              {cancellingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!passwordModal} onOpenChange={() => setPasswordModal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tenant Login Details</AlertDialogTitle>
            <AlertDialogDescription>
              Provide this temporary password to the tenant so they can log in via their phone number and complete the registration form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium text-muted-foreground">Phone:</span>
              <span className="font-mono font-bold">{passwordModal?.phone}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <span className="font-medium text-muted-foreground">Password:</span>
              <div className="flex items-center gap-2">
                {passwordLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="font-mono text-lg font-bold tracking-widest bg-background px-2 py-1 rounded border">
                      {revealedPassword}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (revealedPassword) {
                          navigator.clipboard.writeText(revealedPassword).catch((err) => {
                            // Fallback
                            const textArea = document.createElement("textarea");
                            textArea.value = revealedPassword;
                            document.body.appendChild(textArea);
                            textArea.select();
                            try {
                              document.execCommand('copy');
                            } catch (err) {}
                            document.body.removeChild(textArea);
                          });
                          setPasswordCopied(true);
                          setTimeout(() => setPasswordCopied(false), 2000);
                        }
                      }}
                      title="Copy to clipboard"
                    >
                      {passwordCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <Button onClick={() => setPasswordModal(null)}>Done</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
