"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Shield, Mail, Phone, Building2,
  Key, Pencil, X, RefreshCw, Search, MapPin,
  Users, CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WardenItem {
  id: string;
  userId: string;
  phone: string;
  email: string | null;
  hostel: {
    id: string;
    name: string;
    accommodationType: string;
    location: { id: string; name: string } | null;
  };
  totalOnboardings: number;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_STYLE: Record<string, string> = {
  MENS:   "bg-[#dbeafe] text-[#1e40af]",
  WOMENS: "bg-[#fce7f3] text-[#9d174d]",
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WardensPage() {
  const [wardens, setWardens]     = useState<WardenItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search,  setSearch]      = useState("");

  // Edit modal
  const [editTarget, setEditTarget] = useState<WardenItem | null>(null);
  const [editEmail,  setEditEmail]  = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Reset password modal
  const [resetTarget,   setResetTarget]   = useState<WardenItem | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSaving,   setResetSaving]   = useState(false);

  const fetchWardens = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/wardens");
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to fetch wardens"); }
      const data = await res.json();
      setWardens(data.wardens);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWardens(); }, []);

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/wardens/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editEmail || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      notify.success("Email updated successfully");
      setEditTarget(null);
      await fetchWardens();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setEditSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetSaving(true);
    try {
      const res = await fetch(`/api/admin/wardens/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      notify.success("Password reset successfully!");
      setResetTarget(null);
      setResetPassword("");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setResetSaving(false);
    }
  };

  const filtered = wardens.filter(
    (w) =>
      w.hostel.name.toLowerCase().includes(search.toLowerCase()) ||
      w.phone.includes(search)
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 py-5 w-full max-w-[1400px] mx-auto bg-white dark:bg-black min-h-screen">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#dedede]">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-black dark:text-white">Warden Management</h1>
          <p className="text-[#767676] text-[14px] mt-0.5">View and manage all hostel wardens.</p>
        </div>
        <div className="flex items-center gap-2 self-start flex-wrap">
          {/* Summary pill */}
          <div className="h-10 px-4 rounded-[6px] border border-[#dedede] flex items-center gap-2">
            <Users className="size-4 text-[#767676]" />
            <span className="text-[14px] font-semibold text-black dark:text-white">{wardens.length}</span>
            <span className="text-[14px] text-[#767676]">wardens</span>
          </div>
          {/* Refresh */}
          <button
            onClick={fetchWardens}
            disabled={loading}
            className="size-10 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:text-black hover:border-[#c0c0c0] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="py-4">
        <div className="relative w-full sm:w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a1a1a1]" />
          <input
            type="text"
            placeholder="Search by hostel or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-[6px] border border-[#dedede] bg-white text-[13px] text-black placeholder:text-[#a1a1a1] outline-none focus:border-[#282828] transition-colors"
          />
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && <LoadingSkeleton />}

      {/* ── Empty State ── */}
      {!loading && filtered.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="size-16 rounded-[10px] bg-[#5c5c5c] flex items-center justify-center">
            <Shield className="size-8 text-[#58ff48]" />
          </div>
          <div>
            <h3 className="text-[18px] font-bold text-black dark:text-white">No Wardens Found</h3>
            <p className="text-[14px] text-[#767676] mt-1">
              {search ? "No wardens match your search." : "No wardens have been created yet."}
            </p>
          </div>
          {!search && (
            <div className="flex gap-2 flex-wrap justify-center">
              <Link
                href="/admin/hostels/new"
                className="h-10 px-5 rounded-[6px] bg-[#282828] text-white text-[14px] font-semibold hover:bg-black transition-colors flex items-center gap-2"
              >
                Add Hostel
              </Link>
              <Link
                href="/admin"
                className="h-10 px-5 rounded-[6px] border border-[#dedede] text-[#767676] text-[14px] font-semibold hover:text-black hover:border-[#c0c0c0] transition-colors flex items-center"
              >
                Back to Dashboard
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Desktop Table ── */}
      {!loading && filtered.length > 0 && (
        <>
          <div className="hidden md:block rounded-[7px] border border-[#dedede] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#f2f2f2] bg-[#fafafa]">
                    {["Hostel", "Phone", "Email", "Onboardings", "Created", "Actions"].map((h, i) => (
                      <th
                        key={h}
                        className={cn(
                          "px-4 py-3 text-[12px] font-semibold text-[#767676] uppercase tracking-wide text-left",
                          i === 3 && "text-center",
                          i === 5 && "text-right"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((w) => (
                    <tr
                      key={w.id}
                      className="border-b border-[#f2f2f2] last:border-0 bg-white hover:bg-[#fafafa] transition-colors"
                    >
                      {/* Hostel */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-[7px] bg-[#5c5c5c] flex items-center justify-center shrink-0">
                            <Building2 className="size-4 text-[#58ff48]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-black dark:text-white truncate">{w.hostel.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", TYPE_STYLE[w.hostel.accommodationType] ?? "bg-[#f2f2f2] text-[#5c5c5c]")}>
                                {w.hostel.accommodationType}
                              </span>
                              {w.hostel.location && (
                                <span className="flex items-center gap-1 text-[12px] text-[#767676]">
                                  <MapPin className="size-3" />
                                  {w.hostel.location.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-[#767676]">
                          <Phone className="size-3.5 shrink-0" />
                          <span className="text-[13px] font-mono">{w.phone}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5">
                        {w.email ? (
                          <div className="flex items-center gap-1.5 text-[#767676]">
                            <Mail className="size-3.5 shrink-0" />
                            <span className="text-[13px] truncate max-w-[180px]">{w.email}</span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-[#a1a1a1] italic">Not set</span>
                        )}
                      </td>

                      {/* Onboardings */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center size-7 rounded-full text-[13px] font-bold",
                          w.totalOnboardings > 0
                            ? "bg-[#dcfce7] text-[#15803d]"
                            : "bg-[#f2f2f2] text-[#767676]"
                        )}>
                          {w.totalOnboardings}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] text-[#767676]">{formatDate(w.createdAt)}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditTarget(w); setEditEmail(w.email || ""); }}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[#dedede] text-[12px] font-semibold text-[#767676] hover:text-black hover:border-[#c0c0c0] transition-colors bg-white"
                          >
                            <Pencil className="size-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => { setResetTarget(w); setResetPassword(""); }}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[#dedede] text-[12px] font-semibold text-[#767676] hover:text-black hover:border-[#c0c0c0] transition-colors bg-white"
                          >
                            <Key className="size-3.5" /> Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile Card List ── */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((w) => (
              <div key={w.id} className="rounded-[7px] border border-[#dedede] bg-white p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-[7px] bg-[#5c5c5c] flex items-center justify-center shrink-0">
                      <Building2 className="size-5 text-[#58ff48]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-black truncate">{w.hostel.name}</p>
                      {w.hostel.location && (
                        <p className="text-[12px] text-[#767676] flex items-center gap-1 mt-0.5">
                          <MapPin className="size-3" /> {w.hostel.location.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0", TYPE_STYLE[w.hostel.accommodationType] ?? "bg-[#f2f2f2] text-[#5c5c5c]")}>
                    {w.hostel.accommodationType}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-[13px] text-[#767676]">
                    <Phone className="size-3.5 shrink-0" />
                    <span className="font-mono">{w.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[#767676]">
                    <Mail className="size-3.5 shrink-0" />
                    <span className={w.email ? "" : "italic text-[#a1a1a1]"}>{w.email || "Email not set"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[#767676]">
                    <CheckCircle className="size-3.5 shrink-0" />
                    <span>{w.totalOnboardings} Onboarding{w.totalOnboardings !== 1 ? "s" : ""}</span>
                    <span className="ml-auto text-[12px]">{formatDate(w.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-2 pt-3 border-t border-[#f2f2f2]">
                  <button
                    onClick={() => { setEditTarget(w); setEditEmail(w.email || ""); }}
                    className="flex-1 h-9 rounded-[6px] border border-[#dedede] text-[13px] font-semibold text-[#767676] hover:text-black transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Pencil className="size-3.5" /> Edit Email
                  </button>
                  <button
                    onClick={() => { setResetTarget(w); setResetPassword(""); }}
                    className="flex-1 h-9 rounded-[6px] border border-[#dedede] text-[13px] font-semibold text-[#767676] hover:text-black transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Key className="size-3.5" /> Reset Pwd
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Results count */}
          <p className="text-[12px] text-[#a1a1a1] mt-3">
            Showing {filtered.length} of {wardens.length} wardens
          </p>
        </>
      )}

      {/* ── Edit Email Modal ── */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => { if (!editSaving) setEditTarget(null); }}
        >
          <div
            className="w-full max-w-md rounded-[10px] border border-[#dedede] bg-white shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-[18px] font-bold text-black">Edit Warden Email</h2>
                <p className="text-[13px] text-[#767676] mt-0.5">{editTarget.hostel.name} · {editTarget.phone}</p>
              </div>
              <button
                onClick={() => { if (!editSaving) setEditTarget(null); }}
                className="size-8 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:text-black transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-1.5 mb-5">
              <label className="text-[13px] font-semibold text-black">Email Address</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="warden@example.com"
                className="w-full h-10 px-3 rounded-[6px] border border-[#dedede] text-[14px] text-black placeholder:text-[#a1a1a1] outline-none focus:border-[#282828] transition-colors"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditTarget(null)}
                disabled={editSaving}
                className="flex-1 h-10 rounded-[6px] border border-[#dedede] text-[14px] font-semibold text-[#767676] hover:text-black transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={editSaving}
                className="flex-1 h-10 rounded-[6px] bg-[#282828] text-white text-[14px] font-semibold hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editSaving && <Loader2 className="size-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => { if (!resetSaving) { setResetTarget(null); setResetPassword(""); } }}
        >
          <div
            className="w-full max-w-md rounded-[10px] border border-[#dedede] bg-white shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-[18px] font-bold text-black">Reset Password</h2>
                <p className="text-[13px] text-[#767676] mt-0.5">{resetTarget.hostel.name} · {resetTarget.phone}</p>
              </div>
              <button
                onClick={() => { if (!resetSaving) { setResetTarget(null); setResetPassword(""); } }}
                className="size-8 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:text-black transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-1.5 mb-2">
              <label className="text-[13px] font-semibold text-black">New Password</label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full h-10 px-3 rounded-[6px] border border-[#dedede] text-[14px] text-black placeholder:text-[#a1a1a1] outline-none focus:border-[#282828] transition-colors"
              />
            </div>
            <p className="text-[12px] text-[#a1a1a1] mb-5">The warden will need to log in with this new password.</p>

            <div className="flex gap-2">
              <button
                onClick={() => { setResetTarget(null); setResetPassword(""); }}
                disabled={resetSaving}
                className="flex-1 h-10 rounded-[6px] border border-[#dedede] text-[14px] font-semibold text-[#767676] hover:text-black transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetSaving || resetPassword.length < 8}
                className="flex-1 h-10 rounded-[6px] bg-[#e23030] text-white text-[14px] font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetSaving && <Loader2 className="size-4 animate-spin" />}
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="rounded-[7px] border border-[#dedede] overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-[#f2f2f2] last:border-0 animate-pulse">
          <div className="size-9 rounded-[7px] bg-[#f2f2f2] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 rounded bg-[#f2f2f2]" />
            <div className="h-3 w-24 rounded bg-[#f2f2f2]" />
          </div>
          <div className="h-3 w-28 rounded bg-[#f2f2f2]" />
          <div className="h-3 w-36 rounded bg-[#f2f2f2]" />
          <div className="h-6 w-6 rounded-full bg-[#f2f2f2]" />
          <div className="h-3 w-20 rounded bg-[#f2f2f2]" />
          <div className="flex gap-2">
            <div className="h-8 w-16 rounded-[6px] bg-[#f2f2f2]" />
            <div className="h-8 w-20 rounded-[6px] bg-[#f2f2f2]" />
          </div>
        </div>
      ))}
    </div>
  );
}
