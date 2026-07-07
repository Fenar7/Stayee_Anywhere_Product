"use client";

import { useState, useEffect } from "react";
import { Loader2, X, Wallet, ArrowRight } from "lucide-react";
import { notify } from "@/lib/toast";

interface FoodTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function FoodTopUpModal({ isOpen, onClose, onSuccess }: FoodTopUpModalProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(amount);
    
    if (isNaN(amountVal) || amountVal <= 0) {
      notify.error("Please enter a valid amount greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenant/food-topup-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaise: Math.round(amountVal * 100),
          reason: reason.trim() || undefined,
          idempotencyKey,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to request top-up");
      }

      notify.success("Top-up request sent to your warden for approval.");
      setAmount("");
      setReason("");
      onSuccess();
      onClose();
    } catch (err: any) {
      notify.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#f0f0f0] dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-[18px] font-black text-black dark:text-white">Top Up Wallet</h2>
              <p className="text-[13px] text-gray-500">Request funds for food consumption</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            <div>
              <label className="block text-[13px] font-bold text-gray-700 dark:text-gray-300 mb-2">
                Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000"
                  className="w-full h-14 pl-10 pr-4 rounded-[16px] border-2 border-[#f0f0f0] dark:border-white/10 bg-gray-50 dark:bg-white/5 font-bold text-[18px] text-black dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-[#121212] transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-gray-700 dark:text-gray-300 mb-2">
                Note (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Paid via UPI to warden"
                rows={2}
                className="w-full p-4 rounded-[16px] border-2 border-[#f0f0f0] dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[14px] text-black dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-[#121212] transition-all outline-none resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !amount}
            className="w-full h-14 mt-8 rounded-[16px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-[15px] flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Submit Request
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
