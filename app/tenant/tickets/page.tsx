"use client";

import { useEffect, useState } from "react";
import { 
  Plus, Ticket, Loader2, AlertCircle, CheckCircle2, 
  Clock, AlertTriangle, X, ChevronLeft, ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";

export default function TenantTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [category, setCategory] = useState("MAINTENANCE");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/tenant/tickets");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTickets(data);
    } catch (error) {
      notify.error("Could not load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.length < 5) return notify.error("Title must be at least 5 characters");
    if (description.length < 10) return notify.error("Description must be at least 10 characters");

    setSubmitting(true);
    try {
      const res = await fetch("/api/tenant/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority, category })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit ticket");
      }
      notify.success("Ticket submitted successfully");
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      fetchTickets(); // Refresh list
    } catch (error: any) {
      notify.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      OPEN: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
      IN_PROGRESS: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
      RESOLVED: "bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
      CLOSED: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-white/10 dark:text-gray-400 dark:border-white/20",
    };
    const labels: any = { OPEN: "Open", IN_PROGRESS: "In Progress", RESOLVED: "Resolved", CLOSED: "Closed" };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === "CRITICAL") return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (priority === "HIGH") return <AlertCircle className="w-4 h-4 text-orange-500" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] p-6 lg:p-8 pb-32 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* App-style Top Bar */}
        <div className="relative flex items-center justify-between mb-2">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border border-gray-200 dark:border-white/10 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h1 className="absolute inset-0 flex items-center justify-center text-[20px] font-black tracking-tight text-black dark:text-white pointer-events-none">
            Help & Support
          </h1>

          <div className="w-10 h-10" />
        </div>
        
        <p className="text-[13px] text-gray-500 font-medium text-center mb-8 px-4">
          Raise maintenance issues and track their resolution status.
        </p>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : tickets.length === 0 ? (
          <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-3xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Active Issues</h3>
            <p className="text-sm text-gray-500 font-medium">You haven't raised any tickets yet. Everything seems to be working fine!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map(ticket => (
              <div key={ticket.id} className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-colors">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(ticket.status)}
                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">{ticket.category}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{ticket.title}</h3>
                    <p className="text-sm text-gray-500 font-medium mt-1 line-clamp-2">{ticket.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium text-gray-500 bg-gray-50 dark:bg-white/5 px-4 py-3 rounded-xl">
                  <div className="flex items-center gap-1.5" title="Priority">
                    {getPriorityIcon(ticket.priority)}
                    <span className="capitalize">{ticket.priority.toLowerCase()}</span>
                  </div>
                  <div className="w-px h-4 bg-gray-300 dark:bg-white/20"></div>
                  <div className="text-[13px]">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white dark:from-[#050505] dark:via-[#050505] to-transparent z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full h-14 rounded-2xl font-bold text-[16px] bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-gray-100 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-xl shadow-black/10 dark:shadow-white/10"
        >
          <Plus className="w-5 h-5" />
          Raise Ticket
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111111] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 pb-2 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-black dark:text-white">Raise a Ticket</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 pt-4 space-y-6">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 pl-1">Issue Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Broken pipe in bathroom"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full h-14 rounded-2xl bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 focus:border-black dark:focus:border-white/30 px-5 font-medium text-black dark:text-white placeholder:text-gray-400 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 pl-1">Category</label>
                  <div className="relative">
                    <select 
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full h-14 rounded-2xl bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 focus:border-black dark:focus:border-white/30 px-5 pr-12 font-medium text-black dark:text-white outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="CLEANING">Cleaning</option>
                      <option value="ELECTRICAL">Electrical</option>
                      <option value="PLUMBING">Plumbing</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 pl-1">Priority</label>
                  <div className="relative">
                    <select 
                      value={priority}
                      onChange={e => setPriority(e.target.value)}
                      className="w-full h-14 rounded-2xl bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 focus:border-black dark:focus:border-white/30 px-5 pr-12 font-medium text-black dark:text-white outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 dark:text-gray-300 pl-1">Description</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Provide as much detail as possible..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 focus:border-black dark:focus:border-white/30 p-5 font-medium text-black dark:text-white placeholder:text-gray-400 outline-none transition-all resize-none"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full h-14 rounded-2xl font-bold text-[15px] bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-lg shadow-black/10 dark:shadow-white/10"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
