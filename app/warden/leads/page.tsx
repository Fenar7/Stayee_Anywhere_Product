"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Plus, X, Loader2, FileText, MessageCircle } from "lucide-react";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LEAD_SOURCE_COLORS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";

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
}

type StatusFilter = "ALL" | "NEW" | "CONTACTED" | "FOLLOW_UP" | "CONVERTED" | "DROPPED";

export default function WardenLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Log Enquiry form state
  const [logPhone, setLogPhone] = useState("");
  const [logSource, setLogSource] = useState("MANUAL");
  const [logNotes, setLogNotes] = useState("");
  const [logLoading, setLogLoading] = useState(false);

  // Detail modal state
  const [detailNote, setDetailNote] = useState("");
  const [detailStatus, setDetailStatus] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

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
    } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err);
      notify.error(errorMsg || "Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleLogEnquiry = async () => {
    if (!logPhone.trim()) {
      notify.error("Phone number is required");
      return;
    }
    const PHONE_REGEX = /^\+91[0-9]{10}$/;
    if (!PHONE_REGEX.test(logPhone.trim())) {
      notify.error("Please enter a valid Indian phone number (e.g., +91XXXXXXXXXX)");
      return;
    }
    try {
      setLogLoading(true);
      const res = await fetch("/api/warden/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: logPhone.trim(),
          source: logSource,
          initialNote: logNotes.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to log enquiry");
      }
      notify.success("Enquiry logged successfully");
      setShowLogModal(false);
      setLogPhone("");
      setLogNotes("");
      setLogSource("MANUAL");
      fetchLeads();
    } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err);
      notify.error(errorMsg || "Error logging enquiry");
    } finally {
      setLogLoading(false);
    }
  };

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
    } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err);
      notify.error(errorMsg || "Error updating lead");
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderTable = (items: Lead[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <EmptyState
          icon={FileText}
          title="No Leads Found"
          description={emptyMessage}
          action={{
            label: "+ Log Enquiry",
            onClick: () => setShowLogModal(true)
          }}
        />
      );
    }

    return (
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone / Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Latest Note</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((lead) => {
              const latestNote = lead.notes[0];
              const noteText = latestNote ? latestNote.note : "No notes";
              return (
                <TableRow 
                  key={lead.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => openLeadDetails(lead)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{lead.phone}</span>
                      <a 
                        href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 p-1"
                        onClick={(e) => e.stopPropagation()}
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={LEAD_STATUS_COLORS[lead.status] || ""}>
                      {LEAD_STATUS_LABELS[lead.status] || lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${LEAD_SOURCE_COLORS[lead.status] || "bg-muted"}`}>
                      {lead.source.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {noteText}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(lead.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const newLeads = leads.filter(l => l.status === "NEW");
  const contactedLeads = leads.filter(l => l.status === "CONTACTED");
  const followUpLeads = leads.filter(l => l.status === "FOLLOW_UP");
  const convertedLeads = leads.filter(l => l.status === "CONVERTED");
  const droppedLeads = leads.filter(l => l.status === "DROPPED");

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Hostel Leads"
        description="Track and manage prospective tenants."
        actions={
          <Button size="sm" onClick={() => setShowLogModal(true)}>
            <Plus className="mr-1 h-4 w-4" /> Log Enquiry
          </Button>
        }
      />
      <div className="p-6">
        {loading ? (
          <TableSkeleton />
        ) : (
          <Tabs defaultValue="ALL" className="w-full">
            <TabsList className="mb-6 overflow-x-auto flex-nowrap w-full justify-start h-auto p-1 bg-muted/50">
              <TabsTrigger value="ALL">All Leads ({leads.length})</TabsTrigger>
              <TabsTrigger value="NEW">New ({newLeads.length})</TabsTrigger>
              <TabsTrigger value="CONTACTED">Contacted ({contactedLeads.length})</TabsTrigger>
              <TabsTrigger value="FOLLOW_UP">Follow Up ({followUpLeads.length})</TabsTrigger>
              <TabsTrigger value="CONVERTED">Converted ({convertedLeads.length})</TabsTrigger>
              <TabsTrigger value="DROPPED">Dropped ({droppedLeads.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="ALL" className="m-0">
              {renderTable(leads, "No leads have been captured yet.")}
            </TabsContent>
            <TabsContent value="NEW" className="m-0">
              {renderTable(newLeads, "No new leads.")}
            </TabsContent>
            <TabsContent value="CONTACTED" className="m-0">
              {renderTable(contactedLeads, "No contacted leads.")}
            </TabsContent>
            <TabsContent value="FOLLOW_UP" className="m-0">
              {renderTable(followUpLeads, "No leads require follow-up.")}
            </TabsContent>
            <TabsContent value="CONVERTED" className="m-0">
              {renderTable(convertedLeads, "No leads converted yet.")}
            </TabsContent>
            <TabsContent value="DROPPED" className="m-0">
              {renderTable(droppedLeads, "No dropped leads.")}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Log New Enquiry</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="text"
                  placeholder="+91..."
                  value={logPhone}
                  onChange={(e) => setLogPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="source">Source</Label>
                <Select value={logSource} onValueChange={(val) => setLogSource(val || "")}>
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Select a source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual / Walk-in</SelectItem>
                    <SelectItem value="WHATSAPP_BOT">WhatsApp Bot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Visitor asked about..."
                  rows={3}
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowLogModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLogEnquiry} disabled={logLoading}>
                  {logLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Enquiry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-background shadow-xl border my-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <span className="font-mono">{selectedLead.phone}</span>
                  <Badge variant="outline" className={LEAD_STATUS_COLORS[selectedLead.status] || ""}>
                    {LEAD_STATUS_LABELS[selectedLead.status] || selectedLead.status}
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Added on {formatDate(selectedLead.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-muted-foreground hover:text-foreground p-2 bg-muted/50 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Update Status</Label>
                  <Select value={detailStatus} onValueChange={(val) => setDetailStatus(val || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">New</SelectItem>
                      <SelectItem value="CONTACTED">Contacted</SelectItem>
                      <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                      <SelectItem value="CONVERTED">Converted</SelectItem>
                      <SelectItem value="DROPPED">Dropped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Add Note</Label>
                  <Textarea
                    placeholder="Had a call regarding..."
                    rows={4}
                    value={detailNote}
                    onChange={(e) => setDetailNote(e.target.value)}
                  />
                  <div className="mt-4">
                    <Button onClick={handleUpdateLead} disabled={detailLoading} className="w-full">
                      {detailLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save Update
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="border-t md:border-t-0 md:border-l md:pl-8 pt-6 md:pt-0">
                <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Activity History</h4>
                {selectedLead.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No history available.</p>
                ) : (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    {selectedLead.notes.map((n, idx) => (
                      <div key={idx} className="bg-muted/30 p-4 rounded-xl border border-border/50">
                        <p className="text-sm text-foreground mb-3">{n.note}</p>
                        <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                          <span className="font-mono">{n.author.phone}</span>
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
