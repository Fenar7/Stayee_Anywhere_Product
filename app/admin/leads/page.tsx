"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { notify } from "@/lib/toast";
import { 
  X, Loader2, FileText, MessageCircle, ChevronDown, Check,
  UserPlus, PhoneCall, RefreshCw, CheckCircle, Ban
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LeadNote {
  note: string;
  createdAt: string;
  author: { id: string; phone: string };
}

interface Lead {
  id: string;
  phone: string;
  source: string;
  status: string;
  notes: LeadNote[];
  createdAt: string;
  hostelId: string | null;
  hostelName?: string;
}

interface Hostel {
  id: string;
  name: string;
}

type FilterTab = "ALL" | "NEW" | "CONTACTED" | "FOLLOW_UP" | "CONVERTED" | "DROPPED";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow Up",
  CONVERTED: "Converted",
  DROPPED: "Dropped",
};

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-[#dbeafe] text-[#1e40af]", // blue
  CONTACTED: "bg-[#f3e8ff] text-[#7e22ce]", // purple
  FOLLOW_UP: "bg-[#fefce8] text-[#ca8a04]", // yellow
  CONVERTED: "bg-[#dcfce7] text-[#15803d]", // green
  DROPPED: "bg-[#f2f2f2] text-[#767676]", // gray
};

const STATUS_ICONS: Record<string, any> = {
  NEW: UserPlus,
  CONTACTED: PhoneCall,
  FOLLOW_UP: RefreshCw,
  CONVERTED: CheckCircle,
  DROPPED: Ban,
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHostelId, setSelectedHostelId] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Detail modal state
  const [detailNote, setDetailNote] = useState("");
  const [detailStatus, setDetailStatus] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

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
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Failed to fetch leads");
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
    } catch (err) {
      console.error("Failed to fetch hostels:", err);
    }
  }, []);

  useEffect(() => {
    fetchHostels();
    fetchLeads();
  }, [fetchHostels, fetchLeads]);

  const handleUpdateLead = async () => {
    if (!selectedLead) return;
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/warden/leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: detailStatus,
          note: detailNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update lead");
      }
      notify.success("Lead updated successfully");
      setShowDetailModal(false);
      fetchLeads();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Error updating lead");
    } finally {
      setDetailLoading(false);
    }
  };

  const openLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailStatus(lead.status);
    setDetailNote("");
    setShowDetailModal(true);
  };

  // ─── Filters ───
  const newLeads = useMemo(() => leads.filter((l) => l.status === "NEW"), [leads]);
  const contactedLeads = useMemo(() => leads.filter((l) => l.status === "CONTACTED"), [leads]);
  const followUpLeads = useMemo(() => leads.filter((l) => l.status === "FOLLOW_UP"), [leads]);
  const convertedLeads = useMemo(() => leads.filter((l) => l.status === "CONVERTED"), [leads]);
  const droppedLeads = useMemo(() => leads.filter((l) => l.status === "DROPPED"), [leads]);

  const filteredItems = useMemo(() => {
    switch (activeTab) {
      case "NEW": return newLeads;
      case "CONTACTED": return contactedLeads;
      case "FOLLOW_UP": return followUpLeads;
      case "CONVERTED": return convertedLeads;
      case "DROPPED": return droppedLeads;
      default: return leads;
    }
  }, [activeTab, leads, newLeads, contactedLeads, followUpLeads, convertedLeads, droppedLeads]);

  const TABS: { id: FilterTab; label: string; count: number }[] = [
    { id: "ALL", label: "All Leads", count: leads.length },
    { id: "NEW", label: "New", count: newLeads.length },
    { id: "CONTACTED", label: "Contacted", count: contactedLeads.length },
    { id: "FOLLOW_UP", label: "Follow Up", count: followUpLeads.length },
    { id: "CONVERTED", label: "Converted", count: convertedLeads.length },
    { id: "DROPPED", label: "Dropped", count: droppedLeads.length },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 py-5 w-full max-w-[1400px] mx-auto bg-white dark:bg-black min-h-screen">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#dedede]">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-black dark:text-white">Portfolio Leads</h1>
          <p className="text-[#767676] text-[14px] mt-0.5">Track and manage prospective tenants across all properties.</p>
        </div>
        
        {/* Hostel Selector */}
        <div className="relative self-start w-full sm:w-[220px]">
          <select
            value={selectedHostelId}
            onChange={(e) => setSelectedHostelId(e.target.value)}
            className="w-full h-10 pl-3 pr-9 appearance-none bg-white border border-[#dedede] rounded-[6px] text-[13px] font-semibold text-black focus:outline-none focus:border-[#282828] transition-colors"
          >
            <option value="ALL">All Hostels</option>
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#767676] pointer-events-none" />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="py-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "h-9 px-4 rounded-[6px] text-[13px] font-semibold transition-all flex items-center gap-2 whitespace-nowrap",
                activeTab === t.id
                  ? "bg-[#282828] text-white"
                  : "border border-[#dedede] text-[#767676] hover:text-black hover:border-[#c0c0c0] bg-white"
              )}
            >
              {t.label}
              <span className={cn(
                "text-[11px] px-1.5 py-0.5 rounded-full",
                activeTab === t.id ? "bg-white/20 text-white" : "bg-[#f2f2f2] text-[#767676]"
              )}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredItems.length === 0 ? (
        <EmptyLeads tab={activeTab} />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-[7px] border border-[#dedede] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-[#f2f2f2] bg-[#fafafa]">
                    {["Phone / Contact", "Hostel", "Status", "Source", "Latest Note", "Created"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[12px] font-semibold text-[#767676] uppercase tracking-wide text-left"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((lead) => {
                    const latestNote = lead.notes[0]?.note || "No notes";
                    const StatusIcon = STATUS_ICONS[lead.status] || UserPlus;
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => openLeadDetails(lead)}
                        className="border-b border-[#f2f2f2] last:border-0 bg-white hover:bg-[#fafafa] transition-colors cursor-pointer group"
                      >
                        {/* Phone */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[14px] font-semibold text-black dark:text-white">{lead.phone}</span>
                            <a
                              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="size-7 rounded-[4px] bg-[#dcfce7] text-[#15803d] hover:bg-[#bbf7d0] transition-colors flex items-center justify-center"
                              title="WhatsApp"
                            >
                              <MessageCircle className="size-4" />
                            </a>
                          </div>
                        </td>

                        {/* Hostel */}
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] font-medium text-black dark:text-white">
                            {lead.hostelName || "None"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full",
                            STATUS_STYLES[lead.status] || "bg-[#f2f2f2] text-[#767676]"
                          )}>
                            <StatusIcon className="size-3" />
                            {STATUS_LABELS[lead.status] || lead.status}
                          </span>
                        </td>

                        {/* Source */}
                        <td className="px-4 py-3.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f2f2f2] text-[#5c5c5c] uppercase tracking-wider">
                            {lead.source.replace("_", " ")}
                          </span>
                        </td>

                        {/* Note */}
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] text-[#767676] line-clamp-1 max-w-[200px]">
                            {latestNote}
                          </span>
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] text-[#767676]">
                            {formatDate(lead.createdAt)}
                          </span>
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
            {filteredItems.map((lead) => {
              const latestNote = lead.notes[0]?.note || "No notes";
              const StatusIcon = STATUS_ICONS[lead.status] || UserPlus;

              return (
                <div
                  key={lead.id}
                  onClick={() => openLeadDetails(lead)}
                  className="rounded-[7px] border border-[#dedede] bg-white p-4 cursor-pointer hover:border-[#c0c0c0] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[16px] font-bold text-black">{lead.phone}</span>
                      <a
                        href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="size-7 rounded-[4px] bg-[#dcfce7] text-[#15803d] hover:bg-[#bbf7d0] transition-colors flex items-center justify-center"
                      >
                        <MessageCircle className="size-4" />
                      </a>
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full shrink-0",
                      STATUS_STYLES[lead.status] || "bg-[#f2f2f2] text-[#767676]"
                    )}>
                      <StatusIcon className="size-3" />
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-3 text-[13px] text-[#767676]">
                    <p className="flex justify-between">
                      <span>Hostel:</span>
                      <span className="font-semibold text-black">{lead.hostelName || "None"}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Source:</span>
                      <span className="uppercase">{lead.source.replace("_", " ")}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Created:</span>
                      <span>{formatDate(lead.createdAt)}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#f2f2f2]">
                    <p className="text-[12px] font-semibold text-black mb-1">Latest Note:</p>
                    <p className="text-[13px] text-[#767676] line-clamp-2">{latestNote}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          <p className="text-[12px] text-[#a1a1a1] mt-3">
            Showing {filteredItems.length} leads
          </p>
        </>
      )}

      {/* ── Detail Modal ── */}
      {showDetailModal && selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => { if (!detailLoading) setShowDetailModal(false); }}
        >
          <div
            className="w-full max-w-3xl rounded-[10px] border border-[#dedede] bg-white shadow-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-[#f2f2f2]">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-mono text-[20px] font-bold text-black">{selectedLead.phone}</h3>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full",
                    STATUS_STYLES[selectedLead.status] || "bg-[#f2f2f2] text-[#767676]"
                  )}>
                    {STATUS_LABELS[selectedLead.status] || selectedLead.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[13px] text-[#767676]">
                  <span>Added {formatDate(selectedLead.createdAt)}</span>
                  <span className="w-1 h-1 rounded-full bg-[#dedede]" />
                  <span className="uppercase text-[11px] font-bold tracking-wider">Hostel: {selectedLead.hostelName || "None"}</span>
                </div>
              </div>
              <button
                onClick={() => { if (!detailLoading) setShowDetailModal(false); }}
                className="size-8 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:text-black transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Left Column: Update form */}
              <div className="md:col-span-2 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-black">Update Status</label>
                  <div className="relative">
                    <select
                      value={detailStatus}
                      onChange={(e) => setDetailStatus(e.target.value)}
                      className="w-full h-10 pl-3 pr-9 appearance-none bg-white border border-[#dedede] rounded-[6px] text-[14px] text-black focus:outline-none focus:border-[#282828] transition-colors"
                    >
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="FOLLOW_UP">Follow Up</option>
                      <option value="CONVERTED">Converted</option>
                      <option value="DROPPED">Dropped</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#767676] pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-black">Add Note</label>
                  <textarea
                    placeholder="Had a call regarding..."
                    rows={4}
                    value={detailNote}
                    onChange={(e) => setDetailNote(e.target.value)}
                    className="w-full p-3 bg-white border border-[#dedede] rounded-[6px] text-[14px] text-black placeholder:text-[#a1a1a1] focus:outline-none focus:border-[#282828] transition-colors resize-none"
                  />
                </div>

                <button
                  onClick={handleUpdateLead}
                  disabled={detailLoading}
                  className="w-full h-10 rounded-[6px] bg-[#282828] text-white text-[14px] font-semibold hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {detailLoading && <Loader2 className="size-4 animate-spin" />}
                  Save Update
                </button>
              </div>
              
              {/* Right Column: Activity */}
              <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-[#f2f2f2] md:pl-6 pt-5 md:pt-0">
                <h4 className="text-[12px] font-bold text-[#a1a1a1] uppercase tracking-wider mb-4">Activity History</h4>
                {selectedLead.notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <FileText className="size-8 text-[#dedede] mb-2" />
                    <p className="text-[13px] text-[#a1a1a1]">No history available.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedLead.notes.map((n, idx) => (
                      <div key={idx} className="bg-[#fafafa] p-3.5 rounded-[7px] border border-[#f2f2f2]">
                        <p className="text-[13px] text-black leading-relaxed mb-2 whitespace-pre-wrap">{n.note}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f2f2f2] text-[11px] text-[#a1a1a1]">
                          <span className="font-mono font-medium">Added by: {n.author.phone}</span>
                          <span>{formatDate(n.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
    <div className="rounded-[7px] border border-[#dedede] overflow-hidden mt-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-[#f2f2f2] last:border-0 animate-pulse">
          <div className="h-4 w-32 rounded bg-[#f2f2f2]" />
          <div className="h-4 w-24 rounded bg-[#f2f2f2]" />
          <div className="h-6 w-20 rounded-full bg-[#f2f2f2]" />
          <div className="h-6 w-16 rounded bg-[#f2f2f2]" />
          <div className="flex-1 h-4 rounded bg-[#f2f2f2]" />
          <div className="h-4 w-24 rounded bg-[#f2f2f2]" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyLeads({ tab }: { tab: FilterTab }) {
  const getMessage = () => {
    switch (tab) {
      case "NEW": return "No new leads.";
      case "CONTACTED": return "No contacted leads.";
      case "FOLLOW_UP": return "No leads require follow-up.";
      case "CONVERTED": return "No leads converted yet.";
      case "DROPPED": return "No dropped leads.";
      default: return "No leads have been captured yet.";
    }
  };

  return (
    <div className="mt-16 flex flex-col items-center justify-center gap-4 text-center">
      <div className="size-16 rounded-[10px] bg-[#5c5c5c] flex items-center justify-center">
        <FileText className="size-8 text-[#58ff48]" />
      </div>
      <div>
        <h3 className="text-[18px] font-bold text-black dark:text-white">No Leads Found</h3>
        <p className="text-[14px] text-[#767676] mt-1">{getMessage()}</p>
      </div>
    </div>
  );
}
