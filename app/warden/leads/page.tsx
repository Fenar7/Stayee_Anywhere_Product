"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Lead {
  id: string;
  phone: string;
  source: string;
  status: string;
  notes: string | null;
  createdAt: string;
  hostelId: string | null;
}

type StatusFilter = "ALL" | "NEW" | "CONTACTED" | "FOLLOW_UP" | "CONVERTED" | "DROPPED";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CONTACTED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  FOLLOW_UP: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  CONVERTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  DROPPED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const SOURCE_COLORS: Record<string, string> = {
  WHATSAPP_BOT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  MANUAL: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow-up",
  CONVERTED: "Converted",
  DROPPED: "Dropped",
};

export default function WardenLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("ALL");
  const [showLogModal, setShowLogModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Log Enquiry form state
  const [logPhone, setLogPhone] = useState("");
  const [logSource, setLogSource] = useState("MANUAL");
  const [logNotes, setLogNotes] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState("");

  // Detail modal state
  const [detailNote, setDetailNote] = useState("");
  const [detailStatus, setDetailStatus] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/warden/leads");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch leads");
      }
      const data = await res.json();
      setLeads(data.leads);
    } catch (err: any) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads =
    activeFilter === "ALL"
      ? leads
      : leads.filter((l) => l.status === activeFilter);

  const handleLogEnquiry = async () => {
    if (!logPhone.trim()) {
      setLogError("Phone number is required");
      return;
    }
    setLogLoading(true);
    setLogError("");
    try {
      const res = await fetch("/api/warden/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: logPhone,
          source: logSource,
          notes: logNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create lead");
      }
      setShowLogModal(false);
      setLogPhone("");
      setLogSource("MANUAL");
      setLogNotes("");
      await fetchLeads();
    } catch (err: any) {
      setLogError(err.message);
    } finally {
      setLogLoading(false);
    }
  };

  const openDetailModal = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailStatus(lead.status);
    setDetailNote("");
    setDetailError("");
    setShowDetailModal(true);
  };

  const handleUpdateLead = async () => {
    if (!selectedLead) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const body: any = {};
      if (detailStatus !== selectedLead.status) {
        body.status = detailStatus;
      }
      if (detailNote.trim()) {
        body.note = detailNote.trim();
      }
      if (Object.keys(body).length === 0) {
        setShowDetailModal(false);
        return;
      }
      const res = await fetch(`/api/warden/leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update lead");
      }
      setShowDetailModal(false);
      await fetchLeads();
    } catch (err: any) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const parseNotes = (notes: string | null): Array<{ text: string; createdAt: string; author: string }> => {
    if (!notes) return [];
    try {
      const parsed = JSON.parse(notes);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      if (notes.trim().length > 0) {
        return [{ text: notes, createdAt: "", author: "Unknown" }];
      }
      return [];
    }
  };

  const formatISTDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Management</h1>
          <p className="text-muted-foreground">Manage prospect enquiries and leads</p>
        </div>
        <Button onClick={() => setShowLogModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Enquiry
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", "NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "DROPPED"] as StatusFilter[]).map(
          (filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeFilter === filter
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {filter === "ALL" ? "All" : STATUS_LABELS[filter]}
              <span className="ml-1">
                ({filter === "ALL" ? leads.length : leads.filter((l) => l.status === filter).length})
              </span>
            </button>
          )
        )}
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {leads.length === 0
            ? "No leads yet. Click 'Log Enquiry' to add one."
            : "No leads match the selected filter."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => {
            const parsedNotes = parseNotes(lead.notes);
            const initialNote = parsedNotes.length > 0 ? parsedNotes[0].text : null;

            return (
              <div
                key={lead.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium font-mono">{lead.phone}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[lead.source] || ""}`}
                    >
                      {lead.source === "WHATSAPP_BOT" ? "WhatsApp Bot" : "Manual"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status] || ""}`}
                    >
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Logged: {formatISTDate(lead.createdAt)}
                  </p>
                  {initialNote && (
                    <p className="max-w-md truncate text-xs text-muted-foreground">
                      Note: {initialNote}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openDetailModal(lead)}>
                    View Details
                  </Button>
                  {lead.status !== "CONVERTED" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/warden/onboard?phone=${encodeURIComponent(lead.phone)}`
                        )
                      }
                    >
                      Convert to Stay
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Enquiry Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Log Enquiry</h2>
              <button onClick={() => setShowLogModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {logError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {logError}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <input
                type="tel"
                placeholder="+91XXXXXXXXXX"
                value={logPhone}
                onChange={(e) => setLogPhone(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source</label>
              <select
                value={logSource}
                onChange={(e) => setLogSource(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="MANUAL">Manual</option>
                <option value="WHATSAPP_BOT">WhatsApp Bot</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Notes (Optional)</label>
              <textarea
                rows={3}
                placeholder="Any initial notes about this enquiry..."
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLogModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleLogEnquiry} disabled={logLoading}>
                {logLoading ? "Saving..." : "Save Enquiry"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Lead Details</h2>
              <button onClick={() => setShowDetailModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{selectedLead.phone}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[selectedLead.source] || ""}`}
                >
                  {selectedLead.source === "WHATSAPP_BOT" ? "WhatsApp Bot" : "Manual"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Logged: {formatISTDate(selectedLead.createdAt)}
              </p>
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Notes Thread</h3>
              {parseNotes(selectedLead.notes).length === 0 ? (
                <p className="text-xs text-muted-foreground">No notes yet.</p>
              ) : (
                <div className="space-y-2">
                  {parseNotes(selectedLead.notes).map((entry, i) => (
                    <div key={i} className="rounded-md border p-3 text-sm">
                      <p>{entry.text}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                          {entry.author}
                        </span>
                        {entry.createdAt && <span>{formatISTDate(entry.createdAt)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Update Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Update Status</label>
              <select
                value={detailStatus}
                onChange={(e) => setDetailStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Add Note */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add Note</label>
              <textarea
                rows={2}
                placeholder="Type a new note..."
                value={detailNote}
                onChange={(e) => setDetailNote(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {detailError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {detailError}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateLead} disabled={detailLoading}>
                {detailLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
