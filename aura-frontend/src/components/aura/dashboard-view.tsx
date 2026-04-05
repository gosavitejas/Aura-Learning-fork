"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useUser } from "@clerk/clerk-react"
import { useApi } from "@/hooks/useApi"
import { useNotification } from "@/contexts/NotificationContext"
import {
  BookOpen,
  Clock,
  TrendingUp,
  Users,
  IndianRupee,
  PlayCircle,
  Pencil,
  Trash2,
  Loader2,
  BrainCircuit,
  Code,
  Palette,
  BadgeCheck,
  Globe,
  Lock,
  AlertTriangle
} from "lucide-react"
import type { RoleType } from "@/App"

// 🚀 UPDATED SCHEMA to catch the is_enrolled flag
interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  price: number;
  category: string;
  status: string;
  thumbnail_url?: string;
  duration?: string;
  is_enrolled?: boolean;
}

// 🚀 NEW SCHEMA for Telemetry Data
interface DashboardMetrics {
  active_courses: number;
  total_hours: number;
  average_score: number;
  resume_target: {
    course_id: string;
    course_title: string;
    lesson_id: number;
    lesson_title: string;
    last_accessed_at: string;
  } | null;
}



const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.3 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
}

const getCategoryIcon = (categoryName?: string) => {
  switch (categoryName) {
    case "AI": return BrainCircuit;
    case "Development": return Code;
    case "Design": return Palette;
    case "Business": return TrendingUp;
    default: return BookOpen;
  }
}

const getGradientForId = (id: string | number) => {
  const strId = String(id);
  let hash = 0;
  for (let i = 0; i < strId.length; i++) hash += strId.charCodeAt(i);

  const gradients = [
    "from-indigo-100 to-purple-100",
    "from-rose-100 to-orange-100",
    "from-sky-100 to-cyan-100",
    "from-emerald-100 to-teal-100",
    "from-violet-100 to-fuchsia-100",
  ];
  return gradients[hash % gradients.length];
}

export function DashboardView({
  role,
  onCourseClick,
  onContinueLearning,
  onCreateCourse,
}: {
  role: RoleType
  onCourseClick?: (courseId: number | string) => void
  onContinueLearning?: (courseId?: string) => void // Updated to accept specific course targets
  onCreateCourse?: () => void
}) {
  const { user } = useUser();
  const firstName = user?.firstName || (role === "student" ? "Student" : "Instructor");

  return (
    <main className="max-w-6xl mx-auto px-6 pt-32 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
          Good morning, {firstName}
        </h1>
        <p className="mt-2 text-lg font-medium text-slate-500">
          {role === "student"
            ? "Continue where you left off or explore new courses."
            : "Manage your courses and students."}
        </p>
      </motion.div>

      {role === "student" ? (
        <StudentDashboard onContinueLearning={onContinueLearning} />
      ) : (
        <InstructorDashboard onCreateCourse={onCreateCourse} onCourseClick={onCourseClick} />
      )}
    </main>
  )
}

/* ════════════════════════════════════════════════════
   🚀 WIRED: STUDENT DASHBOARD
   ════════════════════════════════════════════════════ */

function StudentDashboard({
  onContinueLearning,
}: {
  onContinueLearning?: (courseId?: string) => void
}) {
  const api = useApi();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🚀 Fetch Telemetry & Enrolled Courses
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // 1. Fetch Real Metrics
        const metricsRes = await api.get('/api/v1/dashboard/student/metrics');
        if (metricsRes.data?.status === 'success') {
          setMetrics(metricsRes.data.metrics);
        }

        // 2. Fetch Catalog & filter down to ONLY owned courses
        const coursesRes = await api.get('/api/v1/courses');
        if (coursesRes.data?.status === 'success' && Array.isArray(coursesRes.data.courses)) {
          const owned = coursesRes.data.courses.filter((c: Course) => c.is_enrolled);
          setEnrolledCourses(owned);
        }
      } catch (error) {
        console.error("Failed to load student dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [api]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-medium">Crunching Telemetry Data...</p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8"
      >
        {[
          { label: "Total Hours Learned", value: metrics?.total_hours || "0", icon: Clock },
          { label: "Active Courses", value: metrics?.active_courses || "0", icon: TrendingUp },
          { label: "Avg Quiz Score", value: `${metrics?.average_score || 0}%`, icon: BrainCircuit },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <stat.icon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{stat.value}</p>
              <p className="text-base font-medium text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* 🚀 DYNAMIC "RESUME TARGET" HERO CARD */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8"
      >
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">

          <div className={`w-full md:w-48 h-36 rounded-2xl bg-gradient-to-br ${getGradientForId(metrics?.resume_target?.course_id || "fallback")} flex items-center justify-center shrink-0`}>
            <PlayCircle className="w-14 h-14 text-slate-400/60" />
          </div>

          <div className="flex-1 w-full">
            <p className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-1">
              Pick up where you left off
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
              {metrics?.resume_target?.course_title || "Ready to start learning?"}
            </h2>
            <div className="flex items-center justify-between text-sm font-medium text-slate-500 mb-2">
              <span>
                {metrics?.resume_target?.lesson_title
                  ? `Up Next: ${metrics.resume_target.lesson_title}`
                  : "Explore the catalog to enroll in a course!"}
              </span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (metrics?.resume_target?.course_id) {
                // Route exactly to the course they were watching
                onContinueLearning?.(metrics.resume_target.course_id);
              }
            }}
            disabled={!metrics?.resume_target}
            className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center shrink-0 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlayCircle className="w-8 h-8 text-white" />
          </motion.button>
        </div>
      </motion.div>

      {/* 🚀 DYNAMIC ENROLLED COURSES GRID */}
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-12 mb-6">Your Learning Path</h2>

      {enrolledCourses.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-white/60 rounded-3xl bg-white/20">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900">No active enrollments</h3>
          <p className="text-slate-500 font-medium mt-2">Head over to the Catalog to find your first course!</p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants} initial="hidden" animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {enrolledCourses.map((course) => {
            const IconComponent = getCategoryIcon(course.category);
            return (
              <motion.div
                key={course.id}
                variants={cardVariants}
                onClick={() => onContinueLearning?.(course.id)}
                className="group cursor-pointer bg-white/60 backdrop-blur-2xl border border-purple-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.12)] rounded-[2rem] overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-1.5 relative"
              >
                {/* Ambient Glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-purple-50/50 to-transparent pointer-events-none z-0" />

                {/* Cinematic Thumbnail */}
                <div className="relative w-full aspect-video overflow-hidden bg-slate-100 flex items-center justify-center z-10">
                  <div className="absolute inset-0 bg-slate-900/5 z-10 group-hover:bg-transparent transition-colors duration-500" />

                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover transform transition-transform duration-[1.5s] ease-out group-hover:scale-110"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradientForId(course.id)} flex items-center justify-center transform transition-transform duration-[1.5s] ease-out group-hover:scale-110`}>
                      <IconComponent className="w-16 h-16 text-slate-900/10" />
                    </div>
                  )}

                  {/* Frosted iOS Badges */}
                  <div className="absolute top-4 left-4 z-20">
                    <span className="bg-black/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wide px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                      <IconComponent size={12} className="text-white/80" />
                      {course.category || "General"}
                    </span>
                  </div>

                  <div className="absolute top-4 right-4 z-20">
                    <span className="bg-black/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                      <Clock size={12} className="text-white/80" />
                      {course.duration || "Self-paced"}
                    </span>
                  </div>
                </div>

                <div className="p-7 flex-1 flex flex-col z-10 relative">
                  {/* Verified Creator ID Mask */}
                  <div className="flex items-center gap-2 mb-3">
                    <BadgeCheck size={16} className="text-blue-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Verified Creator
                    </span>
                  </div>

                  <h3 className="text-xl font-bold tracking-tight text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
                    {course.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed line-clamp-2">
                    {course.description}
                  </p>

                  <div className="mt-auto pt-6 flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-600 uppercase tracking-wider bg-purple-50 px-3 py-1.5 rounded-full">
                      Purchased
                    </span>

                    {/* Glowing Action Button */}
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600 text-sm font-bold text-white shadow-md hover:bg-purple-700 transition-colors duration-300">
                      Resume
                      <PlayCircle size={16} className="text-white/90" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </>
  )
}

/* ════════════════════════════════════════════════════
   🚀 WIRED: INSTRUCTOR DASHBOARD
   ════════════════════════════════════════════════════ */



export function InstructorDashboard({
  onCreateCourse,
  onCourseClick,
}: {
  onCreateCourse?: () => void
  onCourseClick?: (courseId: string) => void
}) {
  const [myCourses, setMyCourses] = useState<Course[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)




  // 🚀 SPRINT 5: MODERATION STATE
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null)
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const api = useApi();
  const { user } = useUser();
  const { showNotification } = useNotification(); // 🚀 God Mode Access

  useEffect(() => {
    const fetchInstructorData = async () => {
      if (!user?.id) return;
      try {
        setIsLoadingCourses(true);

        const courseRes = await api.get('/api/v1/courses');
        let allCourses: Course[] = [];
        if (courseRes.data && Array.isArray(courseRes.data.courses)) {
          allCourses = courseRes.data.courses;
        }
        setMyCourses(allCourses.filter((c) => c.instructor_id === user.id));

      } catch (error) {
        console.error("Failed to fetch instructor dashboard data:", error);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchInstructorData();
  }, [api, user?.id]);



  // 🚀 SPRINT 5: SOFT DELETE (UNPUBLISH) ENGINE
  const handleToggleStatus = async (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    if (course.status === "Banned") {
      showNotification({
        type: 'error',
        title: 'Action Blocked',
        message: 'This course violates platform policy and has been locked by Admins.',
      });
      return;
    }

    const newStatus = course.status === "Published" ? "Archived" : "Published";
    setIsTogglingStatus(course.id);

    try {
      const res = await api.put(`/api/v1/dashboard/instructor/courses/${course.id}/status`, { new_status: newStatus });
      if (res.data?.status === "success") {
        setMyCourses(prev => prev.map(c => c.id === course.id ? { ...c, status: newStatus } : c));

        showNotification({
          type: newStatus === "Published" ? 'success' : 'info',
          title: newStatus === "Published" ? 'Course Published Live!' : 'Course Archived',
          message: newStatus === "Published"
            ? 'Students can now find and enroll in your course.'
            : 'Course hidden from the catalog. Existing students still have access.',
        });
      }
    } catch (error: any) {
      showNotification({
        type: 'error',
        title: 'Action Failed',
        message: error.response?.data?.detail || "Could not update course status.",
      });
    } finally {
      setIsTogglingStatus(null);
    }
  };

  // 🚀 SPRINT 5: HARD DELETE (THE NUKE) ENGINE
  const handleHardDelete = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);

    try {
      const res = await api.delete(`/api/v1/dashboard/instructor/courses/${courseToDelete.id}`);
      if (res.data?.status === "success") {
        setMyCourses(prev => prev.filter(c => c.id !== courseToDelete.id));
        showNotification({
          type: 'success',
          title: 'Course Destroyed',
          message: 'The course and all its contents have been permanently deleted.',
        });
        setCourseToDelete(null);
        setDeleteConfirmText("");
      }
    } catch (error: any) {
      // Catch the Zero-Student Safety Lock Error
      showNotification({
        type: 'error',
        title: 'Deletion Blocked',
        message: error.response?.data?.detail || "Could not delete course.",
        duration: 8000
      });
      setCourseToDelete(null);
      setDeleteConfirmText("");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalEarnings = myCourses.reduce((sum, c) => sum + (c.price || 0), 0)
  const totalStudents = 0;
  const publishedCount = myCourses.filter((c) => c.status === "Published").length

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8"
      >
        {/* ... (Keep your existing Stats Header exactly as it was) ... */}
        {[
          { label: "Total Earnings", value: `${(totalEarnings / 100000).toFixed(1)}L`, prefix: true, icon: IndianRupee },
          { label: "Active Courses", value: String(publishedCount), icon: BookOpen },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-8 flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <stat.icon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight text-slate-900 flex items-center">
                {"prefix" in stat && <IndianRupee className="w-6 h-6 mr-0.5 inline" />}
                {stat.value}
              </p>
              <p className="text-base font-medium text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8"
      >
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 md:p-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Your Courses</h2>
            <button onClick={() => onCreateCourse?.()} className="rounded-full bg-slate-900 text-white px-6 py-2.5 text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer">
              Create New Course
            </button>
          </div>

          <div className="space-y-4">
            {isLoadingCourses ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-slate-500 text-sm font-medium">Syncing courses...</p>
              </div>
            ) : myCourses.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-white/60 rounded-2xl">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900">No courses yet</h3>
                <p className="text-slate-500 text-sm mt-1">Click the button above to create your first course!</p>
              </div>
            ) : (
              myCourses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => onCourseClick?.(course.id)}
                  className="flex items-center justify-between bg-white/50 backdrop-blur-xl border border-white/60 rounded-2xl px-6 py-5 cursor-pointer hover:bg-white/70 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {course.title}
                      {course.status === "Banned" && (
                        <span className="bg-red-100 text-red-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center">
                          <AlertTriangle size={12} className="mr-1" /> Suspended
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full 
                        ${course.status === "Published" ? "text-emerald-600 bg-emerald-50" :
                          course.status === "Banned" ? "text-rose-600 bg-rose-50" : "text-amber-600 bg-amber-50"}`}>
                        {course.status || "Draft"}
                      </span>
                      <span className="text-sm font-medium text-slate-500 flex items-center">
                        <IndianRupee size={14} className="mr-0.5" />
                        {(course.price || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* 🚀 Moderation Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleToggleStatus(course, e)}
                      disabled={isTogglingStatus === course.id}
                      title={course.status === "Published" ? "Unpublish Course" : "Publish Course"}
                      className={`w-9 h-9 rounded-xl bg-white/70 border border-white/60 flex items-center justify-center transition-colors cursor-pointer
                        ${course.status === "Published" ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"}
                        disabled:opacity-50`}
                    >
                      {isTogglingStatus === course.id ? <Loader2 size={16} className="animate-spin" /> :
                        course.status === "Published" ? <Globe size={16} /> : <Lock size={16} />}
                    </button>

                    <button className="w-9 h-9 rounded-xl bg-white/70 border border-white/60 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer">
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCourseToDelete(course);
                      }}
                      className="w-9 h-9 rounded-xl bg-white/70 border border-white/60 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* ... (Keep your Instructor Inbox perfectly intact below this) ... */}
      {/* (Omitted here for brevity, keep the same code from the previous working version) */}

      {/* 🚀 SPRINT 5: THE RED ZONE MODAL */}
      <AnimatePresence>
        {courseToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                setCourseToDelete(null);
                setDeleteConfirmText("");
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-[0_16px_48px_rgb(0,0,0,0.12)] p-8 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-6 border border-red-100">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">Delete Course?</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                You are about to permanently destroy <strong className="text-slate-900">{courseToDelete.title}</strong>.
                This will wipe all modules, lessons, and data. <br /><br />
                If this course has <strong className="text-red-600">active students</strong>, the database Safety Lock will block this action. Consider Unpublishing it instead.
              </p>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Type <span className="text-red-600 select-all font-mono">{courseToDelete.title}</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  placeholder="Course title..."
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setCourseToDelete(null);
                    setDeleteConfirmText("");
                  }}
                  className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleHardDelete}
                  disabled={deleteConfirmText !== courseToDelete.title || isDeleting}
                  className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Permanently Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}