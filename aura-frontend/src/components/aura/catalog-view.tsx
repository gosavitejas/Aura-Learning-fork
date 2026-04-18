"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useUser } from "@clerk/clerk-react" // 🚀 Role Checking
import { useApi } from "@/hooks/useApi"
import { useNotification } from "@/contexts/NotificationContext" // 🚀 God Mode Notifications
import { useNavigate } from "react-router-dom"
import {
  Search,
  BookOpen,
  Clock,
  TrendingUp,
  Code,
  Palette,
  BrainCircuit,
  IndianRupee,
  Loader2,
  BadgeCheck,
  ArrowRight,
  PlayCircle,
  ShieldAlert, // 🚀 Admin Icons
  Trash2,
  AlertTriangle
} from "lucide-react"

interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  price: number;
  thumbnail_url?: string | null;
  category?: string;
  duration?: string;
  is_enrolled?: boolean;
  status?: string; // 🚀 Need this to show Banned/Published status to Admins
}

// ... (Keep your existing categories, getCategoryIcon, getGradientForId, and variants exactly as they were) ...
const categories = [
  { label: "All", icon: null },
  { label: "AI", icon: BrainCircuit },
  { label: "Development", icon: Code },
  { label: "Design", icon: Palette },
  { label: "Business", icon: TrendingUp },
]

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
  const gradients = [
    "from-indigo-100 to-purple-100",
    "from-rose-100 to-orange-100",
    "from-sky-100 to-cyan-100",
    "from-emerald-100 to-teal-100",
    "from-violet-100 to-fuchsia-100",
  ];
  const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export function CatalogView() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 🚀 ADMIN MODERATION STATE
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null)
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  const api = useApi();
  const navigate = useNavigate()
  const { user } = useUser();
  const { showNotification } = useNotification();

  // 🚀 Determine if current user is an Admin
  const isAdmin = user?.publicMetadata?.role === "admin";

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        const endpoint = '/api/v1/courses';
        const response = await api.get(endpoint);

        if (response.data && Array.isArray(response.data.courses)) {
          setCourses(response.data.courses);
        } else if (Array.isArray(response.data)) {
          setCourses(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [api, isAdmin]);

  // 🚀 ADMIN ACTION: Suspend Course (Ban)
  const handleSuspendCourse = async (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessingId(course.id);

    // Toggle ban status
    const newStatus = course.status === "Banned" ? "Published" : "Banned";

    try {
      // NOTE: We need to hit a generic admin status route, or reuse the instructor one if backend allows
      const res = await api.put(`/api/v1/dashboard/instructor/courses/${course.id}/status`, { new_status: newStatus });

      if (res.data?.status === "success") {
        setCourses(prev => prev.map(c => c.id === course.id ? { ...c, status: newStatus } : c));
        showNotification({
          type: newStatus === "Banned" ? 'error' : 'success',
          title: newStatus === "Banned" ? 'Course Suspended' : 'Course Reinstated',
          message: newStatus === "Banned"
            ? 'The course is locked. The instructor cannot republish it.'
            : 'The course has been unbanned and published.',
        });
      }
    } catch (error: any) {
      showNotification({
        type: 'error',
        title: 'Action Failed',
        message: error.response?.data?.detail || "Could not update course status.",
      });
    } finally {
      setIsProcessingId(null);
    }
  };

  // 🚀 ADMIN ACTION: Hard Delete
  const handleHardDelete = async () => {
    if (!courseToDelete) return;
    setIsProcessingId(courseToDelete.id);

    try {
      const res = await api.delete(`/api/v1/dashboard/instructor/courses/${courseToDelete.id}`);
      if (res.data?.status === "success") {
        setCourses(prev => prev.filter(c => c.id !== courseToDelete.id));
        showNotification({
          type: 'success',
          title: 'Course Annihilated',
          message: 'Admin Override: Course permanently deleted.',
        });
      }
    } catch (error: any) {
      showNotification({
        type: 'error',
        title: 'Deletion Blocked',
        message: error.response?.data?.detail || "Cannot delete course with active students.",
        duration: 8000
      });
    } finally {
      setIsProcessingId(null);
      setCourseToDelete(null);
      setDeleteConfirmText("");
    }
  };

  const safeCourses = Array.isArray(courses) ? courses : [];
  const filtered = safeCourses.filter((c) => {
    const titleMatch = c.title?.toLowerCase().includes(search.toLowerCase());
    const descMatch = c.description?.toLowerCase().includes(search.toLowerCase());
    const catMatch = activeCategory === "All" || c.category === activeCategory;
    return (titleMatch || descMatch) && catMatch;
  });

  return (
    <main className="max-w-6xl mx-auto px-6 pt-32 pb-24">
      {/* ... (Keep Header and Search Bar exactly as they were) ... */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
          {isAdmin ? "Global Course Directory (Admin)" : "Explore Courses"}
        </h1>
        <p className="mt-2 text-lg font-medium text-slate-500">
          {isAdmin ? "Manage and moderate all platform content" : "Discover your next learning adventure"}
        </p>
      </motion.div>

      {/* ... (Search & Filter UI remains identical) ... */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="mt-8">
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl px-5 py-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses, topics, or instructors..." className="flex-1 bg-transparent text-lg font-medium text-slate-900 placeholder:text-slate-400 outline-none" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} className="flex flex-wrap items-center gap-2 mt-5">
        {categories.map((cat) => (
          <button key={cat.label} onClick={() => setActiveCategory(cat.label)} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full transition-all cursor-pointer ${activeCategory === cat.label ? "bg-slate-900 text-white shadow-lg" : "bg-white/50 backdrop-blur-xl border border-white/60 text-slate-600 hover:bg-white/70"}`}>
            {cat.icon && <cat.icon size={15} />} {cat.label}
          </button>
        ))}
      </motion.div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-slate-500 font-medium">Syncing with Aura Database...</p>
        </div>
      ) : (
        <>
          <motion.div variants={containerVariants} initial="hidden" animate="visible" key={activeCategory + search} className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            {filtered.map((course) => {
              const IconComponent = getCategoryIcon(course.category);
              const isEnrolled = !!course.is_enrolled;

              return (
                <motion.div
                  key={course.id}
                  variants={cardVariants}
                  onClick={() => {
                    if (!isAdmin) {
                      navigate(isEnrolled ? `/learn/${course.id}` : `/courses/${course.id}`)
                    }
                  }}
                  className={`group ${!isAdmin ? 'cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_30px_60px_rgba(0,0,0,0.12)]' : ''} bg-white/60 backdrop-blur-2xl border ${isEnrolled ? "border-purple-200/50" : course.status === 'Banned' ? "border-red-500/50" : "border-white/80"} shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden flex flex-col transition-all duration-500 relative`}
                >

                  {/* 🚀 ADMIN CONTROLS (Absolute Top Overlay) */}
                  {isAdmin && (
                    <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-center z-50 bg-gradient-to-b from-slate-900/80 to-transparent">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${course.status === 'Banned' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-200'}`}>
                        {course.status || 'Published'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleSuspendCourse(course, e)}
                          disabled={isProcessingId === course.id}
                          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-orange-500 transition-colors cursor-pointer"
                          title={course.status === "Banned" ? "Unban Course" : "Suspend Course"}
                        >
                          {isProcessingId === course.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setCourseToDelete(course); }}
                          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-600 transition-colors cursor-pointer"
                          title="Force Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ... (Rest of the Course Card remains exactly the same) ... */}
                  <div className="relative w-full aspect-video overflow-hidden bg-slate-100 flex items-center justify-center z-10">
                    <div className={`absolute inset-0 z-10 transition-colors duration-500 ${!isAdmin ? 'bg-slate-900/5 group-hover:bg-transparent' : 'bg-transparent'}`} />

                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className={`w-full h-full object-cover transform transition-transform duration-[1.5s] ease-out ${!isAdmin ? 'group-hover:scale-110' : ''}`} />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${getGradientForId(course.id)} flex items-center justify-center transform transition-transform duration-[1.5s] ease-out ${!isAdmin ? 'group-hover:scale-110' : ''}`}>
                        <IconComponent className="w-16 h-16 text-slate-900/10" />
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 z-20">
                      <span className="bg-black/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wide px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                        <IconComponent size={12} className="text-white/80" />
                        {course.category || "General"}
                      </span>
                    </div>
                  </div>

                  <div className="p-7 flex-1 flex flex-col z-10 relative">
                    <h3 className={`text-xl font-bold tracking-tight text-slate-900 line-clamp-2 transition-colors duration-300 ${!isAdmin ? 'group-hover:text-blue-600' : ''}`}>
                      {course.title}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed line-clamp-2">
                      {course.description}
                    </p>

                    <div className="mt-auto pt-6 flex items-center justify-between">
                      <span className="text-xl font-black text-slate-900 flex items-center tracking-tight">
                        <IndianRupee size={18} className="-mr-0.5 text-slate-500" />
                        {(course.price || 0).toLocaleString("en-IN")}
                      </span>

                      {!isAdmin && (
                        isEnrolled ? (
                          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600 text-sm font-bold text-white shadow-md hover:bg-purple-700 transition-colors duration-300">
                            Resume <PlayCircle size={16} className="text-white/90" />
                          </button>
                        ) : (
                          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-50/0 text-sm font-bold text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-700 transition-all duration-300">
                            View Details <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform duration-300" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}

      {/* 🚀 ADMIN: THE RED ZONE MODAL */}
      <AnimatePresence>
        {courseToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setCourseToDelete(null); setDeleteConfirmText(""); }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-[0_16px_48px_rgb(0,0,0,0.12)] p-8 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-6 border border-red-100">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">Admin Override: Delete Course?</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                You are about to permanently destroy <strong className="text-slate-900">{courseToDelete.title}</strong>.
                This will wipe all modules, lessons, and data. If students are enrolled, this action will be blocked by the Safety Lock. Consider Suspending the course instead.
              </p>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Type <span className="text-red-600 select-all font-mono">{courseToDelete.title}</span> to confirm
                </label>
                <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" placeholder="Course title..." />
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => { setCourseToDelete(null); setDeleteConfirmText(""); }} className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleHardDelete} disabled={deleteConfirmText !== courseToDelete.title || isProcessingId !== null} className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer">
                  {isProcessingId === courseToDelete.id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Permanently Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}
