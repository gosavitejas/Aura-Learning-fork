"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useApi } from "@/hooks/useApi"
import {
  ShieldAlert, Check, X, ExternalLink, Mail, Briefcase,
  Loader2, Sparkles, Inbox, Key, Users, BookOpen, Clock
} from "lucide-react"
import type { RoleType } from "@/App"

interface InstructorApplication {
  id: number;
  user_id: string;
  email: string;
  full_name: string;
  expertise: string;
  portfolio_url: string | null;
  motivation: string;
  created_at: string;
}

interface PlatformMetrics {
  total_users: number;
  total_instructors: number;
  active_courses: number;
  pending_applications: number;
}

export function AdminDashboardView({ role }: { role: RoleType }) {
  const [applications, setApplications] = useState<InstructorApplication[]>([])
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)

  const [isLoadingApps, setIsLoadingApps] = useState(true)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true)

  const [processingId, setProcessingId] = useState<number | null>(null)
  const [isBackendRejected, setIsBackendRejected] = useState(false)


  const api = useApi()

  // Strict UI Gatekeeping
  if (role !== "admin") {
    return (
      <main className="max-w-4xl mx-auto px-6 pt-40 pb-24 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <ShieldAlert className="w-24 h-24 text-red-500 mx-auto mb-6" />
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">403 Forbidden</h1>
          <p className="text-lg text-slate-500 font-medium max-w-md mx-auto">
            God Mode is strictly classified. You do not have the required clearance to view this sector.
          </p>
        </motion.div>
      </main>
    )
  }

  // 🚀 The Metrics Fetcher
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await api.get("/api/v1/admin/metrics");
      if (response.data?.status === "success") {
        setMetrics(response.data.metrics);
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [api]);

  // The Applications Fetcher
  const fetchApplications = useCallback(async () => {
    setIsLoadingApps(true);
    setIsBackendRejected(false);
    try {
      const response = await api.get("/api/v1/admin/applications");
      if (response.data?.status === "success") {
        setApplications(response.data.applications);
      }
    } catch (error: any) {
      console.error("Failed to fetch applications:", error);
      if (error.response?.status === 403) {
        setIsBackendRejected(true);
      }
    } finally {
      setIsLoadingApps(false);
    }
  }, [api]);

  // Initial Load
  useEffect(() => {
    fetchMetrics();
    fetchApplications();
  }, [fetchMetrics, fetchApplications]);



  const handleStatusUpdate = async (appId: number, status: "approved" | "rejected") => {
    if (processingId) return;
    setProcessingId(appId);
    try {
      await api.put(`/api/v1/admin/applications/${appId}/status`, { status });

      // Optimistic UI Removal
      setApplications((prev) => prev.filter((app) => app.id !== appId));

      // 🚀 The Stale State Mitigation: Instantly refresh the metrics!
      fetchMetrics();

    } catch (error: any) {
      alert(error.response?.data?.detail || "An error occurred.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-6 pt-32 pb-24">

      {/* Header Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
          <ShieldAlert className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Command Center</h1>
          <p className="text-slate-500 font-medium mt-1">Platform overview and user moderation.</p>
        </div>
      </motion.div>

      {/* 🚀 THE METRICS DASHBOARD */}
      {!isBackendRejected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Metric 1: Total Users */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/60 backdrop-blur-xl border border-white/60 shadow-sm rounded-3xl p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
              {isLoadingMetrics ? (
                <div className="h-8 w-16 bg-slate-200 animate-pulse rounded-lg mt-1"></div>
              ) : (
                <h3 className="text-3xl font-black text-slate-900 leading-none mt-1">{metrics?.total_users || 0}</h3>
              )}
            </div>
          </motion.div>

          {/* Metric 2: Active Courses */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/60 backdrop-blur-xl border border-white/60 shadow-sm rounded-3xl p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Courses</p>
              {isLoadingMetrics ? (
                <div className="h-8 w-16 bg-slate-200 animate-pulse rounded-lg mt-1"></div>
              ) : (
                <h3 className="text-3xl font-black text-slate-900 leading-none mt-1">{metrics?.active_courses || 0}</h3>
              )}
            </div>
          </motion.div>

          {/* Metric 3: Pending Approvals */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/60 backdrop-blur-xl border border-white/60 shadow-sm rounded-3xl p-6 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pending Applications</p>
              {isLoadingMetrics ? (
                <div className="h-8 w-16 bg-slate-200 animate-pulse rounded-lg mt-1"></div>
              ) : (
                <h3 className="text-3xl font-black text-slate-900 leading-none mt-1">{metrics?.pending_applications || 0}</h3>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Database Error Fallback */}
      {!isLoadingApps && isBackendRejected && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 shadow-sm rounded-3xl p-16 text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <Key className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Database Role Mismatch</h2>
          <p className="text-slate-600 font-medium max-w-md mx-auto">
            Your frontend UI is in Admin mode, but your PostgreSQL database record has a different role. Please contact a system administrator to resolve this.
          </p>
        </motion.div>
      )}

      {/* Applications Loading State */}
      {isLoadingApps && !isBackendRejected && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-slate-400 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Decrypting application files...</p>
        </div>
      )}

      {/* Inbox Zero State */}
      {!isLoadingApps && !isBackendRejected && applications.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-sm rounded-3xl p-16 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <Inbox className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Inbox Zero</h2>
          <p className="text-slate-500 font-medium max-w-sm mx-auto">You are all caught up! There are currently no pending instructor applications to review.</p>
        </motion.div>
      )}

      {/* Applications Grid */}
      {!isLoadingApps && !isBackendRejected && applications.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            Action Required
            <span className="bg-red-100 text-red-600 text-xs font-black px-2.5 py-0.5 rounded-full">{applications.length}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {applications.map((app) => (
                <motion.div key={app.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }} className="bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{app.full_name}</h3>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium mt-1">
                        <Mail size={14} /> {app.email}
                      </div>
                    </div>
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Pending</span>
                  </div>
                  <div className="space-y-4 flex-1">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Briefcase size={12} /> Expertise</p>
                      <p className="text-sm font-semibold text-slate-800 bg-white/50 inline-block px-3 py-1.5 rounded-lg border border-slate-100">{app.expertise}</p>
                    </div>
                    {app.portfolio_url && (
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><ExternalLink size={12} /> Portfolio</p>
                        <a href={app.portfolio_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline truncate block">{app.portfolio_url}</a>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Sparkles size={12} /> Motivation</p>
                      <div className="bg-white/50 border border-slate-100 rounded-xl p-3 max-h-32 overflow-y-auto hide-scrollbar text-sm font-medium text-slate-600 leading-relaxed">{app.motivation}</div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100">
                    <button onClick={() => handleStatusUpdate(app.id, "rejected")} disabled={processingId === app.id} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50">
                      {processingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X size={16} />} Reject
                    </button>
                    <button onClick={() => handleStatusUpdate(app.id, "approved")} disabled={processingId === app.id} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50">
                      {processingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={16} />} Approve
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </main>
  )
}