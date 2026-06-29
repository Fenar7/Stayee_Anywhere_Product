"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  User,
  Shield,
  Key,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Eye,
  X,
  Check,
  Copy,
  Briefcase,
} from "lucide-react";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Basic debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

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
    stays: { 
      hostel: { name: string };
      status: string;
      bed?: {
        label: string;
        room: { roomNumber: string };
      } | null;
    }[];
  } | null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");



  const [resetModal, setResetModal] = useState<{ id: string; phone: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const [showLightboxUrl, setShowLightboxUrl] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err);
      notify.error(errorMsg || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
      fetchUsers(); // refresh list to show plainTextPassword if any
      notify.success("Password reset successfully");
    } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err);
      notify.error(errorMsg || "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (debouncedQuery) {
        const q = debouncedQuery.toLowerCase();
        const phoneMatch = u.phone.includes(q);
        const nameMatch = u.tenant?.fullName?.toLowerCase().includes(q);
        const emailMatch = u.email?.toLowerCase().includes(q);
        if (!phoneMatch && !nameMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [users, roleFilter, debouncedQuery]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "MAIN_ADMIN":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Admin</Badge>;
      case "WARDEN":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Warden</Badge>;
      case "TENANT":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Tenant</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="User Management"
        description="View and manage all users across the platform."
      />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={roleFilter} onValueChange={setRoleFilter} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="ALL">All Users</TabsTrigger>
              <TabsTrigger value="TENANT">Tenants</TabsTrigger>
              <TabsTrigger value="WARDEN">Wardens</TabsTrigger>
              <TabsTrigger value="MAIN_ADMIN">Admins</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search phone, name..."
              className="pl-9 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={User}
            title="No users found"
            description="Try adjusting your filters or search query."
          />
        ) : (
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User / Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Password Setup</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const name = u.tenant?.fullName || (u.role === 'MAIN_ADMIN' ? 'Super Admin' : 'Unknown');
                    const hasPassword = !!u.passwordSetAt;
                    return (
                      <TableRow 
                        key={u.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/admin/users/${u.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              {u.tenant?.photoUrl ? (
                                <AvatarImage src={u.tenant.photoUrl} alt="Photo" className="object-cover" />
                              ) : null}
                              <AvatarFallback>{getInitials(name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{name}</span>
                              <span className="text-xs font-mono text-muted-foreground">{u.phone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                        <TableCell>
                          {hasPassword ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                              <CheckCircle className="h-3.5 w-3.5" /> Secure
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                              <AlertCircle className="h-3.5 w-3.5" /> Pending
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {u.role === "WARDEN" && u.warden?.hostel?.name && (
                              <span>Hostel: {u.warden.hostel.name}</span>
                            )}
                            {u.role === "TENANT" && u.tenant && (() => {
                              const activeStay = u.tenant.stays?.find(s => ['ACTIVE', 'EXTENDED', 'APPROVED_AWAITING_PAYMENT'].includes(s.status)) || u.tenant.stays?.[0];
                              
                              if (activeStay) {
                                return (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-semibold text-foreground">{activeStay.hostel.name}</span>
                                    {activeStay.bed ? (
                                      <span>Room {activeStay.bed.room.roomNumber} &middot; Bed {activeStay.bed.label}</span>
                                    ) : (
                                      <span>{activeStay.status}</span>
                                    )}
                                  </div>
                                );
                              }
                              return <span>No properties</span>;
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(u.createdAt)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setResetModal({ id: u.id, phone: u.phone })}
                            >
                              <Key className="h-4 w-4 mr-1" /> Reset Pwd
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/users/${u.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!resetModal} onOpenChange={() => {
        if (!resetLoading) {
          setResetModal(null);
          setNewPassword("");
          setCustomPassword("");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              You can optionally enter a custom password below. If left blank, a secure random password will be generated automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {newPassword ? (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <span className="font-medium text-muted-foreground">New Password:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold tracking-widest bg-background px-2 py-1 rounded border">
                    {newPassword}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <p className="text-sm">User Phone: <span className="font-mono font-bold">{resetModal?.phone}</span></p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Custom Password (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank for auto-generated password"
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            {newPassword ? (
              <Button onClick={() => {
                setResetModal(null);
                setNewPassword("");
                setCustomPassword("");
              }}>Done</Button>
            ) : (
              <>
                <AlertDialogCancel disabled={resetLoading}>Cancel</AlertDialogCancel>
                <Button 
                  onClick={handleResetPassword} 
                  disabled={resetLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {resetLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirm Reset
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      {/* Lightbox Modal */}
      {showLightboxUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowLightboxUrl(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white"
            onClick={() => setShowLightboxUrl(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img 
            src={showLightboxUrl} 
            alt="Profile Full Size" 
            className="max-w-full max-h-[90vh] object-contain rounded-md"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}
