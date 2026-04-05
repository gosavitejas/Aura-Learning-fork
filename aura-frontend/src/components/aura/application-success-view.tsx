"use client"

import { motion } from "framer-motion"
import { CheckCircle2, ArrowRight } from "lucide-react"

export function ApplicationSuccessView({
  onBackToDashboard,
}: {
  onBackToDashboard: () => void
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-10 md:p-14 max-w-lg text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(52,211,153,0.3)]"
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </motion.div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-4 text-balance">
          Application Submitted
        </h1>
        <p className="text-lg font-medium text-slate-500 leading-relaxed mb-8">
          Thank you for applying to become an Aura instructor. Our team will review your application and get back to you within 3-5 business days.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-8 py-4 text-base font-semibold shadow-[0_0_40px_rgba(59,130,246,0.25)] hover:shadow-[0_0_60px_rgba(59,130,246,0.35)] hover:bg-slate-800 transition-all cursor-pointer"
        >
          Back to Dashboard
          <ArrowRight size={18} />
        </motion.button>
      </motion.div>
    </main>
  )
}
