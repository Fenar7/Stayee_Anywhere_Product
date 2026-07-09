"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";
import { TaskCommentDTO } from "@/types/tasks";

export function TaskComments({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<TaskCommentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let abortController = new AbortController();

    const fetchComments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tasks/${taskId}/comments`, {
          signal: abortController.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setComments(data);
          scrollToBottom();
        }
      } catch (err) {
        const error = err as Error;
        if (error.name !== "AbortError") {
          console.error("Failed to fetch comments", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchComments();

    return () => {
      abortController.abort();
    };
  }, [taskId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const submitComment = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) throw new Error("Failed to post comment");
      const newComment = await res.json();

      setComments([...comments, newComment]);
      setMessage("");
      scrollToBottom();
    } catch (err) {
      notify.error("Failed to post comment");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5"
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-sm font-medium text-gray-400">
            No messages yet. Start the conversation.
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white dark:bg-[#111111] rounded-2xl p-4 border border-gray-100 dark:border-white/10 shadow-sm"
            >
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {comment.user.email || comment.user.phone}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                    comment.user.role === 'MAIN_ADMIN' 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                      : 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                  }`}>
                    {comment.user.role === 'MAIN_ADMIN' ? 'ADMIN' : 'WARDEN'}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-gray-400">
                  {new Date(comment.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">
                {comment.message}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#0a0a0a]">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a comment..."
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-3 px-4 pr-12 text-sm outline-none resize-none h-[70px] focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitComment();
              }
            }}
          />
          <Button
            size="icon"
            onClick={submitComment}
            disabled={sending || !message.trim()}
            className="absolute right-2 bottom-2 rounded-xl h-8 w-8 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
