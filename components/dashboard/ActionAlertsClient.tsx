"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronRight, CheckCircle2, IndianRupee } from "lucide-react";
import useSWR from "swr";
import { cn } from "@/lib/utils";

export function ActionAlertsClient({ role }: { role: "WARDEN" | "MAIN_ADMIN" }) {
  const { data: counts, isLoading } = useSWR(
    "/api/warden/action-counts",
    (url: string) => fetch(url).then(res => res.json()),
    { refreshInterval: 60000, dedupingInterval: 10000 }
  );

  if (isLoading || !counts) return null;

  const totalActions = counts.pendingReviews + counts.pendingPayments;
  
  if (totalActions === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 mb-8">
      {counts.pendingReviews > 0 && (
        <Link 
          href={`/${role.toLowerCase() === "main_admin" ? "admin" : "warden"}/onboards`}
          className="group relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 p-4 transition-colors hover:bg-amber-100/50 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:bg-amber-900/40"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/50">
              <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Action Required
              </h3>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                <span className="font-bold">{counts.pendingReviews}</span> onboarding requests awaiting warden verification.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-600 transition-transform group-hover:translate-x-1 dark:text-amber-400" />
          </div>
        </Link>
      )}

      {counts.pendingPayments > 0 && (
        <Link 
          href={`/${role.toLowerCase() === "main_admin" ? "admin" : "warden"}/onboards`}
          className="group relative overflow-hidden rounded-xl border border-blue-200 bg-blue-50/50 p-4 transition-colors hover:bg-blue-100/50 dark:border-blue-900/50 dark:bg-blue-950/20 dark:hover:bg-blue-900/40"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/50">
              <IndianRupee className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Pending Payments
              </h3>
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                <span className="font-bold">{counts.pendingPayments}</span> approved stays awaiting tenant payment screenshot.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-1 dark:text-blue-400" />
          </div>
        </Link>
      )}
    </div>
  );
}
