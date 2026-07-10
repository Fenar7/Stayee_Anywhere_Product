"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  Check,
  Trash2,
  MailOpen,
  Mail,
  Utensils,
  CreditCard,
  FileText,
  Calendar,
  Inbox,
  ChevronLeft,
  MessageSquare,
  ArrowRight,
  Loader2,
  ClipboardList
} from "lucide-react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  dismissedFromHome: boolean;
  createdAt: string;
  referenceId: string | null;
}

interface NotificationsPanelProps {
  role?: "TENANT" | "WARDEN" | "MAIN_ADMIN";
}

export function NotificationsPanel({ role = "TENANT" }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  
  // Modal state
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to load notifications");
      const json = await res.json();
      setNotifications(json.notifications || []);
    } catch (err: any) {
      notify.error(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string, readStatus: boolean, skipToast = false) => {
    try {
      setActioningId(id);
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: readStatus }),
      });
      if (!res.ok) throw new Error("Failed to update notification");
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: readStatus } : n))
      );
      if (!skipToast) {
        notify.success(readStatus ? "Marked as read" : "Marked as unread");
      }
    } catch (err: any) {
      if (!skipToast) notify.error(err.message || "Something went wrong");
    } finally {
      setActioningId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      if (!res.ok) throw new Error("Failed to update notifications");

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      notify.success("All notifications marked as read");
    } catch (err: any) {
      notify.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setActioningId(id);
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissedFromHome: true }),
      });
      if (!res.ok) throw new Error("Failed to dismiss notification");

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      notify.success("Notification dismissed");
    } catch (err: any) {
      notify.error(err.message || "Something went wrong");
    } finally {
      setActioningId(null);
    }
  };

  const handleOpenNotification = (notif: NotificationItem) => {
    setSelectedNotification(notif);
    setNoteText("");
    if (!notif.read) {
      handleMarkAsRead(notif.id, true, true);
    }
  };

  const handleAddNote = async () => {
    if (!selectedNotification?.referenceId || !noteText.trim()) return;
    
    try {
      setSubmittingNote(true);
      const res = await fetch(`/api/tickets/${selectedNotification.referenceId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: noteText }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add note");
      }
      
      notify.success("Note added successfully to the ticket");
      setNoteText("");
      setSelectedNotification(null); // Close modal on success
    } catch (err: any) {
      notify.error(err.message || "Something went wrong");
    } finally {
      setSubmittingNote(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("FOOD")) return <Utensils className="size-4" />;
    if (t.includes("PAY")) return <CreditCard className="size-4" />;
    if (t.includes("ONBOARD")) return <FileText className="size-4" />;
    if (t.includes("TICKET")) return <MessageSquare className="size-4" />;
    if (t.includes("TASK")) return <ClipboardList className="size-4" />;
    return <Bell className="size-4" />;
  };

  const getTicketLink = () => {
    if (!selectedNotification?.referenceId) return "#";
    if (role === "TENANT") return `/tenant/tickets`; // Adjust based on actual routing
    if (role === "WARDEN") return `/warden/tickets`;
    if (role === "MAIN_ADMIN") return `/admin/tickets`;
    return "#";
  };

  if (loading && notifications.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className={cn("w-full mx-auto", role === "TENANT" ? "max-w-2xl py-8 px-4 sm:px-6" : "p-4 sm:p-6 lg:p-8")}>
      
      {/* ── App-style Header for TENANT only ── */}
      {role === "TENANT" && (
        <div className="relative flex items-center justify-between mb-8">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 text-black hover:bg-gray-50 transition-colors shadow-sm z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h1 className="absolute inset-0 flex items-center justify-center text-[19px] font-bold tracking-tight text-gray-900 pointer-events-none">
            Notifications
          </h1>

          {notifications.some((n) => !n.read) ? (
            <button 
              onClick={handleMarkAllAsRead}
              title="Mark all as read"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 text-black hover:bg-gray-50 transition-colors shadow-sm z-10"
            >
              <Check className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-10 h-10" />
          )}
        </div>
      )}

      {/* ── Admin/Warden Header ── */}
      {role !== "TENANT" && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500 mt-1">Stay updated with the latest alerts across your properties.</p>
          </div>
          {notifications.some((n) => !n.read) && (
            <Button onClick={handleMarkAllAsRead} variant="outline" size="sm" className="bg-white">
              <Check className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>
      )}

      {/* ── Controls ── */}
      <div className="flex items-center mb-6">
        <Tabs defaultValue="all" onValueChange={(val) => setActiveTab(val as any)} className="w-full sm:w-auto">
          <TabsList className="bg-gray-100/80 p-1 rounded-xl w-full sm:w-auto grid grid-cols-2 sm:flex sm:h-10">
            <TabsTrigger value="all" className="rounded-lg text-[13px] font-semibold data-[state=active]:shadow-sm">
              All Alerts <span className="ml-1.5 opacity-50 font-normal">({notifications.length})</span>
            </TabsTrigger>
            <TabsTrigger value="unread" className="rounded-lg text-[13px] font-semibold data-[state=active]:shadow-sm">
              Unread <span className="ml-1.5 opacity-50 font-normal">({notifications.filter((n) => !n.read).length})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── List ── */}
      {filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-gray-200 rounded-[24px] bg-gray-50/50">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-gray-100 mb-5">
            <Inbox className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="text-[17px] font-semibold text-gray-900 tracking-tight">You are all caught up!</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">
            {activeTab === "unread" 
              ? "There are no unread notifications right now." 
              : "No notification alerts recorded yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3 relative">
          {/* Vertical timeline line for visual aesthetic */}
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-gray-100 hidden sm:block pointer-events-none" />

          {filteredNotifications.map((notif) => {
            const dateStr = new Date(notif.createdAt).toLocaleString("en-IN", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            });

            return (
              <div
                key={notif.id}
                onClick={() => handleOpenNotification(notif)}
                className={cn(
                  "group relative flex items-start gap-4 p-4 sm:p-5 rounded-[20px] transition-all duration-300 cursor-pointer border bg-white",
                  notif.read
                    ? "border-transparent hover:border-gray-200 hover:shadow-sm opacity-80 hover:opacity-100"
                    : "border-gray-200 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.02]"
                )}
              >
                {/* Status dot */}
                {!notif.read && (
                  <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-8 bg-blue-500 rounded-r-full" />
                )}

                {/* Icon Box */}
                <div className={cn(
                  "relative z-10 p-3 rounded-[14px] shrink-0 transition-colors duration-300",
                  notif.read ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-blue-600 ring-4 ring-white"
                )}>
                  {getNotificationIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center mt-0.5">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={cn(
                      "font-semibold text-[15px] truncate",
                      notif.read ? "text-gray-700" : "text-gray-900"
                    )}>
                      {notif.title}
                    </span>
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0 h-5 bg-gray-100/80 text-gray-600 border-none">
                      {notif.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-[14px] text-gray-500 line-clamp-1 leading-relaxed pr-8">
                    {notif.message}
                  </p>
                  <span className="text-[11px] text-gray-400 font-medium tracking-wide mt-2 flex items-center gap-1.5">
                    <Calendar className="size-3" />
                    {dateStr}
                  </span>
                </div>

                {/* Hover Actions */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full border border-gray-100 shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                    title={notif.read ? "Mark as unread" : "Mark as read"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notif.id, !notif.read);
                    }}
                  >
                    {notif.read ? <Mail className="size-3.5" /> : <MailOpen className="size-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    className="h-8 w-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500"
                    onClick={(e) => handleDismiss(notif.id, e)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Modal Overlay */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedNotification(null)}>
          <div 
            className="w-full max-w-[480px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-8 pb-6 bg-white">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
                  {getNotificationIcon(selectedNotification.type)}
                </div>
                <div className="pt-1">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
                    {selectedNotification.title}
                  </h2>
                  <p className="mt-1.5 text-sm font-medium text-gray-500">
                    {new Date(selectedNotification.createdAt).toLocaleString("en-IN", {
                      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 text-[15px] leading-relaxed text-gray-700 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                {selectedNotification.message}
              </div>

              {selectedNotification.type === "TICKET" && selectedNotification.referenceId && (
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Add a note to this ticket</h4>
                  <Textarea 
                    placeholder="Type your comment or update here..."
                    className="min-h-[100px] resize-none rounded-xl border-gray-200 focus-visible:ring-blue-500 text-sm"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
              <Button variant="ghost" className="rounded-xl text-gray-500 hover:text-gray-700" onClick={() => setSelectedNotification(null)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                {selectedNotification.type === "TICKET" && selectedNotification.referenceId && (
                  <>
                    <Button 
                      variant="outline" 
                      className="rounded-xl bg-white border-gray-200 shadow-sm"
                      onClick={() => {
                        setSelectedNotification(null);
                        router.push(getTicketLink());
                      }}
                    >
                      View Ticket
                    </Button>
                    <Button 
                      onClick={handleAddNote}
                      disabled={!noteText.trim() || submittingNote}
                      className="rounded-xl shadow-sm bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      {submittingNote ? <Loader2 className="size-4 animate-spin mr-2" /> : <MessageSquare className="size-4 mr-2" />}
                      Add Note
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
