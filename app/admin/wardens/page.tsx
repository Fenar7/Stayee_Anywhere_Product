"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2, Shield, AlertCircle, Mail, Phone, Building2,
  Key, Pencil, X, CheckCircle, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { notify } from "@/lib/toast";

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

export default function WardensPage() {
  const [wardens, setWardens] = useState<WardenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Edit modal state
  const [editTarget, setEditTarget] = useState<WardenItem | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Reset password modal state
  const [resetTarget, setResetTarget] = useState<WardenItem | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  const fetchWardens = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/wardens");
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch wardens");
      }
      const data = await res.json();
      setWardens(data.wardens);
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWardens();
  }, []);

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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setResetSaving(false);
    }
  };

  const filteredWardens = wardens.filter(
    (w) =>
      w.hostel.name.toLowerCase().includes(search.toLowerCase()) ||
      w.phone.includes(search)
  );

  const accommodationTypeColors: Record<string, string> = {
    MENS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    WOMENS: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Warden Management</h1>
          <p className="text-muted-foreground">View and manage all hostel wardens</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search by hostel or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-64"
          />
          <Button variant="outline" size="sm" onClick={fetchWardens}>
            Refresh
          </Button>
        </div>
      </div>

      {filteredWardens.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-1">No Wardens Found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {search ? "No wardens match your search." : "No wardens have been created yet. Create a hostel with a warden or assign one from the dashboard."}
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/admin/hostels/new">
              <Button>Add Hostel</Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      )}

      {filteredWardens.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold">Hostel</th>
                  <th className="text-left px-4 py-3 font-semibold">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold">Email</th>
                  <th className="text-center px-4 py-3 font-semibold">Onboardings</th>
                  <th className="text-center px-4 py-3 font-semibold">Created</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredWardens.map((warden) => (
                  <tr key={warden.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <span className="font-medium">{warden.hostel.name}</span>
                          <span
                            className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              accommodationTypeColors[warden.hostel.accommodationType] || ""
                            }`}
                          >
                            {warden.hostel.accommodationType === "MENS" ? "M" : "W"}
                          </span>
                          {warden.hostel.location && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {warden.hostel.location.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{warden.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={warden.email ? "" : "text-muted-foreground italic"}>
                          {warden.email || "Not set"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{warden.totalOnboardings}</td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                      {new Date(warden.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditTarget(warden);
                            setEditEmail(warden.email || "");
                          }}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Edit email"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setResetTarget(warden);
                            setResetPassword("");
                          }}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Reset password"
                        >
                          <Key className="h-3.5 w-3.5" />
                          Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Email Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-sm w-full rounded-lg border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit Warden Email
              </h3>
              <button
                onClick={() => setEditTarget(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                {editTarget.hostel.name} &middot; {editTarget.phone}
              </p>
              <div>
                <label className="text-xs font-medium">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => { setEditEmail(e.target.value); }}
                  placeholder="warden@example.com"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <Button onClick={() => setEditTarget(null)} variant="outline" size="sm">
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={editSaving} size="sm">
                {editSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-sm w-full rounded-lg border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Key className="h-4 w-4" />
                Reset Password
              </h3>
              <button
                onClick={() => { setResetTarget(null); }}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                {resetTarget.hostel.name} &middot; {resetTarget.phone}
              </p>

                  <div>
                    <label className="text-xs font-medium">New Password</label>
                    <input
                      type="password"
                      value={resetPassword}
                      onChange={(e) => { setResetPassword(e.target.value); }}
                      placeholder="Minimum 8 characters"
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    The warden will need to log in with this new password.
                  </p>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
                  <Button
                    onClick={() => { setResetTarget(null); }}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleResetPassword}
                    disabled={resetSaving || resetPassword.length < 8}
                    size="sm"
                  >
                    {resetSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                    Reset Password
                  </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
