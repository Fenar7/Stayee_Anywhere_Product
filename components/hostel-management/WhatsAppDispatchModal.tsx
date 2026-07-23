"use client";

import { useState } from "react";
import { MessageSquare, X, Copy, Link2, Lock, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { onboardingLinkWithPassword } from "@/lib/whatsapp/templates";
import { buildWaMeLink } from "@/lib/whatsapp/utils";

interface WhatsAppDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  link: string;
  password?: string;
  onDone?: () => void;
}

export function WhatsAppDispatchModal({
  isOpen,
  onClose,
  phone,
  link,
  password = "",
  onDone,
}: WhatsAppDispatchModalProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }
  };

  const handleCopyPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 3000);
    } catch {
      const el = document.createElement("textarea");
      el.value = password;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 3000);
    }
  };

  const handleCopyMessage = async () => {
    const message = onboardingLinkWithPassword(link, password);
    try {
      await navigator.clipboard.writeText(message);
      setMessageCopied(true);
      setTimeout(() => setMessageCopied(false), 3000);
    } catch {
      const el = document.createElement("textarea");
      el.value = message;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setMessageCopied(true);
      setTimeout(() => setMessageCopied(false), 3000);
    }
  };

  const handleSendWhatsApp = () => {
    const message = onboardingLinkWithPassword(link, password);
    window.open(buildWaMeLink(phone, message), "_blank");
  };

  const cleanPhone = phone.replace(/\D/g, "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-5 animate-in zoom-in-95 duration-150">
        
        {/* Header: Recipient Info & Dismiss Action */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                WhatsApp Onboarding Dispatch
              </h3>
              <p className="text-xs text-zinc-500 font-mono">Recipient: +{cleanPhone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Authentic WhatsApp Message Preview Card */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              WhatsApp Message Preview
            </span>
            <span className="text-[11px] font-mono text-zinc-400">Live Template</span>
          </div>

          <div className="rounded-2xl rounded-tl-xs border border-emerald-200/80 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 space-y-3 shadow-xs">
            <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">
              Hello, welcome to Anywhere Node! Your onboarding is ready.
            </p>
            
            <div className="space-y-1.5 font-mono text-xs bg-white/80 dark:bg-zinc-900/80 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/50">
              <div className="text-zinc-700 dark:text-zinc-300 truncate">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">🔗 Link:</span>{" "}
                <span className="underline decoration-emerald-300 select-all">{link || `http://localhost:3000/onboarding?id=...`}</span>
              </div>
              {password && (
                <div className="text-zinc-700 dark:text-zinc-300">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">🔑 Access Password:</span>{" "}
                  <span className="font-bold tracking-wider select-all">{password}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-zinc-500 font-medium">
                Valid until tenant completes account registration.
              </p>
              <span className="text-[10px] font-mono text-zinc-400">Just now · WhatsApp</span>
            </div>
          </div>
        </div>

        {/* Quick Copy Action Toolbar */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleCopyMessage}
            className="py-2 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            {messageCopied ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <Check className="h-3 w-3" /> Message Copied
              </span>
            ) : (
              <>
                <Copy className="h-3 w-3 text-zinc-400" />
                <span>Copy Message</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="py-2 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            {linkCopied ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <Check className="h-3 w-3" /> Link Copied
              </span>
            ) : (
              <>
                <Link2 className="h-3 w-3 text-zinc-400" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={!password}
            onClick={handleCopyPassword}
            className="py-2 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
          >
            {passwordCopied ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <Check className="h-3 w-3" /> Key Copied
              </span>
            ) : (
              <>
                <Lock className="h-3 w-3 text-zinc-400" />
                <span>Copy Key</span>
              </>
            )}
          </button>
        </div>

        {/* Action Bar */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
          <Button
            onClick={handleSendWhatsApp}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 rounded-xl font-semibold text-xs border-0 flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <span>Send via WhatsApp</span>
            <ArrowLeft className="h-3.5 w-3.5 rotate-135" />
          </Button>

          <Button
            onClick={() => {
              onClose();
              if (onDone) onDone();
            }}
            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 h-10 px-4 rounded-xl font-medium text-xs border-0 transition-colors"
          >
            Done & Return
          </Button>
        </div>

      </div>
    </div>
  );
}
