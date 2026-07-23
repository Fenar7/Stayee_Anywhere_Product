"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Loader2, Camera, Upload, AlertCircle, CheckCircle, ArrowLeft, ArrowRight, Shield, User, Briefcase, FileText, RotateCcw } from "lucide-react";
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
import { compressImageInBrowser } from "@/lib/image/client-compress";

interface OnboardingData {
  id: string;
  phone: string;
  hostelName: string;
  bedLabel: string;
}

function OnboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("id");

  // Form step state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Metadata from onboarding request
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);

  // Step 1: Security Details
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2: Personal Details
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("MALE");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [emergencyContactNumber, setEmergencyContactNumber] = useState("");
  const [parentGuardianName, setParentGuardianName] = useState("");
  const [parentGuardianContact, setParentGuardianContact] = useState("");
  const [email, setEmail] = useState("");

  // Step 3: Background Details
  const [occupationType, setOccupationType] = useState<"STUDENT" | "WORKING_PROFESSIONAL">("STUDENT");
  const [collegeName, setCollegeName] = useState("");
  const [courseOrBranch, setCourseOrBranch] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [designation, setDesignation] = useState("");
  const [purposeOfStay, setPurposeOfStay] = useState("Hostel Accommodation");

  // Step 4: Photo Capture & Upload
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Step 5: ID Document
  const [idDocType, setIdDocType] = useState("AADHAAR");
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [idDocPreview, setIdDocPreview] = useState<string | null>(null);

  // Fetch onboarding details + progress on load
  useEffect(() => {
    if (!requestId) {
      setError("Invalid registration link. Missing Onboarding Request ID.");
      setLoading(false);
      return;
    }

    const fetchRequest = async () => {
      try {
        const [requestRes, progressRes] = await Promise.all([
          fetch(`/api/public/onboard-request/${requestId}`),
          fetch(`/api/public/onboarding/${requestId}/progress`),
        ]);

        if (!requestRes.ok) {
          const errData = await requestRes.json();
          throw new Error(errData.error || "Failed to load request metadata");
        }
        const data = await requestRes.json();
        setOnboardingData(data);

        // Resume from saved progress if any
        if (progressRes.ok) {
          const progress = await progressRes.json();
          if (progress.hasProgress && progress.tenant) {
            const t = progress.tenant;
            setStep(progress.step);
            if (t.fullName) setFullName(t.fullName);
            if (t.dateOfBirth) setDateOfBirth(t.dateOfBirth.split("T")[0]);
            if (t.gender) setGender(t.gender);
            if (t.placeOfBirth) setPlaceOfBirth(t.placeOfBirth);
            if (t.permanentAddress) setPermanentAddress(t.permanentAddress);
            if (t.emergencyContactName) setEmergencyContactName(t.emergencyContactName);
            if (t.relationship) setRelationship(t.relationship);
            if (t.emergencyContactNumber) setEmergencyContactNumber(t.emergencyContactNumber);
            if (t.parentGuardianName) setParentGuardianName(t.parentGuardianName);
            if (t.parentGuardianContact) setParentGuardianContact(t.parentGuardianContact);
            if (t.occupationType) setOccupationType(t.occupationType);
            if (t.collegeName) setCollegeName(t.collegeName);
            if (t.courseOrBranch) setCourseOrBranch(t.courseOrBranch);
            if (t.companyName) setCompanyName(t.companyName);
            if (t.designation) setDesignation(t.designation);
            if (t.purposeOfStay) setPurposeOfStay(t.purposeOfStay);
          }
        }
      } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [requestId]);

  // Automatic background debounced auto-save hook for form inputs
  useEffect(() => {
    if (!requestId || loading || step <= 1) return;

    const timer = setTimeout(() => {
      const data: Record<string, unknown> = {};
      if (fullName) data.fullName = fullName;
      if (dateOfBirth) data.dateOfBirth = dateOfBirth;
      if (gender) data.gender = gender;
      if (placeOfBirth) data.placeOfBirth = placeOfBirth;
      if (permanentAddress) data.permanentAddress = permanentAddress;
      if (emergencyContactName) data.emergencyContactName = emergencyContactName;
      if (relationship) data.relationship = relationship;
      if (emergencyContactNumber) data.emergencyContactNumber = emergencyContactNumber;
      if (parentGuardianName) data.parentGuardianName = parentGuardianName;
      if (parentGuardianContact) data.parentGuardianContact = parentGuardianContact;
      if (email) data.email = email;
      if (occupationType) data.occupationType = occupationType;
      if (collegeName) data.collegeName = collegeName;
      if (courseOrBranch) data.courseOrBranch = courseOrBranch;
      if (companyName) data.companyName = companyName;
      if (designation) data.designation = designation;
      if (purposeOfStay) data.purposeOfStay = purposeOfStay;

      if (Object.keys(data).length > 0) {
        fetch(`/api/public/onboarding/${requestId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step, data }),
        }).catch(() => {});
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    requestId, loading, step, fullName, dateOfBirth, gender, placeOfBirth, permanentAddress,
    emergencyContactName, relationship, emergencyContactNumber, parentGuardianName,
    parentGuardianContact, email, occupationType, collegeName, courseOrBranch,
    companyName, designation, purposeOfStay
  ]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Camera helpers
  const startCamera = async () => {
    setCameraError("");
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Camera access failed:", err);
      setCameraError("Could not access camera. Please upload a file instead.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleResetDraft = async () => {
    if (!requestId) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/public/onboarding/${requestId}/reset`, {
        method: "POST",
      });
      if (res.ok) {
        setFullName("");
        setDateOfBirth("");
        setGender("MALE");
        setPlaceOfBirth("");
        setPermanentAddress("");
        setEmergencyContactName("");
        setRelationship("");
        setEmergencyContactNumber("");
        setParentGuardianName("");
        setParentGuardianContact("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setOccupationType("STUDENT");
        setCollegeName("");
        setCourseOrBranch("");
        setCompanyName("");
        setDesignation("");
        setPurposeOfStay("Hostel Accommodation");
        setPhotoFile(null);
        setPhotoPreview(null);
        setIdDocFile(null);
        setIdDocPreview(null);
        setStep(1);
        setShowResetConfirm(false);
      }
    } catch (err) {
      console.error("Draft reset failed:", err);
    } finally {
      setResetting(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], "profile_photo.jpg", {
                type: "image/jpeg",
              });
              setPhotoFile(file);
              setPhotoPreview(URL.createObjectURL(file));
              stopCamera();
            }
          },
          "image/jpeg",
          0.95
        );
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      const compressed = await compressImageInBrowser(file, 1000, 1000, 0.8);
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
      stopCamera();
    }
  };

  const handleIdDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }
      setIdDocFile(file);
      if (file.type.startsWith("image/")) {
        setIdDocPreview(URL.createObjectURL(file));
      } else {
        setIdDocPreview(null); // PDF preview fallback
      }
    }
  };

  // Validation helpers per step
  const validateStep = () => {
    setError("");
    if (step === 1) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return false;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
    } else if (step === 2) {
      if (!fullName.trim()) return setError("Full name is required"), false;
      if (!dateOfBirth) return setError("Date of birth is required"), false;
      if (!placeOfBirth.trim()) return setError("Place of birth is required"), false;
      if (!permanentAddress.trim()) return setError("Permanent address is required"), false;
      if (!emergencyContactName.trim()) return setError("Emergency contact name is required"), false;
      if (!relationship.trim()) return setError("Relationship is required"), false;
      if (!emergencyContactNumber.match(/^\+91[0-9]{10}$/)) {
        return setError("Emergency contact number must be in format +91XXXXXXXXXX"), false;
      }
      if (!parentGuardianName.trim()) return setError("Parent/Guardian name is required"), false;
      if (!parentGuardianContact.match(/^\+91[0-9]{10}$/)) {
        return setError("Parent/Guardian contact number must be in format +91XXXXXXXXXX"), false;
      }
      if (email && !email.includes("@")) {
        return setError("Enter a valid email address"), false;
      }
    } else if (step === 3) {
      if (occupationType === "STUDENT") {
        if (!collegeName.trim()) return setError("College name is required"), false;
        if (!courseOrBranch.trim()) return setError("Course/Branch is required"), false;
      } else {
        if (!companyName.trim()) return setError("Company name is required"), false;
        if (!designation.trim()) return setError("Designation is required"), false;
      }
      if (!purposeOfStay.trim()) return setError("Purpose of stay is required"), false;
    } else if (step === 4) {
      if (!photoFile) {
        return setError("Profile photo is required. Capture or upload a photo."), false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (validateStep()) {
      setSaving(true);
      setError("");
      try {
        // Save progress before advancing
        const progressData: Record<string, unknown> = { step: step + 1, data: {} };
        const data = progressData.data as Record<string, unknown>;

        if (step === 1) {
          data.password = password;
        } else if (step === 2) {
          data.fullName = fullName;
          data.dateOfBirth = dateOfBirth;
          data.gender = gender;
          data.placeOfBirth = placeOfBirth;
          data.permanentAddress = permanentAddress;
          data.emergencyContactName = emergencyContactName;
          data.relationship = relationship;
          data.emergencyContactNumber = emergencyContactNumber;
          data.parentGuardianName = parentGuardianName;
          data.parentGuardianContact = parentGuardianContact;
          data.email = email || null;
        } else if (step === 3) {
          data.occupationType = occupationType;
          data.collegeName = occupationType === "STUDENT" ? collegeName : null;
          data.courseOrBranch = occupationType === "STUDENT" ? courseOrBranch : null;
          data.companyName = occupationType === "WORKING_PROFESSIONAL" ? companyName : null;
          data.designation = occupationType === "WORKING_PROFESSIONAL" ? designation : null;
          data.purposeOfStay = purposeOfStay;
        }

        const res = await fetch(`/api/public/onboarding/${requestId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(progressData),
        });

        if (!res.ok) {
          const errData = await res.json();
          console.warn("Progress save warning:", errData.error);
        }
      } catch (err) {
        console.warn("Progress save failed (non-blocking):", err);
      } finally {
        setSaving(false);
        setStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => prev - 1);
    stopCamera();
  };

  const handleSubmit = async () => {
    if (!idDocFile) {
      setError("Please upload at least one ID document");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("fullName", fullName);
      formData.append("dateOfBirth", dateOfBirth);
      formData.append("gender", gender);
      formData.append("placeOfBirth", placeOfBirth);
      formData.append("permanentAddress", permanentAddress);
      formData.append("emergencyContactName", emergencyContactName);
      formData.append("relationship", relationship);
      formData.append("emergencyContactNumber", emergencyContactNumber);
      formData.append("parentGuardianName", parentGuardianName);
      formData.append("parentGuardianContact", parentGuardianContact);
      formData.append("occupationType", occupationType);
      formData.append("purposeOfStay", purposeOfStay);
      if (email) formData.append("email", email);

      if (occupationType === "STUDENT") {
        formData.append("collegeName", collegeName);
        formData.append("courseOrBranch", courseOrBranch);
      } else {
        formData.append("companyName", companyName);
        formData.append("designation", designation);
      }

      if (photoFile) {
        formData.append("photo", photoFile);
      }

      formData.append("idDocument", idDocFile);
      formData.append("idDocumentType", idDocType);

      const response = await fetch(`/api/public/onboard-request/${requestId}/register`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to complete self-registration");
      }

      setSuccess(true);
    } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg || "An error occurred during submission. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Validating onboarding request...</p>
        </div>
      </div>
    );
  }

  if (error && step === 1 && !onboardingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card rounded-2xl border border-destructive/20 p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive text-3xl font-bold">
            ⚠️
          </div>
          <h1 className="text-2xl font-bold text-foreground">Invalid Link</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{error}</p>
          <Button onClick={() => router.push("/login")} variant="outline" className="w-full">
            Proceed to Log In
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card rounded-2xl border border-green-200 p-8 shadow-xl text-center space-y-6 dark:border-green-900/30">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Registration Complete!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your profile details and documents have been submitted successfully to <strong>{onboardingData?.hostelName}</strong>.
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            Please inform your hostel warden to review your application and initiate the payment request.
          </p>
          <Button onClick={() => router.push("/login")} className="w-full mt-4">
            Go to Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/40 to-background py-12 px-4 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-card border rounded-2xl shadow-xl overflow-hidden">
        {/* Progress Bar */}
        <div className="bg-muted/30 border-b p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-left">
            <h1 className="text-xl font-bold tracking-tight">Onboarding Profile Setup</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Hostel: <span className="font-semibold text-foreground">{onboardingData?.hostelName}</span> &middot; Bed: <span className="font-semibold text-foreground">{onboardingData?.bedLabel}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    s === step
                      ? "w-8 bg-primary"
                      : s < step
                      ? "w-4 bg-primary/60"
                      : "w-2.5 bg-muted"
                  }`}
                />
              ))}
              <span className="text-xs font-semibold ml-2 text-muted-foreground">Step {step} of 5</span>
            </div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-[11px] font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1 hover:underline transition-colors mt-0.5"
              >
                <RotateCcw className="h-3 w-3" />
                Clear Draft & Start Fresh
              </button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* STEP 1: Security / Password */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Secure Your Account</h2>
                  <p className="text-xs text-muted-foreground">Create a password to access your tenant portal later</p>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <div>
                  <label className="text-sm font-semibold">Phone Number (Verified)</label>
                  <input
                    type="text"
                    disabled
                    value={onboardingData?.phone || ""}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Password</label>
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Personal Details */}
          {step === 2 && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Personal Information</h2>
                  <p className="text-xs text-muted-foreground">Please fill in your permanent registration details</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 mt-6">
                <div>
                  <label className="text-sm font-semibold">Full Name</label>
                  <input
                    type="text"
                    placeholder="As in government ID"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Email Address</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">Place of Birth</label>
                  <input
                    type="text"
                    placeholder="City, State"
                    value={placeOfBirth}
                    onChange={(e) => setPlaceOfBirth(e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Permanent Address</label>
                  <input
                    type="text"
                    placeholder="Full residential address"
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Emergency Contact Name</label>
                  <input
                    type="text"
                    placeholder="Name of contact person"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Relationship</label>
                  <input
                    type="text"
                    placeholder="e.g. Father, Mother, Friend"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold mb-1.5 block">Emergency Contact Number</label>
                  <PhoneInput
                    value={emergencyContactNumber}
                    onChange={(val) => setEmergencyContactNumber(val)}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Parent / Guardian Name</label>
                  <input
                    type="text"
                    placeholder="Full name of parent"
                    value={parentGuardianName}
                    onChange={(e) => setParentGuardianName(e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold mb-1.5 block">Parent / Guardian Contact</label>
                  <PhoneInput
                    value={parentGuardianContact}
                    onChange={(val) => setParentGuardianContact(val)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Background Details */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Academic &amp; Professional Profile</h2>
                  <p className="text-xs text-muted-foreground">Select your current occupation and state stay details</p>
                </div>
              </div>

              <div className="space-y-6 mt-6">
                <div>
                  <label className="text-sm font-semibold block mb-2">Occupation Status</label>
                  <div className="flex rounded-lg border bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setOccupationType("STUDENT")}
                      className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                        occupationType === "STUDENT"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setOccupationType("WORKING_PROFESSIONAL")}
                      className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                        occupationType === "WORKING_PROFESSIONAL"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Working Professional
                    </button>
                  </div>
                </div>

                {occupationType === "STUDENT" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold">College / University Name</label>
                      <input
                        type="text"
                        placeholder="Name of institute"
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold">Course / Branch</label>
                      <input
                        type="text"
                        placeholder="e.g. B.Tech Computer Science"
                        value={courseOrBranch}
                        onChange={(e) => setCourseOrBranch(e.target.value)}
                        className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold">Company Name</label>
                      <input
                        type="text"
                        placeholder="Employer name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold">Designation</label>
                      <input
                        type="text"
                        placeholder="e.g. Software Engineer"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold">Purpose of Stay</label>
                  <input
                    type="text"
                    value={purposeOfStay}
                    onChange={(e) => setPurposeOfStay(e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Photo Capture & Upload */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Profile Picture</h2>
                  <p className="text-xs text-muted-foreground">Capture a live photo or upload an image for your identity card</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-6 mt-6">
                {isCameraActive ? (
                  <div className="relative w-full max-w-sm rounded-lg overflow-hidden border bg-black aspect-video flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                      <Button onClick={capturePhoto} className="bg-primary hover:bg-primary/95 text-white">
                        Capture Frame
                      </Button>
                      <Button onClick={stopCamera} variant="secondary">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    {photoPreview ? (
                      <div className="relative h-48 w-48 rounded-full overflow-hidden border-4 border-muted shadow-lg bg-muted">
                        <img
                          src={photoPreview}
                          alt="Profile Preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                        >
                          Change Photo
                        </button>
                      </div>
                    ) : (
                      <div className="h-48 w-48 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-dashed border-muted-foreground/30">
                        <User className="h-20 w-20" />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button onClick={startCamera} variant="outline" className="flex items-center gap-2">
                        <Camera className="h-4 w-4" /> Take Live Photo
                      </Button>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          onChange={handlePhotoUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button variant="outline" className="flex items-center gap-2 pointer-events-none">
                          <Upload className="h-4 w-4" /> Upload Photo File
                        </Button>
                      </div>
                    </div>
                    {cameraError && <p className="text-xs text-destructive mt-1">{cameraError}</p>}
                    <p className="text-xs text-muted-foreground">Supported file formats: JPG, JPEG, PNG (Max 5MB)</p>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>
          )}

          {/* STEP 5: ID Document */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Identity Verification</h2>
                  <p className="text-xs text-muted-foreground">Upload a scan or photo of your official government ID card</p>
                </div>
              </div>

              <div className="space-y-6 mt-6">
                <div>
                  <label className="text-sm font-semibold">Document Type</label>
                  <select
                    value={idDocType}
                    onChange={(e) => setIdDocType(e.target.value)}
                    className="mt-1.5 flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="AADHAAR">Aadhaar Card (Recommended)</option>
                    <option value="PAN">PAN Card</option>
                    <option value="PASSPORT_PHOTO">Passport ID Page</option>
                    <option value="COLLEGE_ID">College Student ID</option>
                    <option value="COMPANY_ID">Company Employee ID</option>
                    <option value="OTHER">Other Official ID</option>
                  </select>
                </div>

                <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-8 bg-muted/10 space-y-4">
                  {idDocFile ? (
                    <div className="text-center space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground truncate max-w-xs">{idDocFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{(idDocFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      {idDocPreview && (
                        <div className="mt-4 rounded-lg overflow-hidden border max-h-40 max-w-xs mx-auto">
                          <img src={idDocPreview} alt="ID preview" className="object-cover h-full w-full" />
                        </div>
                      )}
                      <Button
                        type="button"
                        onClick={() => {
                          setIdDocFile(null);
                          setIdDocPreview(null);
                        }}
                        variant="secondary"
                        size="sm"
                      >
                        Remove Document
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Click to select ID document file</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG or PDF (Max 5MB)</p>
                      </div>
                      <div className="relative inline-block">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, application/pdf"
                          onChange={handleIdDocUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button className="pointer-events-none">Select Document File</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="bg-muted/10 border-t p-6 flex justify-between gap-4">
          {step > 1 ? (
            <Button onClick={handleBack} variant="outline" className="flex items-center gap-2" disabled={submitting}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button onClick={handleNext} className="flex items-center gap-2">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? "Submitting Application..." : "Complete Registration"}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Draft & Restart Onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will wipe all your saved draft inputs (name, address, emergency contacts) and reset your onboarding progress back to Step 1. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetDraft}
              disabled={resetting}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Yes, Clear & Start Fresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <OnboardContent />
    </Suspense>
  );
}
