"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/auth/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginSchema } from "@/lib/validation/auth";
import Image from "next/image";

type LoginForm = z.infer<typeof loginSchema>;

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.signOut().catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
  });

  async function onSubmit(data: LoginForm) {
    setServerError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      setServerError(err.error || "Login failed");
      return;
    }

    const result = await res.json();

    if (!result.passwordSetAt) {
      window.location.href = "/set-password";
      return;
    }

    window.location.href = result.redirectUrl;
  }

  return (
    <div className="w-full space-y-8">
      {/* Brand & Greeting */}
      <div className="text-center space-y-3">
        <div className="flex justify-center mb-6">
          <div className="w-[72px] h-[72px] rounded-[24px] bg-white dark:bg-black shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 dark:border-white/10 flex items-center justify-center p-3 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
             <Image 
               src="/anywhere-node-squre-icon.png" 
               alt="Logo" 
               width={48} 
               height={48} 
               className="rounded-xl relative z-10" 
             />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          Tenant Portal
        </h1>
        <p className="text-gray-500 font-medium text-sm md:text-[15px]">
          Sign in to manage your hostel stay.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="identifier" className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">
            Email or Phone
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            className="w-full h-[56px] rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent px-4 text-[16px] font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-[#151515] focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none shadow-sm"
            placeholder="Enter your registered details"
            {...register("identifier")}
          />
          {errors.identifier && (
            <p className="text-red-500 mt-1.5 text-xs font-bold ml-1">{errors.identifier.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-[12px] font-bold text-gray-400 uppercase tracking-wider ml-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="w-full h-[56px] rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent px-4 pr-12 text-[16px] font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-[#151515] focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none shadow-sm"
              placeholder="••••••••"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 mt-1.5 text-xs font-bold ml-1">{errors.password.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20 p-4 text-sm font-bold text-red-600 dark:text-red-400 text-center">
            {serverError}
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full h-[56px] rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-[16px] hover:scale-[0.98] transition-transform shadow-lg mt-4"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="mr-2 w-5 h-5 animate-spin" /> : null}
          {isSubmitting ? "Signing in..." : "Log In securely"}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#000000] p-4 sm:p-6 font-sans">
      <div className="w-full max-w-[420px] bg-white dark:bg-[#0a0a0a] rounded-[32px] p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_60px_-15px_rgba(255,255,255,0.02)] border border-gray-100 dark:border-white/5 relative overflow-hidden">
        
        {/* Subtle Decorative Background Gradients */}
        <div className="absolute -top-[100px] -right-[100px] w-[250px] h-[250px] bg-green-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-[100px] -left-[100px] w-[250px] h-[250px] bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}>
            <LoginFormInner />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
