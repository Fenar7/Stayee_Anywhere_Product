"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Key, Loader2, Check, Copy } from "lucide-react";
import { notify } from "@/lib/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ResetPasswordButton({ userId, userPhone }: { userId: string; userPhone: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPassword: customPassword.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reset password");
      }
      const data = await res.json();
      setNewPassword(data.tempPassword);
      notify.success("Password reset successfully");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      notify.error(errorMsg || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setOpen(true)} 
        className="gap-2 h-9 px-4 text-[13px] font-semibold text-black dark:text-white border-[#dedede] dark:border-white/10 bg-white dark:bg-black hover:bg-[#f4f4f4] dark:hover:bg-white/5 transition-colors shadow-sm"
      >
        <Key className="h-4 w-4 text-[#767676] dark:text-[#a0a0a0]" /> Reset Password
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!loading) {
            setOpen(isOpen);
            if (!isOpen) {
              setNewPassword("");
              setCustomPassword("");
            }
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              You can optionally enter a custom password below. If left blank, a secure random password will be generated automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {newPassword ? (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <span className="font-medium text-muted-foreground">New Password:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold tracking-widest bg-background px-2 py-1 rounded border">
                    {newPassword}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <p className="text-sm">User Phone: <span className="font-mono font-bold">{userPhone}</span></p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Custom Password (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank for auto-generated password"
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            {newPassword ? (
              <Button
                onClick={() => {
                  setOpen(false);
                  setNewPassword("");
                  setCustomPassword("");
                }}
              >
                Done
              </Button>
            ) : (
              <>
                <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                <Button
                  onClick={handleReset}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirm Reset
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
