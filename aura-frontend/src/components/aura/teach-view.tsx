"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { GraduationCap, Loader2 } from "lucide-react"
import type { RoleType } from "@/App"
import { useApi } from "@/hooks/useApi"
import { useNavigate } from "react-router-dom"

export function TeachView({
  role,
}: {
  role: RoleType
}) {
  const navigate = useNavigate()
  return (
    <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
      {role === "student" ? (
        <StudentApplicationForm />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-3">
            You're an Instructor!
          </h1>
          <p className="text-lg font-medium text-slate-500">
            Head to your <strong>Dashboard</strong> to create and manage your courses.
          </p>
        </motion.div>
      )}
    </main>
  )
}

/* ════════════════════════════════════════════════
   STUDENT: Become an Instructor Application
   ════════════════════════════════════════════════ */

function StudentApplicationForm() {
  const [fullName, setFullName] = useState("")
  const [expertise, setExpertise] = useState("")
  const [portfolioUrl, setPortfolioUrl] = useState("")
  const [bio, setBio] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const api = useApi()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return;

    setIsSubmitting(true)

    try {
      // 🚀 The API Call matching our Pydantic schema
      await api.post("/api/v1/teach/apply", {
        full_name: fullName,
        expertise: expertise,
        portfolio_url: portfolioUrl || null,
        motivation: bio
      });

      navigate("/application-success");

    } catch (error: any) {
      console.error("Application failed:", error);
      // Catch our specific edge cases (like "already pending")
      alert(error.response?.data?.detail || "Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-10"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
          Become an Instructor
        </h1>
        <p className="mt-2 text-lg font-medium text-slate-500">
          Share your knowledge and earn on Aura
        </p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 md:p-10"
      >
        {/* Full Name */}
        <div className="mb-6">
          <label className="block text-base font-semibold text-slate-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
            className="w-full bg-white/50 backdrop-blur-xl border border-white/60 rounded-xl px-4 py-3.5 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-shadow"
          />
        </div>

        {/* Expertise */}
        <div className="mb-6">
          <label className="block text-base font-semibold text-slate-700 mb-2">
            Area of Expertise
          </label>
          <input
            type="text"
            required
            value={expertise}
            onChange={(e) => setExpertise(e.target.value)}
            placeholder="e.g. Machine Learning, Web Development, UI/UX Design"
            className="w-full bg-white/50 backdrop-blur-xl border border-white/60 rounded-xl px-4 py-3.5 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-shadow"
          />
        </div>

        {/* Portfolio URL */}
        <div className="mb-6">
          <label className="block text-base font-semibold text-slate-700 mb-2">
            Portfolio URL
          </label>
          <input
            type="url"
            required
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            placeholder="https://yourportfolio.com"
            className="w-full bg-white/50 backdrop-blur-xl border border-white/60 rounded-xl px-4 py-3.5 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-shadow"
          />
        </div>

        {/* Bio / Why you want to teach */}
        <div className="mb-8">
          <label className="block text-base font-semibold text-slate-700 mb-2">
            Tell us about yourself
          </label>
          <textarea
            required
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="What motivates you to teach? What unique perspective will you bring to Aura learners?"
            rows={5}
            className="w-full bg-white/50 backdrop-blur-xl border border-white/60 rounded-xl px-4 py-3.5 text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-shadow resize-none"
          />
        </div>

        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full rounded-full bg-slate-900 text-white py-4 text-base font-semibold shadow-[0_0_40px_rgba(59,130,246,0.25)] hover:shadow-[0_0_60px_rgba(59,130,246,0.35)] hover:bg-slate-800 transition-all cursor-pointer flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
            </>
          ) : (
            "Submit Application"
          )}
        </motion.button>
      </motion.form>
    </>
  )
}
