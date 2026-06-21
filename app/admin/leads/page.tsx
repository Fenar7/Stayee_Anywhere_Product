"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Lead {
  id: string;
  phone: string;
  source: string;
  status: string;
  notes: string | null;
  createdAt: string;
  hostelId: string | null;
  hostelName?: string;
}

interface Hostel {
  id: string;
  name: string;
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

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("ALL");
  const [selectedHostelId, setSelectedHostelId] = useState<string>("ALL");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailNote, setDetailNote] = useState("");
  const [detailStatus, setDetailStatus] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      let url = "/api/warden/leads";
      if (selectedHostelId !== "ALL") {
        url += `?hostelId=${selectedHostelId}`;
      }
      const res = await fetch(url);
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
  }, [selectedHostelId]);

  const fetchHostels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/hostels");
      if (res.ok) {
        const data = await res.json();
        setHostels(data.hostels || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch hostels:", err);
    }
  }, []);

  useEffect(() => {
    fetchHostels();
  }, [fetchHostels]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads =
    activeFilter === "ALL"
      ? leads
      : leads.filter((l) => l.status === activeFilter);

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

  const getHostelName = (hostelId: string | null): string => {
    if (!hostelId) return "Unassigned / Routing Pending";
    const hostel = hostels.find((h) => h.id === hostelId);
    return hostel?.name || "Unknown Hostel";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Leads</h1>
        <p className="text-muted-foreground">Cross-hostel lead management dashboard</p>
      </div>

      {/* Hostel Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Filter by Hostel</label>
        <select
          value={selectedHostelId}
          onChange={(e) => setSelectedHostelId(e.target.value)}
          className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="ALL">All Hostels</option>
          <option value="null">Unassigned / Routing Pending</option>
          {hostels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
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

      {/* Leads Table */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {leads.length === 0 ? "No leads in the system." : "No leads match the selected filter."}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Hostel</th>
                <th className="px-4 py-3 text-left font-medium">Date Logged</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono">{lead.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[lead.source] || ""}`}
                    >
                      {lead.source === "WHATSAPP_BOT" ? "WhatsApp Bot" : "Manual"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status] || ""}`}
                    >
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {getHostelName(lead.hostelId)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatISTDate(lead.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => openDetailModal(lead)}>
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                Hostel: {getHostelName(selectedLead.hostelId)}
              </p>
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
