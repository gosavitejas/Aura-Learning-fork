"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useApi } from "@/hooks/useApi"
import { useUser } from "@clerk/clerk-react" 
import {
  ArrowLeft,
  Clock,
  BookOpen,
  Users,
  Star,
  PlayCircle,
  IndianRupee,
  ThumbsUp,
  BrainCircuit,
  Code,
  Palette,
  TrendingUp,
  Loader2,
  Eye,
  BadgeCheck,
  Lock,
  ShieldCheck,
  MessageSquare // 🚀 Added for the empty state
} from "lucide-react"

// Make TypeScript aware of the injected Razorpay object
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Lesson {
  id: number;
  title: string;
  video_url: string;
  duration: string;
}

interface Module {
  id: number;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string; 
  title: string;
  description: string;
  instructor_id: string;
  price?: number;
  category?: string;
  thumbnail_url?: string;
  duration?: string;
  modules: Module[];
}

// 🚀 Enforcing the paywall tab structure
type TabType = "syllabus" | "discussion"

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

// DYNAMIC SCRIPT INJECTOR
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function CourseDetailsView({
  courseId,
  onBack,
  onStartCourse,
}: {
  courseId: string | number | null 
  onBack: () => void
  onStartCourse?: () => void
}) {
  const [activeTab, setActiveTab] = useState<TabType>("syllabus")
  const [course, setCourse] = useState<Course | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  
  const api = useApi();
  const { user } = useUser(); 

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      try {
        setIsLoading(true);
        const response = await api.get(`/api/v1/courses/${courseId}`); 
        if (response.data && response.data.status === 'success') {
          setCourse(response.data.course);
        } else {
          setCourse(null);
        }
      } catch (error) {
        console.error("Failed to fetch course details:", error);
        setCourse(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourse();
  }, [api, courseId]);

  const handleBuyNow = async () => {
    if (!courseId) return;

    try {
      setIsProcessingPayment(true);
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        alert("Payment gateway failed to load. Please check your internet connection.");
        setIsProcessingPayment(false);
        return;
      }

      const orderResponse = await api.post("/api/v1/payments/create-order", {
        course_id: String(courseId),
      });

      if (orderResponse.data?.status !== "success") throw new Error("Failed to create order");
      const { order_id, amount, currency, key_id } = orderResponse.data;

      const options = {
        key: key_id,
        amount: amount.toString(),
        currency: currency,
        name: "Aura LMS",
        description: `Enrollment for ${course?.title}`,
        order_id: order_id,
        handler: async function (response: any) {
          try {
            const verifyRes = await api.post("/api/v1/payments/verify", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data?.status === "success") {
              if (onStartCourse) onStartCourse();
            }
          } catch (verifyError: any) {
            console.error("Verification error:", verifyError);
            alert("Payment verification failed. If money was deducted, please contact support.");
          }
        },
        prefill: {
          name: user?.fullName || "",
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        theme: { color: "#0F172A" },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        alert(`Payment failed: ${response.error.description}`);
      });
      paymentObject.open();

    } catch (error: any) {
      console.error("Checkout Error:", error);
      alert(error.response?.data?.detail || "An error occurred during checkout.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-24 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading course curriculum...</p>
      </main>
    )
  }

  if (!course) {
    return (
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-24 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Course Not Found</h2>
        <button onClick={onBack} className="text-blue-600 hover:underline">Return to Catalog</button>
      </main>
    )
  }

  const CourseIcon = getCategoryIcon(course.category);
  const totalLessons = course.modules?.reduce((acc, mod) => acc + mod.lessons.length, 0) || 0;
  const isCreator = user?.id === course.instructor_id;

  return (
    <main className="max-w-7xl mx-auto px-6 pt-32 pb-32 relative">
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer mb-8"
      >
        <ArrowLeft size={18} />
        Back to Catalog
      </motion.button>

      {/* THE CINEMATIC SPLIT HERO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
        
        {/* LEFT: Cinematic Thumbnail */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="lg:col-span-7"
        >
          <div className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden bg-slate-100 group shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-white/60">
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover transform transition-transform duration-[2s] ease-out group-hover:scale-105" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${getGradientForId(course.id)} flex items-center justify-center transform transition-transform duration-[2s] ease-out group-hover:scale-105`}>
                <CourseIcon className="w-24 h-24 text-slate-900/10" />
              </div>
            )}
            <div className="absolute top-6 left-6 z-20 flex gap-3">
              <span className="bg-black/30 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wide px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                <CourseIcon size={14} className="text-white/90" />
                {course.category || "General"}
              </span>
              <span className="bg-black/30 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wide px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                <Clock size={14} className="text-white/90" />
                {course.duration || "Self-paced"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* RIGHT: Editorial Pitch & Checkout */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-5 flex flex-col justify-center"
        >
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 text-balance leading-[1.1] mb-5">
            {course.title}
          </h1>
          <p className="text-lg font-medium text-slate-500 leading-relaxed mb-8">
            {course.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 bg-white/50 backdrop-blur-xl border border-white/60 shadow-sm rounded-2xl px-5 py-4 w-fit mb-8">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <BookOpen size={16} className="text-blue-500" />
              {totalLessons} Lessons
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Users size={16} className="text-purple-500" />
              Beginner Friendly
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <div className="flex items-center gap-1 text-sm font-bold text-slate-700">
              <Star size={16} className="text-amber-400 fill-amber-400" />
              5.0
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.06)] rounded-[2rem] p-8">
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-200/60">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 border border-white flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-lg font-bold text-slate-600">
                  {course.instructor_id ? course.instructor_id.substring(0, 2).toUpperCase() : "IN"}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-base font-bold text-slate-900">
                    {isCreator ? "You (Creator)" : "Expert Instructor"}
                  </p>
                  <BadgeCheck size={18} className="text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-500">Aura Verified Creator</p>
              </div>
            </div>

            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Investment</p>
                <span className="text-4xl font-black text-slate-900 flex items-center tracking-tight">
                  <IndianRupee size={28} className="-mr-1 text-slate-700" />
                  {(course.price || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isProcessingPayment}
              onClick={() => {
                if (isCreator) onStartCourse?.(); 
                else handleBuyNow();
              }}
              className={`relative overflow-hidden w-full rounded-2xl py-4 text-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-80 disabled:cursor-not-allowed ${
                isCreator 
                  ? "bg-purple-600 text-white shadow-[0_0_40px_rgba(147,51,234,0.3)] hover:bg-purple-700"
                  : "bg-slate-900 text-white shadow-[0_10px_40px_rgba(15,23,42,0.3)] hover:bg-slate-800 border border-slate-700 hover:shadow-[0_20px_60px_rgba(15,23,42,0.4)]"
              }`}
            >
              {!isCreator && !isProcessingPayment && (
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent hover:animate-[shimmer_1.5s_infinite]" />
              )}
              
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isProcessingPayment ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Initializing Secure Checkout...</>
                ) : isCreator ? (
                  <>Go to Course (Preview) <Eye size={18} /></>
                ) : (
                  <>Enroll Now</>
                )}
              </span>
            </motion.button>
            
            {!isCreator && (
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400">
                <Lock size={12} />
                Secure one-click checkout via Razorpay
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* iOS SEGMENTED CONTROLS */}
      <div className="relative flex items-center p-1.5 bg-white/40 backdrop-blur-xl rounded-full w-fit mb-8 border border-white/60 shadow-sm mx-auto lg:mx-0">
        {(
          [
            { key: "syllabus", label: "Syllabus" },
            { key: "discussion", label: "Student Reviews" }, // 🚀 Renamed for Sales Page
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-8 py-2.5 text-sm font-bold rounded-full transition-all cursor-pointer z-10 ${
              activeTab === tab.key ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-white rounded-full shadow-sm -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "syllabus" && (
          <motion.div key="syllabus" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <SyllabusTab modules={course.modules} />
          </motion.div>
        )}
        {activeTab === "discussion" && (
          <motion.div key="discussion" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            {/* 🚀 Pass the courseId so it can fetch the Social Proof feed */}
            <DiscussionTab courseId={String(courseId)} /> 
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

function SyllabusTab({ modules }: { modules: Module[] }) {
  if (!modules || modules.length === 0) {
    return (
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-16 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-200/50 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Curriculum Pending</h2>
        <p className="text-slate-500 font-medium">The instructor is currently crafting the modules for this course.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8 md:p-12">
      <div className="flex items-center gap-3 mb-10">
        <ShieldCheck className="w-8 h-8 text-blue-500" />
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Course Syllabus
        </h2>
      </div>

      <div className="space-y-0">
        {modules.map((mod, i) => (
          <div key={mod.id} className="flex gap-6 group">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-white shadow-sm border border-slate-100 text-slate-400 group-hover:text-blue-500 group-hover:border-blue-100 transition-colors">
                <span className="font-bold text-sm">{i + 1}</span>
              </div>
              {i < modules.length - 1 && (
                <div className="w-[2px] flex-1 bg-gradient-to-b from-slate-200 to-slate-100 min-h-[48px] my-2 rounded-full" />
              )}
            </div>

            <div className="pb-12 w-full">
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1.5 mt-1">
                Module {i + 1}
              </p>
              <h3 className="text-xl font-bold text-slate-900 mb-5">{mod.title}</h3>
              
              <div className="space-y-3">
                {mod.lessons.map((lesson) => (
                  <div key={lesson.id} className="flex items-center justify-between bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <PlayCircle size={14} className="text-blue-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{lesson.title}</span>
                    </div>
                  </div>
                ))}
                
                {mod.lessons.length === 0 && (
                  <p className="text-sm text-slate-400 italic bg-white/30 rounded-xl p-4 border border-white/40">No video lessons uploaded yet.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 🚀 UPGRADED: The Read-Only "Social Proof" Tab
function DiscussionTab({ courseId }: { courseId: string }) {
  const [comments, setComments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const api = useApi()

  useEffect(() => {
    const fetchSocialProof = async () => {
      try {
        setIsLoading(true)
        // Hit the new backend endpoint we just created
        const response = await api.get(`/api/v1/courses/${courseId}/comments/social`)
        if (response.data?.status === 'success') {
          setComments(response.data.comments)
        }
      } catch (error) {
        console.error("Failed to fetch social proof:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSocialProof()
  }, [api, courseId])

  return (
    <div className="max-w-4xl bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8 md:p-12">
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Student Feedback
        </h2>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-white/60 rounded-3xl bg-white/30">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-bold text-slate-900">No feedback yet</p>
            <p className="text-slate-500 font-medium">Be the first to enroll and start the discussion!</p>
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-6 py-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-white shadow-sm ${c.author_role === 'instructor' ? 'bg-gradient-to-br from-amber-100 to-orange-100' : 'bg-gradient-to-br from-slate-200 to-slate-300'}`}>
                    <span className={`text-xs font-bold ${c.author_role === 'instructor' ? 'text-amber-700' : 'text-slate-600'} uppercase`}>
                      {c.author_name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      {c.author_name}
                      {c.author_role === 'instructor' && <ShieldCheck size={14} className="text-amber-500" />}
                    </p>
                    <p className="text-xs font-medium text-slate-400">
                      {new Date(c.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-700 leading-relaxed mb-4">
                {c.content}
              </p>
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50/80 px-3 py-1.5 rounded-full border border-blue-100 w-fit">
                <ThumbsUp size={14} className="fill-blue-600" />
                {c.likes_count} found this helpful
              </div>
            </div>
          ))
        )}
      </div>
      
      {comments.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm font-bold text-slate-400 flex items-center justify-center gap-1.5">
            <Lock size={14} />
            Enroll to join the discussion
          </p>
        </div>
      )}
    </div>
  )
}