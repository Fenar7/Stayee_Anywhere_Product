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
  
  // Primary Emergency Contact
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyNumber, setEmergencyNumber] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  
  // Additional Emergency Contacts
  const [additionalContacts, setAdditionalContacts] = useState<{name: string, number: string, relationship: string}[]>([]);
  
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
        setAdditionalContacts(data.tenant.additionalEmergencyContacts || []);
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
    
    // Emergency Contact Validation: If any field is filled, all must be filled
    const hasEmergencyData = emergencyName.trim() !== "" || emergencyNumber.trim() !== "" || emergencyRelation.trim() !== "";
    if (hasEmergencyData) {
      if (!emergencyName.trim() || !emergencyNumber.trim() || !emergencyRelation.trim()) {
        notify.error("Please fill out all primary emergency contact fields (Name, Number, and Relationship)");
        return;
      }
    }

    for (let i = 0; i < additionalContacts.length; i++) {
      const contact = additionalContacts[i];
      if (!contact.name.trim() || !contact.number.trim() || !contact.relationship.trim()) {
        notify.error(`Please fill out all fields for Additional Contact ${i + 1}`);
        return;
      }
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
          additionalEmergencyContacts: additionalContacts,
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

            <h3 className="text-[14px] font-bold text-gray-900 dark:text-gray-100 mb-2">Primary Emergency Contact</h3>
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
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider pl-1">Relationship</label>
                  <div className="relative">
                    <select
                      value={emergencyRelation}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEmergencyRelation(e.target.value)}
                      className="w-full h-14 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-black dark:focus:border-white/30 outline-none transition-all pl-4 pr-4 font-medium text-[15px] appearance-none cursor-pointer"
                    >
                      <option value="">Select Option...</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Relative">Relative</option>
                      <option value="Friend">Friend</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Contacts */}
            {additionalContacts.map((contact, index) => (
              <div key={index} className="pt-4 border-t border-gray-100 dark:border-white/10 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[14px] font-bold text-gray-900 dark:text-gray-100">Additional Contact {index + 1}</h3>
                  <button 
                    onClick={() => {
                      const newContacts = [...additionalContacts];
                      newContacts.splice(index, 1);
                      setAdditionalContacts(newContacts);
                    }}
                    className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-full"
                  >
                    Remove
                  </button>
                </div>
                <InputField 
                  label="Contact Name" 
                  value={contact.name} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newContacts = [...additionalContacts];
                    newContacts[index].name = e.target.value;
                    setAdditionalContacts(newContacts);
                  }}
                />
                <div className="grid grid-cols-2 gap-4">
                  <InputField 
                    label="Phone Number" 
                    value={contact.number} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const newContacts = [...additionalContacts];
                      newContacts[index].number = e.target.value;
                      setAdditionalContacts(newContacts);
                    }}
                  />
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider pl-1">Relationship</label>
                    <div className="relative">
                      <select
                        value={contact.relationship}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          const newContacts = [...additionalContacts];
                          newContacts[index].relationship = e.target.value;
                          setAdditionalContacts(newContacts);
                        }}
                        className="w-full h-14 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-black dark:focus:border-white/30 outline-none transition-all pl-4 pr-4 font-medium text-[15px] appearance-none cursor-pointer"
                      >
                        <option value="">Select Option...</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Brother">Brother</option>
                        <option value="Sister">Sister</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Relative">Relative</option>
                        <option value="Friend">Friend</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setAdditionalContacts([...additionalContacts, { name: "", number: "", relationship: "" }])}
              className="w-full py-3 flex items-center justify-center gap-2 text-[14px] font-bold text-black dark:text-white bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-colors border border-dashed border-gray-300 dark:border-white/20 mt-4"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add Another Contact
            </button>

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
