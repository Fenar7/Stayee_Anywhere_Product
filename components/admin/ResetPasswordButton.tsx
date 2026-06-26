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
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
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
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Key className="h-4 w-4" /> Reset Password
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!loading) {
            setOpen(isOpen);
            if (!isOpen) setNewPassword("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the user's current password with a new randomly generated secure password. They will be forced to change it upon next login.
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
            <div className="py-2">
              <p className="text-sm">User Phone: <span className="font-mono font-bold">{userPhone}</span></p>
            </div>
          )}

          <AlertDialogFooter>
            {newPassword ? (
              <Button
                onClick={() => {
                  setOpen(false);
                  setNewPassword("");
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
