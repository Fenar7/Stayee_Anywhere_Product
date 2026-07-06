"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ChevronLeft, User as UserIcon, Phone, Mail,
  Shield, AlertCircle, Lock, Plus, Trash2, CheckCircle2
} from "lucide-react";
import { notify } from "@/lib/toast";

// ─── Micro-Components ─────────────────────────────────────────────────────────

function SoftCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#111111] rounded-[24px] border border-gray-200/60 dark:border-white/10 p-6 md:p-8 shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${className}`}>
      {children}
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", disabled = false, icon: Icon, id }: any) {
  const inputId = id || label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-[12px] font-bold text-gray-500 uppercase tracking-wider pl-1">{label}</label>
      <div className="relative group">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full h-12 md:h-14 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 focus:border-black dark:focus:border-white/30 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 outline-none transition-all ${Icon ? "pl-11" : "pl-4"} pr-4 font-medium text-[15px] ${disabled ? "opacity-60 cursor-not-allowed bg-gray-100 dark:bg-white/5" : ""}`}
        />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TenantSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  
  // Dirty State for Sticky Bar
  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  
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
  const [savingPassword, setSavingPassword] = useState(false);

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

  // Helper to mark profile as dirty
  const markDirty = () => setIsProfileDirty(true);

  const handleSaveProfile = async () => {
    if (email && !email.match(/^\S+@\S+\.\S+$/)) {
      notify.error("Please enter a valid email address");
      return;
    }
    
    const hasEmergencyData = emergencyName.trim() !== "" || emergencyNumber.trim() !== "" || emergencyRelation.trim() !== "";
    if (hasEmergencyData) {
      if (!emergencyName.trim() || !emergencyNumber.trim() || !emergencyRelation.trim()) {
        notify.error("Please fill out all primary emergency contact fields");
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
      setIsProfileDirty(false); // Reset dirty state on success
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

  const passwordFormValid = currentPassword.length > 0 && password.length >= 6 && password === confirmPassword;

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] pb-32 text-[#111111] dark:text-white font-sans relative">
      
      {/* ── Top App Bar ── */}
      <header className="px-6 pt-12 pb-6 sticky top-0 bg-[#FAFAFA]/80 dark:bg-[#050505]/80 backdrop-blur-xl z-40">
        <div className="flex items-center gap-4 max-w-3xl mx-auto">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shrink-0 shadow-sm">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-tight">Settings</h1>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <div className="px-6 mb-8">
        <div className="max-w-3xl mx-auto flex p-1 bg-gray-200/50 dark:bg-white/5 rounded-xl">
          <button 
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-2.5 text-[14px] font-bold rounded-lg transition-all duration-200 ${activeTab === "profile" ? "bg-white dark:bg-[#222] shadow-sm text-black dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
          >
            Profile
          </button>
          <button 
            onClick={() => setActiveTab("security")}
            className={`flex-1 py-2.5 text-[14px] font-bold rounded-lg transition-all duration-200 ${activeTab === "security" ? "bg-white dark:bg-[#222] shadow-sm text-black dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
          >
            Security
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <main className="px-6 max-w-3xl mx-auto">
          
          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* KYC Info Section */}
              <SoftCard className="space-y-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center border border-green-100 dark:border-green-500/20">
                    <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold">Identity Details</h2>
                  </div>
                </div>
                <p className="text-[13px] text-gray-500 font-medium mb-4 leading-relaxed">
                  These core identity fields are verified by your warden during onboarding and cannot be changed here to prevent identity fraud.
                </p>
                
                <InputField 
                  label="Registered Phone Number" 
                  value={phone} 
                  icon={Phone} 
                  disabled={true} 
                />
              </SoftCard>

              {/* Editable Profile Section */}
              <SoftCard className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
                    <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold">Contact & Emergency</h2>
                  </div>
                </div>

                <InputField 
                  label="Email Address" 
                  value={email} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); markDirty(); }}
                  icon={Mail} 
                />

                <div className="h-px bg-gray-200/50 dark:bg-white/5 my-6"></div>

                <div>
                  <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wider">Primary Emergency Contact</h3>
                  <div className="space-y-4 bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                    <InputField 
                      label="Contact Name" 
                      value={emergencyName} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEmergencyName(e.target.value); markDirty(); }}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField 
                        label="Phone Number" 
                        value={emergencyNumber} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEmergencyNumber(e.target.value); markDirty(); }}
                      />
                      <div className="space-y-2">
                        <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider pl-1">Relationship</label>
                        <div className="relative">
                          <select
                            value={emergencyRelation}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setEmergencyRelation(e.target.value); markDirty(); }}
                            className="w-full h-12 md:h-14 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 focus:border-black dark:focus:border-white/30 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 outline-none transition-all pl-4 pr-10 font-medium text-[15px] appearance-none cursor-pointer"
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
                            <ChevronLeft className="w-4 h-4 text-gray-400 -rotate-90" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Contacts */}
                {additionalContacts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Additional Contacts</h3>
                    {additionalContacts.map((contact, index) => (
                      <div key={index} className="space-y-4 bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-100 dark:border-white/5 relative group">
                        <button 
                          onClick={() => {
                            const newContacts = [...additionalContacts];
                            newContacts.splice(index, 1);
                            setAdditionalContacts(newContacts);
                            markDirty();
                          }}
                          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-500/20"
                          title="Remove contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <InputField 
                          label={`Contact ${index + 2} Name`} 
                          value={contact.name} 
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newContacts = [...additionalContacts];
                            newContacts[index].name = e.target.value;
                            setAdditionalContacts(newContacts);
                            markDirty();
                          }}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InputField 
                            label="Phone Number" 
                            value={contact.number} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const newContacts = [...additionalContacts];
                              newContacts[index].number = e.target.value;
                              setAdditionalContacts(newContacts);
                              markDirty();
                            }}
                          />
                          <div className="space-y-2">
                            <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider pl-1">Relationship</label>
                            <div className="relative">
                              <select
                                value={contact.relationship}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                  const newContacts = [...additionalContacts];
                                  newContacts[index].relationship = e.target.value;
                                  setAdditionalContacts(newContacts);
                                  markDirty();
                                }}
                                className="w-full h-12 md:h-14 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 focus:border-black dark:focus:border-white/30 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 outline-none transition-all pl-4 pr-10 font-medium text-[15px] appearance-none cursor-pointer"
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
                                <ChevronLeft className="w-4 h-4 text-gray-400 -rotate-90" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setAdditionalContacts([...additionalContacts, { name: "", number: "", relationship: "" }]);
                    markDirty();
                  }}
                  className="w-full h-14 flex items-center justify-center gap-2 text-[14px] font-bold text-black dark:text-white bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all border border-dashed border-gray-300 dark:border-white/20 mt-4 group"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  Add Another Contact
                </button>
              </SoftCard>
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SoftCard className="space-y-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center border border-purple-100 dark:border-purple-500/20">
                    <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold">Change Password</h2>
                  </div>
                </div>
                
                <div className="flex gap-3 p-4 bg-orange-50 dark:bg-orange-500/10 rounded-xl border border-orange-100 dark:border-orange-500/20">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-orange-800 dark:text-orange-200 font-medium leading-relaxed">
                    If you have forgotten your password and cannot log in, you must contact your hostel Warden to perform an administrative reset.
                  </p>
                </div>

                <div className="space-y-5">
                  <InputField 
                    label="Current Password" 
                    type="password"
                    value={currentPassword} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                  />
                  <div className="h-px bg-gray-100 dark:bg-white/5 my-4"></div>
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
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={handleSavePassword} 
                    disabled={savingPassword || !passwordFormValid} 
                    className={`h-12 px-8 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all duration-300 ${
                      passwordFormValid 
                        ? "bg-black dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10 dark:shadow-white/10" 
                        : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    }`}
                  >
                    {savingPassword ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </SoftCard>
            </div>
          )}

        </main>
      )}

      {/* ── Sticky Save Bar (Only for Profile Tab) ── */}
      <div className={`fixed bottom-0 left-0 right-0 p-4 md:p-6 transition-transform duration-300 ease-out z-50 ${isProfileDirty && activeTab === 'profile' ? "translate-y-0" : "translate-y-[150%]"}`}>
        <div className="max-w-3xl mx-auto bg-black dark:bg-[#222] p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10">
          <div className="text-white">
            <p className="text-[14px] font-bold">Unsaved Changes</p>
            <p className="text-[12px] text-gray-400 hidden md:block">You have modified your profile settings.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                window.location.reload();
              }} 
              className="h-10 px-4 rounded-lg font-bold text-[13px] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Discard
            </button>
            <button 
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="h-10 px-6 rounded-lg font-bold text-[13px] bg-white text-black hover:bg-gray-100 transition-all active:scale-95 flex items-center gap-2"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

