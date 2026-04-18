"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useApi } from "@/hooks/useApi"
import { useUser } from "@clerk/clerk-react"
import { useNavigate, useParams } from "react-router-dom"
import {
  PlayCircle,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  StickyNote,
  Send,
  ThumbsUp,
  Save,
  CheckCircle2,
  Loader2,
  Video,
  Trash2,
  Reply,
  ShieldCheck
} from "lucide-react"
import { AuraVideoPlayer } from "./aura-video-player"

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
  modules: Module[];
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
}


type TabType = "quiz" | "discussion" | "notes"

export function LearningModeView() {
  const [activeTab, setActiveTab] = useState<TabType>("quiz")
  const [course, setCourse] = useState<Course | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const api = useApi()
  const navigate = useNavigate()
  const { courseId } = useParams()

  // 1. Fetch Curriculum
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      try {
        setIsLoading(true);
        const response = await api.get(`/api/v1/courses/${courseId}`);
        if (response.data && response.data.status === 'success') {
          const fetchedCourse = response.data.course;
          setCourse(fetchedCourse);

          if (fetchedCourse.modules?.length > 0 && fetchedCourse.modules[0].lessons?.length > 0) {
            setActiveLesson(fetchedCourse.modules[0].lessons[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch curriculum:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [api, courseId]);

  // 🚀 2. THE TELEMETRY HEARTBEAT ENGINE
  const isVideoPlayingRef = useRef(false);

  useEffect(() => {
    // We only ping if a lesson is currently selected and we know the course
    if (!activeLesson || !courseId) return;

    const pingHeartbeat = async () => {
      // 🔒 Only send heartbeat if the video is actively playing
      if (!isVideoPlayingRef.current) return;

      try {
        await api.post('/api/v1/telemetry/heartbeat', {
          course_id: String(courseId),
          lesson_id: activeLesson.id,
          watch_time_increment_seconds: 15 // Must match the interval below
        });
        // Silent success - no UI update needed
      } catch (error) {
        console.error("Telemetry heartbeat failed:", error);
      }
    };

    // Set up the recurring 15-second heartbeat
    const intervalId = setInterval(pingHeartbeat, 15000);

    // Cleanup: Destroy the interval if the user clicks a different lesson or leaves the page
    return () => clearInterval(intervalId);
  }, [api, courseId, activeLesson]); // Re-runs when activeLesson changes

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-6 pt-32 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Booting up Learning Engine...</p>
      </main>
    )
  }

  if (!course) {
    return (
      <main className="max-w-7xl mx-auto px-6 pt-32 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Course Not Found</h2>
        <button onClick={() => navigate("/dashboard")} className="text-blue-600 hover:underline">Return to Dashboard</button>
      </main>
    )
  }


  return (
    <main className="max-w-7xl mx-auto px-6 pt-28 pb-24">
      <motion.button
        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer mb-6"
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </motion.button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* 🚀 THE CUSTOM AURA VIDEO PLAYER */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full relative z-10"
          >
            {activeLesson?.video_url ? (
              <AuraVideoPlayer
                url={activeLesson.video_url}
                title={activeLesson.title}
                onPlay={() => { isVideoPlayingRef.current = true }}
                onPause={() => { isVideoPlayingRef.current = false }}
                onEnded={() => {
                  isVideoPlayingRef.current = false
                  console.log("Lesson Complete! (Future Sprint: Auto-advance to next video)");
                }}
              />
            ) : (
              <div className="aspect-video rounded-3xl bg-slate-900 backdrop-blur-md flex flex-col items-center justify-center shadow-[0_16px_48px_rgb(0,0,0,0.12)] border border-slate-800">
                <Video className="w-16 h-16 text-slate-700 mb-4" />
                <p className="text-white font-semibold">No Video Source</p>
                <p className="text-slate-400 text-sm mt-1">The instructor hasn't provided a valid URL for this lesson.</p>
              </div>
            )}
          </motion.div>

          <div className="mb-2">
            <h1 className="text-2xl font-bold text-slate-900">{activeLesson?.title || "Select a lesson"}</h1>
            <p className="text-slate-500 text-sm mt-1">{course.title}</p>
          </div>

          <div className="flex items-center gap-2">
            {([
              { key: "quiz" as const, label: "AI Quiz", icon: Sparkles },
              { key: "discussion" as const, label: "Discussion", icon: MessageSquare },
              { key: "notes" as const, label: "Notes", icon: StickyNote },
            ]).map((tab) => (
              <button
                key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full transition-all cursor-pointer ${activeTab === tab.key ? "bg-slate-900 text-white shadow-lg" : "bg-white/50 backdrop-blur-xl border border-white/60 text-slate-600 hover:bg-white/70"
                  }`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "quiz" && <motion.div key="quiz" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
              {/* Pass the courseId down to the QuizPanel */}
              <QuizPanel courseId={String(course.id)} />
            </motion.div>}
            {/* Replace your existing discussion tab line with this: */}
            {activeTab === "discussion" && (
              <motion.div key="discussion" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                {activeLesson && courseId ? (
                  <DiscussionPanel courseId={String(courseId)} lessonId={activeLesson.id} />
                ) : (
                  <div className="p-8 text-center text-slate-500">Select a lesson to view the discussion.</div>
                )}
              </motion.div>
            )}
            {activeTab === "notes" && (
              <motion.div key="notes" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                {/* 🚀 Safely pass the active context down */}
                {activeLesson && courseId ? (
                  <NotesPanel courseId={String(courseId)} lessonId={activeLesson.id} />
                ) : (
                  <div className="p-8 text-center text-slate-500">Select a lesson to take notes.</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} className="col-span-1">
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl h-[600px] overflow-y-auto hide-scrollbar flex flex-col">
            <div className="p-6">
              <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-5">Course Modules</h3>
              <div className="space-y-6">

                {course.modules?.map((mod) => (
                  <div key={mod.id}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">{mod.title}</p>
                    <div className="space-y-2">

                      {mod.lessons?.map((lesson) => {
                        const isActive = activeLesson?.id === lesson.id;
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => setActiveLesson(lesson)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center gap-3 ${isActive
                              ? "bg-gradient-to-r from-blue-50 to-purple-50 ring-2 ring-purple-500 text-slate-900 shadow-sm"
                              : "bg-white/50 border border-white/60 text-slate-600 hover:bg-white/70"
                              }`}
                          >
                            {isActive ? (
                              <PlayCircle size={16} className="text-purple-500 shrink-0" />
                            ) : (
                              <PlayCircle size={16} className="text-slate-400 shrink-0" />
                            )}
                            <span className="flex-1 truncate">{lesson.title}</span>

                            {lesson.duration && lesson.duration !== "0:00" && lesson.duration !== "Self-paced" && (
                              <span className="text-[10px] font-bold text-slate-500 shrink-0 bg-slate-200/50 px-2 py-0.5 rounded-md">
                                {lesson.duration}
                              </span>
                            )}
                          </button>
                        )
                      })}

                      {(!mod.lessons || mod.lessons.length === 0) && (
                        <p className="text-xs text-slate-400 italic">No videos in this module yet.</p>
                      )}

                    </div>
                  </div>
                ))}

              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}

function QuizPanel({ courseId }: { courseId: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const api = useApi()

  async function handleGenerateQuiz() {
    try {
      setIsGenerating(true)
      const response = await api.post(`/api/v1/courses/${courseId}/generate-quiz`);

      if (response.data && response.data.status === 'success') {
        setQuestions(response.data.data.questions);
        setAnswers({});
        setSubmitted(false);
      }
    } catch (error: any) {
      console.error("Failed to generate quiz:", error);
      alert(error.response?.data?.detail || "Failed to generate quiz. The AI might be taking a coffee break.");
    } finally {
      setIsGenerating(false)
    }
  }

  // 🚀 WIRED THE SUBMITTER TO TELEMETRY
  async function handleSubmit() {
    setSubmitted(true);

    // Calculate the score
    const finalScore = questions.filter((q) => answers[q.id] === q.correct).length;

    try {
      await api.post('/api/v1/telemetry/quiz', {
        course_id: courseId,
        score: finalScore,
        total_questions: questions.length
      });
    } catch (error) {
      console.error("Failed to log quiz score to telemetry:", error);
    }
  }

  const score = questions.filter((q) => answers[q.id] === q.correct).length

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 min-h-[300px]">
      {!isGenerating && questions.length === 0 && (
        <div className="text-center py-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
            AI Knowledge Check
          </h2>
          <p className="text-lg font-medium text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
            Test your understanding of the course material with a dynamically generated AI quiz.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleGenerateQuiz}
            className="rounded-full bg-slate-900 text-white px-8 py-4 text-base font-semibold shadow-[0_0_40px_rgba(59,130,246,0.25)] hover:bg-slate-800 transition-all cursor-pointer"
          >
            Generate Quiz Now
          </motion.button>
        </div>
      )}

      {isGenerating && (
        <div className="text-center py-16 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-6" />
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
            Aura is analyzing the curriculum...
          </h2>
          <p className="text-sm font-medium text-slate-500">
            Extracting core concepts and writing 10 unique questions. This takes about 10 seconds.
          </p>
        </div>
      )}

      {!isGenerating && questions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Knowledge Check
            </h2>
            <button
              onClick={handleGenerateQuiz}
              className="text-xs font-bold text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-full transition-colors"
            >
              Regenerate New Questions
            </button>
          </div>

          <div className="space-y-6">
            {questions.map((q, qi) => (
              <div key={q.id}>
                <p className="text-base font-bold text-slate-900 mb-3">
                  {qi + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((option, oi) => {
                    const isSelected = answers[q.id] === oi
                    const isCorrect = submitted && oi === q.correct
                    const isWrong = submitted && isSelected && oi !== q.correct

                    return (
                      <button
                        key={oi}
                        onClick={() => {
                          if (!submitted) {
                            setAnswers((prev) => ({ ...prev, [q.id]: oi }))
                          }
                        }}
                        className={`w-full text-left px-5 py-3.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${isCorrect
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                          : isWrong
                            ? "bg-red-50 border-red-300 text-red-800"
                            : isSelected
                              ? "bg-blue-50 border-blue-300 text-blue-800"
                              : "bg-white/50 border-white/60 text-slate-700 hover:bg-white/70"
                          }`}
                      >
                        <span className="font-bold mr-2">
                          {String.fromCharCode(65 + oi)}.
                        </span>
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {!submitted ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit} // 🚀 Connected!
              disabled={Object.keys(answers).length < questions.length}
              className="mt-8 rounded-full bg-slate-900 text-white px-8 py-3.5 text-base font-semibold hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit to Aura
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-white/50 backdrop-blur-xl border border-white/60 rounded-2xl p-6 text-center shadow-sm"
            >
              <p className="text-4xl font-black text-slate-900 mb-2">
                {score} / {questions.length}
              </p>
              <p className="text-base font-medium text-slate-500">
                {score === questions.length
                  ? "Perfect score! You have mastered this material."
                  : score > (questions.length / 2)
                    ? "Great job! Review the highlighted answers to perfect your knowledge."
                    : "Good effort! Consider re-reading the PDF and generating a new quiz to practice."}
              </p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}

// 🚀 THE UPGRADED DISCUSSION ENGINE
function DiscussionPanel({ courseId, lessonId }: { courseId: string; lessonId: number }) {
  const [comments, setComments] = useState<any[]>([])
  const [mainInput, setMainInput] = useState("")
  const [replyInput, setReplyInput] = useState("")

  // Tracks which thread is currently being replied to
  const [activeReplyThread, setActiveReplyThread] = useState<{ parentId: number; targetUsername?: string } | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isPosting, setIsPosting] = useState(false)

  const api = useApi()
  const { user } = useUser() // For RBAC UI checks

  // 1. Fetch Comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true)
        const response = await api.get(`/api/v1/courses/${courseId}/lessons/${lessonId}/comments`)
        if (response.data?.status === 'success') {
          setComments(response.data.comments)
        }
      } catch (error) {
        console.error("Failed to fetch comments:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchComments()
  }, [api, courseId, lessonId])

  // 2. Post a Comment or Reply
  async function handlePost(parentId: number | null = null, targetUsername: string | null = null) {
    const content = parentId ? replyInput : mainInput
    if (!content.trim() || isPosting) return

    try {
      setIsPosting(true)
      await api.post(`/api/v1/courses/${courseId}/lessons/${lessonId}/comments`, {
        content: content,
        parent_id: parentId,
        target_username: targetUsername
      })

      // Clear inputs and refresh feed to get the new comment with its DB ID
      if (parentId) {
        setReplyInput("")
        setActiveReplyThread(null)
      } else {
        setMainInput("")
      }

      // Optimistic refresh
      const response = await api.get(`/api/v1/courses/${courseId}/lessons/${lessonId}/comments`)
      setComments(response.data.comments)

    } catch (error) {
      console.error("Failed to post comment:", error)
    } finally {
      setIsPosting(false)
    }
  }

  // 3. Toggle Like
  async function handleLike(commentId: number, isReply: boolean = false, parentId?: number) {
    try {
      // Optimistic UI Update
      setComments(prev => prev.map(c => {
        if (!isReply && c.id === commentId) {
          return { ...c, likes_count: c.likes_count + 1 } // Simple optimistic bump
        }
        if (isReply && c.id === parentId) {
          return {
            ...c,
            replies: c.replies.map((r: any) => r.id === commentId ? { ...r, likes_count: r.likes_count + 1 } : r)
          }
        }
        return c
      }))

      const response = await api.post(`/api/v1/comments/${commentId}/like`)

      // Sync exact DB state
      if (response.data?.status === "success") {
        const exactCount = response.data.likes_count
        setComments(prev => prev.map(c => {
          if (!isReply && c.id === commentId) return { ...c, likes_count: exactCount }
          if (isReply && c.id === parentId) {
            return {
              ...c,
              replies: c.replies.map((r: any) => r.id === commentId ? { ...r, likes_count: exactCount } : r)
            }
          }
          return c
        }))
      }
    } catch (error) {
      console.error("Failed to like comment:", error)
    }
  }

  // 4. Delete Comment
  async function handleDelete(commentId: number) {
    try {
      await api.delete(`/api/v1/comments/${commentId}`)
      // Refresh to get exact soft-delete vs hard-delete state from backend
      const response = await api.get(`/api/v1/courses/${courseId}/lessons/${lessonId}/comments`)
      setComments(response.data.comments)
    } catch (error) {
      console.error("Failed to delete comment:", error)
    }
  }

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8">
      <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
        Discussion
        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{comments.length}</span>
      </h2>

      {/* ── Top Level Input Engine ── */}
      <div className="mb-8">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0 mt-1 shadow-sm">
            <span className="text-xs font-bold text-white uppercase">{user?.firstName?.[0] || "U"}</span>
          </div>
          <div className="flex-1 flex items-end gap-2 bg-white/60 backdrop-blur-xl border border-white/80 shadow-inner rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
            <input
              type="text"
              value={mainInput}
              onChange={(e) => setMainInput(e.target.value)}
              placeholder="Ask a question or share an insight..."
              className="flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter') handlePost() }}
            />
            <button
              onClick={() => handlePost()}
              disabled={!mainInput.trim() || isPosting}
              className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isPosting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── The Thread Feed ── */}
      <div className="space-y-6 max-h-[600px] overflow-y-auto hide-scrollbar pr-2">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-purple-500 animate-spin" /></div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-sm font-medium text-slate-500">Be the first to start a discussion!</div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex flex-col gap-3">

              {/* Parent Comment */}
              <div className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-5 py-4 shadow-sm ${c.is_deleted ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${c.author_role === 'instructor' ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-blue-400 to-purple-400'}`}>
                      <span className="text-[10px] font-bold text-white uppercase">{c.author_name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {c.author_name}
                        {c.author_role === 'instructor' && <ShieldCheck size={14} className="text-amber-500" />}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {/* RBAC Delete Button */}
                  {!c.is_deleted && (user?.id === c.user_id || user?.publicMetadata?.role === 'admin' || user?.publicMetadata?.role === 'instructor') && (
                    <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <p className={`text-sm leading-relaxed mb-3 ${c.is_deleted ? 'text-slate-400 italic' : 'text-slate-700 font-medium'}`}>
                  {c.content}
                </p>

                {!c.is_deleted && (
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleLike(c.id)} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors">
                      <ThumbsUp size={14} /> {c.likes_count > 0 ? c.likes_count : "Like"}
                    </button>
                    <button onClick={() => setActiveReplyThread({ parentId: c.id, targetUsername: c.author_name })} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">
                      <Reply size={14} /> Reply
                    </button>
                  </div>
                )}
              </div>

              {/* Nested Replies (The 1-Level Deep Magic) */}
              {(c.replies?.length > 0 || activeReplyThread?.parentId === c.id) && (
                <div className="pl-6 md:pl-10 space-y-3 relative before:absolute before:left-[19px] md:before:left-[35px] before:top-0 before:bottom-6 before:w-[2px] before:bg-slate-200/50">
                  {c.replies?.map((r: any) => (
                    <div key={r.id} className="bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl px-5 py-3 shadow-sm relative">
                      {/* Visual connection line */}
                      <div className="absolute -left-[18px] top-5 w-[16px] h-[2px] bg-slate-200/50" />

                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                            {r.author_name}
                            {r.author_role === 'instructor' && <ShieldCheck size={12} className="text-amber-500" />}
                          </p>
                          <span className="text-[10px] font-medium text-slate-400">• {new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        {(!r.is_deleted && (user?.id === r.user_id || user?.publicMetadata?.role === 'admin' || user?.publicMetadata?.role === 'instructor')) && (
                          <button onClick={() => handleDelete(r.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                        )}
                      </div>

                      <p className={`text-sm leading-relaxed mb-2 ${r.is_deleted ? 'text-slate-400 italic' : 'text-slate-600 font-medium'}`}>
                        {r.target_username && <span className="text-blue-600 font-bold mr-1">@{r.target_username}</span>}
                        {r.content}
                      </p>

                      {!r.is_deleted && (
                        <div className="flex items-center gap-4">
                          <button onClick={() => handleLike(r.id, true, c.id)} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-blue-600 transition-colors">
                            <ThumbsUp size={12} /> {r.likes_count > 0 ? r.likes_count : ""}
                          </button>
                          <button onClick={() => setActiveReplyThread({ parentId: c.id, targetUsername: r.author_name })} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-900 transition-colors">
                            <Reply size={12} /> Reply
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Inline Reply Box */}
                  {activeReplyThread?.parentId === c.id && (
                    <div className="relative mt-2">
                      <div className="absolute -left-[18px] top-5 w-[16px] h-[2px] bg-slate-200/50" />
                      <div className="flex items-end gap-2 bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500/20">
                        <input
                          type="text"
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          autoFocus
                          placeholder={`Replying to ${activeReplyThread.targetUsername || 'thread'}...`}
                          className="flex-1 bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none"
                          onKeyDown={(e) => { if (e.key === 'Enter') handlePost(c.id, activeReplyThread.targetUsername) }}
                        />
                        <button onClick={() => setActiveReplyThread(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2">Cancel</button>
                        <button
                          onClick={() => handlePost(c.id, activeReplyThread.targetUsername)}
                          disabled={!replyInput.trim() || isPosting}
                          className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <Send size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// 🚀 THE UPGRADED NOTES ENGINE
function NotesPanel({ courseId, lessonId }: { courseId: string; lessonId: number }) {
  const [inputText, setInputText] = useState("")
  const [notesList, setNotesList] = useState<any[]>([])

  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const api = useApi()

  // 1. Fetch the Knowledge Feed
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setIsLoading(true)
        const response = await api.get(`/api/v1/courses/${courseId}/lessons/${lessonId}/notes`);
        if (response.data?.status === 'success') {
          setNotesList(response.data.notes);
        }
      } catch (error) {
        console.error("Failed to fetch notes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [api, courseId, lessonId]);

  // 2. Save a New Note
  async function handleSave() {
    if (!inputText.trim() || isSaving) return;

    try {
      setIsSaving(true);
      const response = await api.post(`/api/v1/courses/${courseId}/lessons/${lessonId}/notes`, {
        content: inputText
      });

      if (response.data?.status === 'success') {
        // Instantly prepend the new note to the UI feed
        setNotesList((prev) => [response.data.note, ...prev]);
        setInputText(""); // Clear the input
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setIsSaving(false);
    }
  }

  // 3. Delete a Note
  async function handleDelete(noteId: number) {
    try {
      setDeletingId(noteId);
      await api.delete(`/api/v1/notes/${noteId}`);
      // Remove from UI
      setNotesList((prev) => prev.filter((n) => n.id !== noteId));
    } catch (error) {
      console.error("Failed to delete note:", error);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8">
      {/* ── ZONE 1: The Input Engine ── */}
      <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
        Lesson Notes
      </h2>
      <p className="text-sm font-medium text-slate-500 mb-5">
        Capture your insights. These are tied exclusively to this video.
      </p>

      <div className="relative">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Start typing a new note..."
          rows={4}
          className="w-full bg-white/50 backdrop-blur-xl border border-white/80 rounded-2xl p-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 transition-shadow resize-none leading-relaxed shadow-inner"
        />
        <div className="absolute bottom-3 right-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={!inputText.trim() || isSaving}
            className="rounded-xl bg-slate-900 text-white px-5 py-2.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600"
          >
            {isSaving ? (
              <><Loader2 size={14} className="animate-spin" /> Saving...</>
            ) : saved ? (
              <><CheckCircle2 size={14} /> Saved</>
            ) : (
              <><Save size={14} /> Save Note</>
            )}
          </motion.button>
        </div>
      </div>

      <hr className="my-8 border-slate-200/60" />

      {/* ── ZONE 2: The Knowledge Feed (Glass Timeline) ── */}
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
        Your Saved Notes
      </h3>

      <div className="space-y-4 max-h-[400px] overflow-y-auto hide-scrollbar pr-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          </div>
        ) : notesList.length === 0 ? (
          <div className="text-center py-10 bg-white/30 rounded-2xl border border-dashed border-slate-300">
            <StickyNote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">No notes yet for this lesson.</p>
          </div>
        ) : (
          <AnimatePresence>
            {notesList.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {new Date(note.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                    })}
                  </span>

                  {/* Hidden Delete Button (Shows on Hover) */}
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    {deletingId === note.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>

                {/* 🚀 THE FIX: Contain long notes with a scrollable max-height */}
                <div className="max-h-32 overflow-y-auto hide-scrollbar pr-2">
                  <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
