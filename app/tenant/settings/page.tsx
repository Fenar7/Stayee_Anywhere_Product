"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ChevronLeft, User as UserIcon, Phone, Mail,
  Shield, AlertCircle, CheckCircle2, Lock
} from "lucide-react";
import { notify } from "@/lib/toast";

// ─── Micro-Components ─────────────────────────────────────────────────────────

function SoftCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#121212] rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(255,255,255,0.02)] border border-[#f0f0f0] dark:border-white/5 p-6 ${className}`}>
      {children}
    </div>
  );
}

function PillButton({ children, onClick, variant = "primary", className = "", type = "button", disabled = false }: any) {
  const base = "h-12 px-6 rounded-full font-bold text-[14px] flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]";
  const variants = {
    primary: "bg-[#111111] dark:bg-[#58ff48] text-white dark:text-black hover:bg-black/90",
    secondary: "bg-[#f5f5f5] dark:bg-white/10 text-[#111111] dark:text-white hover:bg-[#eeeeee]",
    outline: "bg-transparent border-[1.5px] border-[#dedede] dark:border-white/20 text-[#111111] dark:text-white hover:border-[#111111]",
    danger: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant as keyof typeof variants]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      {children}
    </button>
  );
}

function InputField({ label, value, onChange, type = "text", disabled = false, icon: Icon, id }: any) {
  const inputId = id || label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-[12px] font-bold text-gray-500 uppercase tracking-wider pl-1">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full h-14 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-black dark:focus:border-white/30 outline-none transition-all ${Icon ? "pl-12" : "pl-4"} pr-4 font-medium text-[15px] ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TenantSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Profile State
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/tenant/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        
        setEmail(data.user.email || "");
        setPhone(data.user.phone || "");
        setEmergencyName(data.tenant.emergencyContactName || "");
        setEmergencyNumber(data.tenant.emergencyContactNumber || "");
        setEmergencyRelation(data.tenant.relationship || "");
      } catch (error) {
        notify.error("Could not load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveProfile = async () => {
    if (email && !email.match(/^\S+@\S+\.\S+$/)) {
      notify.error("Please enter a valid email address");
      return;
    }
    
    setSavingProfile(true);
    try {
      const res = await fetch("/api/tenant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          emergencyContactName: emergencyName,
          emergencyContactNumber: emergencyNumber,
          relationship: emergencyRelation,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Update failed");
      }
      notify.success("Profile updated successfully");
    } catch (error: any) {
      notify.error(error.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword) {
      notify.error("Please enter your current password");
      return;
    }
    if (password !== confirmPassword) {
      notify.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      notify.error("Password must be at least 6 characters");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/tenant/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, password }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Update failed");
      }
      notify.success("Password changed successfully");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      notify.error(error.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] pb-32 text-[#111111] dark:text-white font-sans relative">
      
      {/* ── Top App Bar ── */}
      <header className="px-6 pt-12 pb-6 sticky top-0 bg-[#FAFAFA]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl z-40 flex items-center gap-4">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 transition-colors shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight leading-tight">Account Settings</h1>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <main className="px-6 space-y-6">
          
          {/* KYC Info Section */}
          <SoftCard className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-green-500" />
              </div>
              <h2 className="text-lg font-black">Identity Details</h2>
            </div>
            <p className="text-[13px] text-gray-500 font-medium mb-4">
              Core identity fields are verified by your warden and cannot be changed here.
            </p>
            
            <InputField 
              label="Registered Phone Number" 
              value={phone} 
              icon={Phone} 
              disabled={true} 
            />
          </SoftCard>

          {/* Editable Profile Section */}
          <SoftCard className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-blue-500" />
              </div>
              <h2 className="text-lg font-black">Contact Details</h2>
            </div>

            <InputField 
              label="Email Address" 
              value={email} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              icon={Mail} 
            />

            <div className="h-px bg-gray-100 dark:bg-white/5 my-4"></div>

            <h3 className="text-[14px] font-bold text-gray-900 dark:text-gray-100 mb-2">Emergency Contact</h3>
            <div className="space-y-4">
              <InputField 
                label="Contact Name" 
                value={emergencyName} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmergencyName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <InputField 
                  label="Phone Number" 
                  value={emergencyNumber} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmergencyNumber(e.target.value)}
                />
                <InputField 
                  label="Relationship" 
                  value={emergencyRelation} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmergencyRelation(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2">
              <PillButton onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
                {savingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
              </PillButton>
            </div>
          </SoftCard>

          {/* Password Section */}
          <SoftCard className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                <Lock className="w-4 h-4 text-purple-500" />
              </div>
              <h2 className="text-lg font-black">Security</h2>
            </div>
            
            <p className="text-[13px] text-gray-500 font-medium mb-4 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Forgot your password? Please contact your hostel Warden to reset it.
            </p>

            <InputField 
              label="Current Password" 
              type="password"
              value={currentPassword} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
            />
            <InputField 
              label="New Password" 
              type="password"
              value={password} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />
            <InputField 
              label="Confirm New Password" 
              type="password"
              value={confirmPassword} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            />

            <div className="pt-2">
              <PillButton onClick={handleSavePassword} disabled={savingPassword || !password || !currentPassword} variant="secondary" className="w-full">
                {savingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
              </PillButton>
            </div>
          </SoftCard>

        </main>
      )}
    </div>
  );
}
