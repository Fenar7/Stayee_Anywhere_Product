"use client";

import { useEffect, useState } from "react";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, Users, IndianRupee, CheckCircle, XCircle, AlertCircle, PlusCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function FoodFinanceDashboard({ hostelId }: { hostelId: string }) {
  const [data, setData] = useState<any>(null);
  const [pendingTopUps, setPendingTopUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [finRes, topUpsRes] = await Promise.all([
        fetch(`/api/warden/food-finance?hostelId=${hostelId}`),
        fetch(`/api/warden/food-topups`),
      ]);
      
      if (!finRes.ok) throw new Error("Failed to load finance data");
      if (!topUpsRes.ok) throw new Error("Failed to load pending top-ups");
      
      setData(await finRes.json());
      setPendingTopUps(await topUpsRes.json());
    } catch (e: any) {
      notify.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hostelId]);

  const handleApproveTopUp = async (id: string) => {
    try {
      const res = await fetch(`/api/warden/food-topups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE", paymentMode: "CASH" }), // Defaulting to CASH for now
      });
      if (!res.ok) throw new Error("Failed to approve top-up");
      notify.success("Top-up approved");
      loadData();
    } catch (e: any) {
      notify.error(e.message);
    }
  };

  const handleRejectTopUp = async (id: string) => {
    try {
      const res = await fetch(`/api/warden/food-topups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT" }),
      });
      if (!res.ok) throw new Error("Failed to reject top-up");
      notify.success("Top-up rejected");
      loadData();
    } catch (e: any) {
      notify.error(e.message);
    }
  };

  const handleRecordTopUp = async (stayId: string) => {
    const amountStr = prompt("Enter top-up amount in INR:");
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return notify.error("Invalid amount");

    try {
      const res = await fetch(`/api/warden/food-topup-direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stayId,
          amountPaise: amount * 100,
          paymentMode: "CASH",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to record top-up");
      notify.success("Top-up recorded successfully");
      loadData();
    } catch (e: any) {
      notify.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#4b5563]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-32 w-full max-w-4xl bg-gray-200 rounded-xl" />
          <div className="h-64 w-full max-w-4xl bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Overview Card */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-semibold text-[#1a1a1a]">Cycle Overview</h2>
          <p className="text-[13px] text-[#4b5563] mt-1">
            {data.cyclePeriod
              ? `${new Date(data.cyclePeriod.start).toLocaleDateString()} to ${new Date(
                  data.cyclePeriod.end
                ).toLocaleDateString()}`
              : "No active cycle"}
          </p>
          <button 
            onClick={() => notify.info("Close cycle functionality coming in Phase 3.")}
            className="mt-3 text-xs font-medium text-red-600 border border-red-200 bg-red-50 px-3 py-1.5 rounded-md hover:bg-red-100 transition-colors"
          >
            Close Current Cycle
          </button>
        </div>

        <div className="flex gap-12">
          <div>
            <p className="text-[13px] text-[#4b5563] mb-1 flex items-center gap-1">
              <Wallet className="size-4" /> Total Collected
            </p>
            <p className="text-2xl font-bold text-[#1a1a1a]">₹{(data.totalRevenuePaise / 100).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[13px] text-[#4b5563] mb-1 flex items-center gap-1">
              <IndianRupee className="size-4" /> Total Consumed
            </p>
            <p className="text-2xl font-bold text-[#1a1a1a]">₹{(data.totalConsumedPaise / 100).toFixed(2)}</p>
          </div>
          <div className="pl-6 border-l border-[#e5e7eb]">
            <p className="text-[13px] text-[#4b5563] mb-1">Net Position</p>
            <p
              className={cn(
                "text-2xl font-bold",
                data.netPositionPaise >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {data.netPositionPaise >= 0 ? "+" : "-"}₹
              {(Math.abs(data.netPositionPaise) / 100).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Pending Top-Ups */}
      {pendingTopUps.length > 0 && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-yellow-200 flex items-center gap-2">
            <AlertCircle className="size-5 text-yellow-600" />
            <h3 className="font-medium text-yellow-900">Pending Top-Up Requests</h3>
            <span className="ml-auto bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingTopUps.length}
            </span>
          </div>
          <ul className="divide-y divide-yellow-200">
            {pendingTopUps.map((t) => (
              <li key={t.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-yellow-900">{t.tenantName}</p>
                  <p className="text-xs text-yellow-700">Room {t.roomNumber} {t.bedLabel} • Requested ₹{(t.amountPaise / 100).toFixed(2)}</p>
                  {t.reason && <p className="text-xs text-yellow-600 italic mt-0.5">"{t.reason}"</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRejectTopUp(t.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                  >
                    <XCircle className="size-4" /> Reject
                  </button>
                  <button
                    onClick={() => handleApproveTopUp(t.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200"
                  >
                    <CheckCircle className="size-4" /> Approve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Debt List */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#e5e7eb] bg-[#f9fafb] flex items-center gap-2">
            <TrendingDown className="size-5 text-red-600" />
            <h3 className="font-medium text-[#1a1a1a]">Tenants in Debt</h3>
            <span className="ml-auto bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {data.tenantsInDebt.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] p-4">
            {data.tenantsInDebt.length === 0 ? (
              <p className="text-sm text-[#4b5563] text-center py-4">No tenants in debt.</p>
            ) : (
              <ul className="space-y-4">
                {data.tenantsInDebt.map((t: any) => (
                  <li key={t.stayId} className="flex justify-between items-center border-b border-[#f3f4f6] pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-[#1a1a1a]">{t.tenantName}</p>
                      <p className="text-xs text-[#4b5563]">Room {t.roomName} • {t.billingMode}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">₹{(Math.abs(t.balancePaise) / 100).toFixed(2)} <span className="text-[10px] uppercase tracking-wider font-normal">Due</span></p>
                      </div>
                      <button 
                        onClick={() => handleRecordTopUp(t.stayId)}
                        className="flex items-center gap-1 text-[11px] font-medium text-white bg-[#111827] px-2.5 py-1 rounded hover:bg-[#374151] transition-colors"
                      >
                        <PlusCircle className="size-3" /> Record Top-Up
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Credit List */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#e5e7eb] bg-[#f9fafb] flex items-center gap-2">
            <TrendingUp className="size-5 text-green-600" />
            <h3 className="font-medium text-[#1a1a1a]">Tenants in Credit</h3>
            <span className="ml-auto bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {data.tenantsInCredit.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] p-4">
            {data.tenantsInCredit.length === 0 ? (
              <p className="text-sm text-[#4b5563] text-center py-4">No tenants in credit.</p>
            ) : (
              <ul className="space-y-4">
                {data.tenantsInCredit.map((t: any) => (
                  <li key={t.stayId} className="flex flex-col border-b border-[#f3f4f6] pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-[#1a1a1a]">{t.tenantName}</p>
                        <p className="text-xs text-[#4b5563]">Room {t.roomName} • {t.billingMode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">+₹{(t.balancePaise / 100).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between bg-[#f9fafb] p-2 rounded-md">
                       <div className="flex items-center gap-4 text-[11px] text-[#4b5563]">
                         <span>Paid: <strong className="text-[#1a1a1a]">₹{(t.totalPaidPaise / 100).toFixed(2)}</strong></span>
                         <span>Consumed: <strong className="text-[#1a1a1a]">₹{(t.totalConsumedPaise / 100).toFixed(2)}</strong></span>
                       </div>
                       <Link href="#" className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline">
                         View Details <ArrowRight className="size-3" />
                       </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Flat Rate List */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#e5e7eb] bg-[#f9fafb] flex items-center gap-2">
          <Users className="size-5 text-gray-500" />
          <h3 className="font-medium text-[#1a1a1a]">Flat Rate Tenants</h3>
          <span className="ml-auto bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">
            {data.flatRateTenants.length}
          </span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {data.flatRateTenants.length === 0 ? (
            <p className="text-sm text-[#4b5563] col-span-full">No flat rate tenants.</p>
          ) : (
            data.flatRateTenants.map((t: any) => (
              <div key={t.stayId} className="flex items-center gap-3 p-3 rounded-lg border border-[#f3f4f6] bg-[#f9fafb]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{t.tenantName}</p>
                  <p className="text-xs text-[#4b5563]">{t.roomName}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
