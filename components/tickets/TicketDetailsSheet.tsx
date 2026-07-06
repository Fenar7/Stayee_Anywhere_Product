"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Send, Clock, User as UserIcon } from "lucide-react";
import { notify } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";

export function TicketDetailsSheet({ 
  ticket, 
  open, 
  onOpenChange 
}: { 
  ticket: any, 
  open: boolean, 
  onOpenChange: (open: boolean) => void 
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && ticket?.id) {
      fetchComments();
    }
  }, [open, ticket?.id]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      // In a real app, userId comes from session. For now, assuming admin is doing this
      // and we pass a dummy or use an API that extracts session user
      // Let's pass a dummy userId for now, the backend will need to use session realistically
      // But the API currently expects userId from body
      
      const res = await fetch(`/api/admin/tickets/${ticket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          isInternal: false
        })
      });
      
      if (res.ok) {
        const newComment = await res.json();
        setComments([...comments, newComment]);
        setMessage("");
      } else {
        notify.error("Failed to post comment");
      }
    } catch (err) {
      notify.error("Something went wrong");
    } finally {
      setSending(false);
    }
  };

  if (!ticket) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto bg-white dark:bg-[#050505] border-l border-gray-200 dark:border-white/10 p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="uppercase font-bold text-[10px] tracking-wider text-muted-foreground">
                {ticket.category}
              </Badge>
              <Badge variant="outline" className={`uppercase font-bold text-[10px] tracking-wider ${ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'text-red-500 border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20' : ''}`}>
                {ticket.priority}
              </Badge>
            </div>
            <SheetTitle className="text-xl font-black">{ticket.title}</SheetTitle>
            <SheetDescription className="text-gray-500 mt-2">
              {ticket.description || "No additional description provided by the tenant."}
            </SheetDescription>
            
            <div className="flex items-center gap-4 mt-6 text-sm">
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <UserIcon className="w-4 h-4" />
                <span className="font-medium">{ticket.tenant?.fullName || 'Unknown Tenant'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Notes & Activity
            </h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm font-medium">
                No notes added yet.
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {comment.user?.tenant?.fullName || comment.user?.role || "System"}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {comment.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#050505]">
            <div className="relative">
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a note or update..."
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-3 px-4 pr-12 text-sm outline-none resize-none h-[80px] focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
              />
              <Button 
                size="icon" 
                onClick={submitComment}
                disabled={sending || !message.trim()}
                className="absolute right-2 bottom-2 rounded-xl h-8 w-8 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
