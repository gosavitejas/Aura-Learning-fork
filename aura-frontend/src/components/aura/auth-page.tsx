"use client"
import { useState } from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"

export function AuthPage() {
  // State to instantly toggle between Login and Signup modes
  const [isSignUp, setIsSignUp] = useState(false);

  // Centralized Clerk styling that strips defaults and forces our glassmorphism
  const clerkAppearance = {
    elements: {
      rootBox: "w-full",
      card: "bg-transparent shadow-none border-0 w-full p-0 flex flex-col gap-4", // Strips white box & padding
      header: "hidden", // Kills the duplicate "Sign in to Aura" title
      footer: "hidden", // Kills the default redirecting footer
      formButtonPrimary: "bg-slate-900 hover:bg-slate-800 text-white rounded-full py-3 transition-all font-semibold",
      socialButtonsBlockButton: "bg-white/50 border border-slate-300 rounded-full hover:bg-white/80 transition-all shadow-sm",
      formFieldInput: "bg-white/50 border border-slate-300 rounded-xl backdrop-blur-sm focus:ring-2 focus:ring-purple-500 py-2.5",
      formFieldLabel: "text-slate-700 font-medium",
      dividerLine: "bg-slate-300",
      dividerText: "text-slate-500",
      identityPreview: "bg-white/50 border border-slate-300 rounded-xl", // Fixes email confirmation step styling
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Liquid background (60%) */}
      <div className="hidden lg:flex w-[60%] relative items-center justify-center overflow-hidden">
        {/* The SpatialBackground is already rendered globally behind everything,
            so this left side naturally shows the liquid mesh through its transparent bg */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center text-center px-12"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.3)] mb-8">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tighter text-slate-900 leading-tight text-balance">
            Welcome back
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              to Aura
            </span>
          </h1>
          <p className="mt-6 text-lg font-medium text-slate-500 max-w-md leading-relaxed">
            Your AI learning companion is ready. Pick up right where you left off.
          </p>
        </motion.div>
      </div>

      {/* Right - Auth panel (40%) */}
      <div className="w-full lg:w-[40%] flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 md:p-10">
            
            {/* Our Custom Dynamic Headers */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {isSignUp ? "Create your account" : "Sign in to Aura"}
              </h2>
              <p className="mt-2 text-base font-medium text-slate-500">
                {isSignUp ? "Join us and start your learning journey" : "Continue your learning journey"}
              </p>
            </div>

            {/* Clerk Integration (Stripped down & seamless) */}
            <div className="flex justify-center items-center w-full max-w-md mx-auto">
              {isSignUp ? (
                <SignUp routing="hash" appearance={clerkAppearance} />
              ) : (
                <SignIn routing="hash" appearance={clerkAppearance} />
              )}
            </div>

            {/* Our Custom Seamless Footer Toggle */}
            <div className="mt-6 text-center text-sm font-medium text-slate-500">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-purple-600 font-bold hover:text-purple-700 transition-colors cursor-pointer"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </div>

            <p className="text-center text-sm font-medium text-slate-400 mt-8 leading-relaxed">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}