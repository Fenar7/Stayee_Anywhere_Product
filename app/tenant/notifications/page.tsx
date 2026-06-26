"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, Check, Trash2, MailOpen, Mail } from "lucide-react";
import { notify } from "@/lib/toast";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  dismissedFromHome: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tenant/notifications");
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

  const handleMarkAsRead = async (id: string, readStatus: boolean) => {
    try {
      setActioningId(id);
      const res = await fetch(`/api/tenant/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: readStatus }),
      });
      if (!res.ok) throw new Error("Failed to update notification");
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: readStatus } : n))
      );
      notify.success(readStatus ? "Notification marked as read" : "Notification marked as unread");
    } catch (err: any) {
      notify.error(err.message || "Something went wrong");
    } finally {
      setActioningId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tenant/notifications", {
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

  const handleDismiss = async (id: string) => {
    try {
      setActioningId(id);
      const res = await fetch(`/api/tenant/notifications/${id}`, {
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

  if (loading && notifications.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm">
            Stay updated with your stay, meals, and payments.
          </p>
        </div>
        {notifications.some((n) => !n.read) && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="self-start sm:self-auto">
            <Check className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">No notifications</CardTitle>
          <CardDescription className="mt-2">
            You're all caught up! When you get new notifications, they'll show up here.
          </CardDescription>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => {
            const dateStr = new Date(notif.createdAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card
                key={notif.id}
                className={`transition-all duration-200 ${
                  notif.read ? "bg-card/60 opacity-80" : "bg-card border-l-4 border-l-primary"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base leading-tight">
                          {notif.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] py-0 px-2 font-semibold capitalize"
                        >
                          {notif.type.replace(/_/g, " ").toLowerCase()}
                        </Badge>
                        {!notif.read && (
                          <span className="h-2.5 w-2.5 rounded-full bg-primary" title="Unread" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-xs text-muted-foreground/80 block pt-1">
                        {dateStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={notif.read ? "Mark as unread" : "Mark as read"}
                        onClick={() => handleMarkAsRead(notif.id, !notif.read)}
                        disabled={actioningId === notif.id}
                      >
                        {notif.read ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <MailOpen className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        title="Dismiss"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDismiss(notif.id)}
                        disabled={actioningId === notif.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
