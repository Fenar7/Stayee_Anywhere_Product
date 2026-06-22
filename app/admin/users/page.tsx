"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  Filter,
  User,
  Shield,
  Key,
  Mail,
  Phone,
  Calendar,
  Building,
  Bed,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Briefcase,
  GraduationCap,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";

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
    hostel: {
      id: string;
      name: string;
    } | null;
  } | null;
  tenant: {
    id: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    placeOfBirth: string;
    permanentAddress: string;
    emergencyContactName: string;
    relationship: string;
    emergencyContactNumber: string;
    parentGuardianName: string;
    parentGuardianContact: string;
    occupationType: "STUDENT" | "WORKING_PROFESSIONAL";
    collegeName: string | null;
    courseOrBranch: string | null;
    companyName: string | null;
    designation: string | null;
    purposeOfStay: string;
    photoUrl: string | null;
    stays: Array<{
      id: string;
      status: string;
      durationType: string;
      joiningDate: string;
      endDate: string;
      isNewAdmission: boolean;
      totalPayablePaise: number;
      hostel: {
        id: string;
        name: string;
      };
      bed: {
        id: string;
        label: string;
        room: {
          id: string;
          roomNumber: string;
        };
      };
    }>;
  } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Selection for profile inspect
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Reset password states
  const [resettingUser, setResettingUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showLightboxUrl, setShowLightboxUrl] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error("Failed to fetch users list");
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters");
      return;
    }

    setResetLoading(true);
    setResetError("");
    setResetSuccess(false);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: resettingUser.id,
          newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Reset password failed");
      }

      setResetSuccess(true);
      // Refresh local list to update passwordSetAt timestamp
      fetchUsers();
    } catch (err: any) {
      setResetError(err.message || "Reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  // Filter users based on query and role filter
  const filteredUsers = users.filter((u) => {
    // Role filter
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();

    const phoneMatch = u.phone.toLowerCase().includes(query);
    const emailMatch = u.email?.toLowerCase().includes(query);
    const fullNameMatch = u.tenant?.fullName.toLowerCase().includes(query);
    const hostelMatch =
      u.warden?.hostel?.name.toLowerCase().includes(query) ||
      u.tenant?.stays.some((s) => s.hostel.name.toLowerCase().includes(query));

    return phoneMatch || emailMatch || fullNameMatch || hostelMatch;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getUserDisplayName = (u: UserItem) => {
    if (u.role === "MAIN_ADMIN") return "Main Admin";
    if (u.role === "WARDEN") {
      return u.warden?.hostel ? `Warden: ${u.warden.hostel.name}` : "Warden Account";
    }
    if (u.role === "TENANT") {
      return u.tenant?.fullName || "Tenant (Profile Pending)";
    }
    return "User";
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive max-w-lg mx-auto mt-10 shadow-sm">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          User Management
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manage all credentials, search and view detailed profiles of Admins, Wardens, and Tenants.
        </p>
      </div>

      {/* FILTER PANEL */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, email, or hostel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 text-sm w-full rounded-lg border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-sm py-2 px-3 rounded-lg border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50 w-full md:w-48"
          >
            <option value="ALL">All Roles</option>
            <option value="MAIN_ADMIN">Admins</option>
            <option value="WARDEN">Wardens</option>
            <option value="TENANT">Tenants</option>
          </select>
        </div>
      </div>

      {/* USERS LIST TABLE */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/30 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                <th className="px-6 py-4">User Info / Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Current Assignment</th>
                <th className="px-6 py-4">Contact Details</th>
                <th className="px-6 py-4">Password Set</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => {
                      if (u.role === "TENANT") {
                        setSelectedUser(u);
                      }
                    }}
                    className={`hover:bg-muted/15 transition-colors ${
                      u.role === "TENANT" ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.tenant?.photoUrl ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowLightboxUrl(u.tenant?.photoUrl || null);
                            }}
                            className="h-9 w-9 rounded-lg overflow-hidden border bg-muted shadow-sm cursor-zoom-in shrink-0"
                            title="Click to view full screen"
                          >
                            <img src={u.tenant.photoUrl} alt="Thumbnail" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                            {u.tenant?.fullName ? u.tenant.fullName.charAt(0) : <User className="h-4.5 w-4.5" />}
                          </div>
                        )}
                        <div>
                          <p className="font-extrabold text-foreground text-sm">
                            {getUserDisplayName(u)}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === "MAIN_ADMIN" && (
                        <span className="inline-flex items-center gap-1 rounded bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-bold text-red-800 dark:text-red-400">
                          <Shield className="h-3 w-3" /> Admin
                        </span>
                      )}
                      {u.role === "WARDEN" && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-bold text-blue-800 dark:text-blue-400">
                          Warden
                        </span>
                      )}
                      {u.role === "TENANT" && (
                        <span className="inline-flex items-center gap-1 rounded bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-bold text-green-800 dark:text-green-400">
                          Tenant
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.role === "TENANT" && u.tenant?.stays ? (
                        (() => {
                          const activeStay = u.tenant.stays.find(
                            (s) => s.status === "ACTIVE" || s.status === "EXTENDED"
                          );
                          if (activeStay) {
                            return (
                              <div className="space-y-1">
                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                  <Building className="h-3.5 w-3.5 text-primary shrink-0" />
                                  {activeStay.hostel.name}
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <Bed className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  Room {activeStay.bed.room.roomNumber} &middot; Bed {activeStay.bed.label}
                                </span>
                              </div>
                            );
                          }
                          const pendingStay = u.tenant.stays.find(
                            (s) => s.status === "APPROVED_AWAITING_PAYMENT" || s.status === "ONBOARDING_PENDING"
                          );
                          if (pendingStay) {
                            return (
                              <div className="space-y-1">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                  <Building className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  {pendingStay.hostel.name}
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <Bed className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  Room {pendingStay.bed.room.roomNumber} &middot; Bed {pendingStay.bed.label}
                                </span>
                                <span className="inline-block text-[9px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.5 rounded border border-blue-200/50 uppercase tracking-wider">
                                  Pending
                                </span>
                              </div>
                            );
                          }
                          return <span className="text-xs text-muted-foreground">No stay history</span>;
                        })()
                      ) : u.role === "WARDEN" && u.warden?.hostel ? (
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                          <Building className="h-3.5 w-3.5 text-primary shrink-0" />
                          {u.warden.hostel.name}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">&mdash;</span>
                      )}
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <p className="flex items-center gap-1.5 text-xs font-medium">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {u.phone}
                      </p>
                      {u.email && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {u.email}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.plainTextPassword ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs bg-muted/60 dark:bg-muted/30 border px-2 py-1 rounded font-bold select-all">
                            {u.plainTextPassword}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(u.plainTextPassword || "");
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                            title="Copy Password"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : u.passwordSetAt ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold">
                          <CheckCircle className="h-4 w-4" /> Set ({formatDate(u.passwordSetAt)})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded border border-amber-200/50">
                          Not Configured
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {u.role === "TENANT" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(u);
                            }}
                            className="h-8 w-8 p-0"
                            title="View Full Profile"
                          >
                            <Eye className="h-4.5 w-4.5 text-primary" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResettingUser(u);
                            setNewPassword("");
                            setResetSuccess(false);
                            setResetError("");
                          }}
                          className="h-8 px-2 text-xs font-semibold hover:text-amber-600"
                        >
                          <Key className="h-3.5 w-3.5 mr-1" />
                          Password
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedUser && selectedUser.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-3xl w-full rounded-2xl border bg-card shadow-2xl overflow-hidden transform transition-all duration-300 max-h-[90vh] flex flex-col my-8">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="font-extrabold text-lg text-foreground">
                  Tenant Profile Inspect
                </h3>
                <p className="text-xs text-muted-foreground">
                  System ID: {selectedUser.tenant.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Photo & Basic Name */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b">
                {selectedUser.tenant.photoUrl ? (
                  <div
                    onClick={() => setShowLightboxUrl(selectedUser.tenant?.photoUrl || null)}
                    className="group/avatar relative h-20 w-20 rounded-xl overflow-hidden border-2 bg-muted shadow hover:shadow-md cursor-zoom-in transition-all duration-200"
                    title="Click to view full screen"
                  >
                    <img
                      src={selectedUser.tenant.photoUrl || undefined}
                      alt="Profile"
                      className="h-full w-full object-cover group-hover/avatar:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold">
                      View Full
                    </div>
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-extrabold border">
                    {selectedUser.tenant.fullName.charAt(0)}
                  </div>
                )}
                <div className="text-center sm:text-left space-y-1">
                  <h4 className="text-xl font-black">{selectedUser.tenant.fullName}</h4>
                  <p className="text-xs font-mono text-muted-foreground">
                    Phone: {selectedUser.phone} &middot; Email: {selectedUser.email || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Password: <span className="font-mono bg-muted/80 dark:bg-muted/30 px-1.5 py-0.5 rounded border text-foreground font-bold select-all">{selectedUser.plainTextPassword || "Set in Auth (Hashed)"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined NextHome System: {formatDate(selectedUser.createdAt)}
                  </p>
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider border-b pb-1">
                    Personal Information
                  </h4>
                  <div className="space-y-2">
                    <p>
                      <span className="text-muted-foreground">DOB:</span>{" "}
                      {formatDate(selectedUser.tenant.dateOfBirth)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Gender:</span> {selectedUser.tenant.gender}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Place of Birth:</span>{" "}
                      {selectedUser.tenant.placeOfBirth}
                    </p>
                    <p className="leading-relaxed">
                      <span className="text-muted-foreground">Permanent Address:</span>{" "}
                      {selectedUser.tenant.permanentAddress}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider border-b pb-1">
                    Emergency Contact &amp; Guardian
                  </h4>
                  <div className="space-y-2">
                    <p>
                      <span className="text-muted-foreground">Emergency Contact:</span>{" "}
                      {selectedUser.tenant.emergencyContactName} ({selectedUser.tenant.relationship})
                    </p>
                    <p>
                      <span className="text-muted-foreground">Contact Phone:</span>{" "}
                      {selectedUser.tenant.emergencyContactNumber}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Parent/Guardian:</span>{" "}
                      {selectedUser.tenant.parentGuardianName}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Parent Phone:</span>{" "}
                      {selectedUser.tenant.parentGuardianContact}
                    </p>
                  </div>
                </div>

                {/* Occupation details */}
                <div className="sm:col-span-2 space-y-3 border-t pt-4">
                  <h4 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    {selectedUser.tenant.occupationType === "STUDENT" ? (
                      <>
                        <GraduationCap className="h-4.5 w-4.5 text-primary" /> Academic Profile
                      </>
                    ) : (
                      <>
                        <Briefcase className="h-4.5 w-4.5 text-primary" /> Professional Profile
                      </>
                    )}
                  </h4>
                  {selectedUser.tenant.occupationType === "STUDENT" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">College:</span>{" "}
                        {selectedUser.tenant.collegeName}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Course/Branch:</span>{" "}
                        {selectedUser.tenant.courseOrBranch}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">Company:</span>{" "}
                        {selectedUser.tenant.companyName}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Designation:</span>{" "}
                        {selectedUser.tenant.designation}
                      </p>
                    </div>
                  )}
                  <p className="mt-2 text-xs">
                    <span className="text-muted-foreground font-semibold">Purpose of Stay:</span>{" "}
                    {selectedUser.tenant.purposeOfStay}
                  </p>
                </div>
              </div>

              {/* Stays History */}
              <div className="space-y-4 border-t pt-5">
                <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wider">
                  Stay Booking Logs &amp; Status
                </h4>
                {selectedUser.tenant.stays.length === 0 ? (
                  <p className="text-xs text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                    No stays booked under this tenant.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedUser.tenant.stays.map((stay) => (
                      <div
                        key={stay.id}
                        className="rounded-xl border p-4 bg-muted/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-extrabold text-sm text-foreground">
                              {stay.hostel.name}
                            </span>
                          </div>
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <Bed className="h-3.5 w-3.5" />
                            Room {stay.bed.room.roomNumber} &mdash; Bed {stay.bed.label} &middot;{" "}
                            {stay.durationType} duration
                          </p>
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            Term: {formatDate(stay.joiningDate)} to {formatDate(stay.endDate)}
                          </p>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2">
                          <span
                            className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              stay.status === "ACTIVE" || stay.status === "EXTENDED"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : stay.status === "ONBOARDING_PENDING"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : stay.status === "APPROVED_AWAITING_PAYMENT"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {stay.status}
                          </span>
                          <span className="font-bold text-foreground">
                            Total: ₹ {(stay.totalPayablePaise / 100).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t px-6 py-4 bg-muted/20">
              <Button onClick={() => setSelectedUser(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border bg-card shadow-2xl overflow-hidden transform scale-100 transition-all duration-200">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="font-extrabold text-sm flex items-center gap-2.5">
                <Key className="h-4.5 w-4.5 text-amber-500" />
                Change Password
              </h3>
              <button
                onClick={() => {
                  setResettingUser(null);
                  setNewPassword("");
                  setResetSuccess(false);
                }}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div className="text-xs bg-muted/55 p-3 rounded-lg space-y-1">
                <p>
                  Target User:{" "}
                  <span className="font-bold text-foreground">{getUserDisplayName(resettingUser)}</span>
                </p>
                <p className="font-mono text-muted-foreground">Phone: {resettingUser.phone}</p>
                {resettingUser.email && (
                  <p className="font-mono text-muted-foreground">Email: {resettingUser.email}</p>
                )}
              </div>

              {resetError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:bg-red-900/20 dark:text-red-200">
                  {resetError}
                </div>
              )}

              {resetSuccess ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                    <p className="text-xs font-semibold text-green-700 mb-2">
                      Password Updated Successfully!
                    </p>
                    <p className="text-xl font-bold font-mono tracking-wider text-green-900 select-all p-3 border rounded bg-white dark:bg-background">
                      {newPassword}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Provide the password displayed above to the user so they can log in. Keep it confidential.
                  </p>
                  <Button
                    type="button"
                    onClick={() => copyToClipboard(newPassword)}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 border-green-300 text-green-800 font-semibold"
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="h-4 w-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy New Password
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">New Password</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="flex h-9 w-full rounded-lg border bg-transparent pl-3 pr-10 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="absolute right-2 top-1.5 p-1 rounded hover:bg-muted text-primary"
                        title="Generate Password"
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end border-t pt-4 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setResettingUser(null);
                        setNewPassword("");
                        setResetSuccess(false);
                      }}
                      disabled={resetLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={resetLoading || newPassword.length < 8}>
                      {resetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Update Credentials
                    </Button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {showLightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={() => setShowLightboxUrl(null)}
        >
          <button
            onClick={() => setShowLightboxUrl(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 rounded-full p-2 bg-black/40 hover:bg-black/60 transition-colors"
          >
            <XCircle className="h-6 w-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-xl bg-muted shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={showLightboxUrl}
              alt="Fullscreen Profile"
              className="max-h-[85vh] max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
