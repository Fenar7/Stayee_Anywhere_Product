"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import {
  Loader2, Search, User, Key, CheckCircle, AlertCircle,
  Eye, X, Check, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Debounce Hook ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserItem {
  id: string;
  supabaseAuthId: string;
  phone: string;
  email: string | null;
  role: "MAIN_ADMIN" | "WARDEN" | "TENANT";
  passwordSetAt: string | null;
  plainTextPassword: string | null;
  createdAt: string;
  warden: {
    id: string;
    hostel: { id: string; name: string } | null;
  } | null;
  tenant: {
    id: string;
    fullName: string;
    photoUrl: string | null;
    stays: {
      hostel: { name: string };
      status: string;
      bed?: { label: string; room: { roomNumber: string } } | null;
    }[];
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

const ROLE_FILTERS = [
  { value: "ALL", label: "All Users" },
  { value: "TENANT", label: "Tenants" },
  { value: "WARDEN", label: "Wardens" },
  { value: "MAIN_ADMIN", label: "Admins" },
];

const ROLE_STYLE: Record<string, string> = {
  MAIN_ADMIN: "bg-[#ede9fe] text-[#5b21b6]",
  WARDEN:     "bg-[#dbeafe] text-[#1e40af]",
  TENANT:     "bg-[#dcfce7] text-[#15803d]",
};

const ROLE_LABEL: Record<string, string> = {
  MAIN_ADMIN: "Admin",
  WARDEN:     "Warden",
  TENANT:     "Tenant",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [resetModal, setResetModal] = useState<{ id: string; phone: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleResetPassword = async () => {
    if (!resetModal) return;
    try {
      setResetLoading(true);
      const res = await fetch(`/api/admin/users/${resetModal.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPassword: customPassword.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reset password");
      }
      const data = await res.json();
      setNewPassword(data.tempPassword);
      fetchUsers();
      notify.success("Password reset successfully");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (debouncedQuery) {
        const q = debouncedQuery.toLowerCase();
        const name = u.tenant?.fullName ?? "";
        if (!u.phone.includes(q) && !name.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [users, roleFilter, debouncedQuery]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 py-5 w-full max-w-[1400px] mx-auto bg-white dark:bg-black min-h-screen">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#dedede]">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-black dark:text-white">User Management</h1>
          <p className="text-[#767676] text-[14px] mt-0.5">View and manage all users across the platform.</p>
        </div>
        {/* Summary pill */}
        <div className="flex items-center gap-2 self-start">
          <div className="h-10 px-4 rounded-[6px] border border-[#dedede] flex items-center gap-2">
            <User className="size-4 text-[#767676]" />
            <span className="text-[14px] font-semibold text-black dark:text-white">{users.length}</span>
            <span className="text-[14px] text-[#767676]">users</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
        {/* Role filter tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setRoleFilter(f.value)}
              className={cn(
                "h-9 px-4 rounded-[6px] text-[13px] font-semibold transition-all",
                roleFilter === f.value
                  ? "bg-[#282828] text-white"
                  : "border border-[#dedede] text-[#767676] hover:text-black hover:border-[#c0c0c0] bg-white"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a1a1a1]" />
          <input
            type="text"
            placeholder="Search phone, name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-[6px] border border-[#dedede] bg-white text-[13px] text-black placeholder:text-[#a1a1a1] outline-none focus:border-[#282828] transition-colors"
          />
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredUsers.length === 0 ? (
        <EmptyUsers />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-[7px] border border-[#dedede] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#f2f2f2] bg-[#fafafa]">
                    {["User / Phone", "Role", "Password", "Details", "Joined", "Actions"].map((h, i) => (
                      <th
                        key={h}
                        className={cn(
                          "px-4 py-3 text-[12px] font-semibold text-[#767676] uppercase tracking-wide text-left",
                          i === 5 && "text-right"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, idx) => {
                    const name = u.tenant?.fullName || (u.role === "MAIN_ADMIN" ? "Super Admin" : "Unknown");
                    const hasPassword = !!u.passwordSetAt;
                    const activeStay = u.tenant?.stays?.find((s) =>
                      ["ACTIVE", "EXTENDED", "APPROVED_AWAITING_PAYMENT"].includes(s.status)
                    ) || u.tenant?.stays?.[0];

                    return (
                      <tr
                        key={u.id}
                        onClick={() => router.push(`/admin/users/${u.id}`)}
                        className={cn(
                          "border-b border-[#f2f2f2] last:border-0 cursor-pointer group transition-colors hover:bg-[#fafafa]",
                          idx % 2 === 0 ? "bg-white" : "bg-white"
                        )}
                      >
                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="size-9 rounded-full bg-[#e0e0e0] dark:bg-zinc-700 flex items-center justify-center text-[12px] font-bold text-[#5c5c5c] shrink-0 overflow-hidden"
                              onClick={u.tenant?.photoUrl ? (e) => { e.stopPropagation(); setLightboxUrl(u.tenant!.photoUrl!); } : undefined}
                            >
                              {u.tenant?.photoUrl
                                ? <img src={u.tenant.photoUrl} alt={name} className="w-full h-full object-cover" />
                                : getInitials(name)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[14px] font-semibold text-black dark:text-white truncate">{name}</span>
                              <span className="text-[12px] font-mono text-[#767676]">{u.phone}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          <span className={cn("text-[12px] font-semibold px-2.5 py-1 rounded-full", ROLE_STYLE[u.role])}>
                            {ROLE_LABEL[u.role] ?? u.role}
                          </span>
                        </td>

                        {/* Password */}
                        <td className="px-4 py-3">
                          {hasPassword ? (
                            <div className="flex items-center gap-1.5 text-[#18b92b]">
                              <CheckCircle className="size-4" />
                              <span className="text-[13px] font-medium">Secure</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[#e1a918]">
                              <AlertCircle className="size-4" />
                              <span className="text-[13px] font-medium">Pending</span>
                            </div>
                          )}
                        </td>

                        {/* Details */}
                        <td className="px-4 py-3">
                          <div className="text-[13px] text-[#767676]">
                            {u.role === "WARDEN" && u.warden?.hostel?.name && (
                              <span>Hostel: {u.warden.hostel.name}</span>
                            )}
                            {u.role === "TENANT" && activeStay ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-black dark:text-white">{activeStay.hostel.name}</span>
                                {activeStay.bed
                                  ? <span>Room {activeStay.bed.room.roomNumber} · Bed {activeStay.bed.label}</span>
                                  : <span>{activeStay.status}</span>}
                              </div>
                            ) : u.role === "TENANT" ? (
                              <span className="text-[#a1a1a1]">No active stay</span>
                            ) : null}
                          </div>
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-[#767676]">{formatDate(u.createdAt)}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setResetModal({ id: u.id, phone: u.phone })}
                              className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[#dedede] text-[12px] font-semibold text-[#767676] hover:text-black hover:border-[#c0c0c0] transition-colors bg-white"
                            >
                              <Key className="size-3.5" /> Reset Pwd
                            </button>
                            <button
                              onClick={() => router.push(`/admin/users/${u.id}`)}
                              className="size-8 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:text-black hover:border-[#c0c0c0] transition-colors bg-white"
                            >
                              <Eye className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden flex flex-col gap-3">
            {filteredUsers.map((u) => {
              const name = u.tenant?.fullName || (u.role === "MAIN_ADMIN" ? "Super Admin" : "Unknown");
              const hasPassword = !!u.passwordSetAt;
              const activeStay = u.tenant?.stays?.find((s) =>
                ["ACTIVE", "EXTENDED", "APPROVED_AWAITING_PAYMENT"].includes(s.status)
              ) || u.tenant?.stays?.[0];

              return (
                <div
                  key={u.id}
                  onClick={() => router.push(`/admin/users/${u.id}`)}
                  className="rounded-[7px] border border-[#dedede] bg-white p-4 cursor-pointer hover:border-[#c0c0c0] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-full bg-[#e0e0e0] flex items-center justify-center text-[13px] font-bold text-[#5c5c5c] shrink-0 overflow-hidden">
                        {u.tenant?.photoUrl
                          ? <img src={u.tenant.photoUrl} alt={name} className="w-full h-full object-cover" />
                          : getInitials(name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-black truncate">{name}</p>
                        <p className="text-[12px] font-mono text-[#767676]">{u.phone}</p>
                      </div>
                    </div>
                    <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0", ROLE_STYLE[u.role])}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-[#767676]">
                    {hasPassword
                      ? <span className="flex items-center gap-1 text-[#18b92b]"><CheckCircle className="size-3.5" /> Secure</span>
                      : <span className="flex items-center gap-1 text-[#e1a918]"><AlertCircle className="size-3.5" /> Pending</span>}
                    <span>·</span>
                    <span>{formatDate(u.createdAt)}</span>
                    {activeStay && <><span>·</span><span>{activeStay.hostel.name}</span></>}
                  </div>

                  <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setResetModal({ id: u.id, phone: u.phone })}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[#dedede] text-[12px] font-semibold text-[#767676] hover:text-black transition-colors"
                    >
                      <Key className="size-3.5" /> Reset Pwd
                    </button>
                    <button
                      onClick={() => router.push(`/admin/users/${u.id}`)}
                      className="h-8 px-3 rounded-[6px] border border-[#dedede] text-[12px] font-semibold text-[#767676] hover:text-black transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="size-3.5" /> View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Results count */}
          <p className="text-[12px] text-[#a1a1a1] mt-3">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </>
      )}

      {/* ── Reset Password Modal ── */}
      {resetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => { if (!resetLoading) { setResetModal(null); setNewPassword(""); setCustomPassword(""); } }}
        >
          <div
            className="w-full max-w-md rounded-[10px] border border-[#dedede] bg-white shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-[18px] font-bold text-black">Reset Password</h2>
                <p className="text-[13px] text-[#767676] mt-0.5">
                  {newPassword ? "Password has been reset." : "Enter a custom password or leave blank to auto-generate."}
                </p>
              </div>
              <button
                onClick={() => { if (!resetLoading) { setResetModal(null); setNewPassword(""); setCustomPassword(""); } }}
                className="size-8 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:text-black transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {newPassword ? (
              <div className="space-y-4">
                <div className="rounded-[7px] border border-[#dedede] p-4 bg-[#fafafa]">
                  <p className="text-[12px] text-[#767676] mb-2">New Password</p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[20px] font-bold text-black tracking-widest">{newPassword}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(newPassword); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="size-8 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:text-black transition-colors"
                    >
                      {copied ? <Check className="size-4 text-[#18b92b]" /> : <Copy className="size-4" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { setResetModal(null); setNewPassword(""); setCustomPassword(""); }}
                  className="w-full h-10 rounded-[6px] bg-[#282828] text-white text-[14px] font-semibold hover:bg-black transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[7px] border border-[#dedede] p-3 bg-[#fafafa]">
                  <p className="text-[12px] text-[#767676]">User Phone</p>
                  <p className="font-mono text-[15px] font-bold text-black mt-0.5">{resetModal.phone}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-black">Custom Password <span className="text-[#a1a1a1] font-normal">(optional)</span></label>
                  <input
                    type="text"
                    placeholder="Leave blank for auto-generated"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-[6px] border border-[#dedede] text-[14px] text-black placeholder:text-[#a1a1a1] outline-none focus:border-[#282828] transition-colors"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setResetModal(null); setCustomPassword(""); }}
                    disabled={resetLoading}
                    className="flex-1 h-10 rounded-[6px] border border-[#dedede] text-[14px] font-semibold text-[#767676] hover:text-black transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                    className="flex-1 h-10 rounded-[6px] bg-[#e23030] text-white text-[14px] font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {resetLoading && <Loader2 className="size-4 animate-spin" />}
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Photo Lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-6 right-6 size-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="size-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Profile"
            className="max-w-full max-h-[90vh] object-contain rounded-[10px]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="rounded-[7px] border border-[#dedede] overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-[#f2f2f2] last:border-0 animate-pulse">
          <div className="size-9 rounded-full bg-[#f2f2f2] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-[#f2f2f2]" />
            <div className="h-3 w-24 rounded bg-[#f2f2f2]" />
          </div>
          <div className="h-6 w-16 rounded-full bg-[#f2f2f2]" />
          <div className="h-6 w-20 rounded bg-[#f2f2f2]" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyUsers() {
  return (
    <div className="mt-16 flex flex-col items-center justify-center gap-4 text-center">
      <div className="size-16 rounded-[10px] bg-[#5c5c5c] flex items-center justify-center">
        <User className="size-8 text-[#58ff48]" />
      </div>
      <div>
        <h3 className="text-[18px] font-bold text-black dark:text-white">No users found</h3>
        <p className="text-[14px] text-[#767676] mt-1">Try adjusting your filters or search query.</p>
      </div>
    </div>
  );
}
