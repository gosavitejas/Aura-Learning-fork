"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useApi } from "@/hooks/useApi"
import {
  ArrowLeft,
  GripVertical,
  Plus,
  Trash2,
  Upload,
  FileText,
  X,
  Rocket,
  Image as ImageIcon,
  Link as LinkIcon,
  ChevronRight,
  Loader2,
  BrainCircuit
} from "lucide-react"

// Types matching our new database architecture
type Lesson = {
  id: string
  title: string
  videoUrl: string
}

type Module = {
  id: string
  title: string
  lessons: Lesson[]
}

const CATEGORIES = ["AI", "Development", "Design", "Business", "General"]

export function InstructorCourseBuilderView({
  onBack,
}: {
  onBack: () => void
}) {
  const api = useApi();
  
  // ── Flow State ──
  const [step, setStep] = useState<1 | 2>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [courseId, setCourseId] = useState<string | null>(null)

  // ── Step 1 State (Identity) ──
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("AI")
  const [price, setPrice] = useState("")
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isThumbDragOver, setIsThumbDragOver] = useState(false)

  // ── Step 2 State (Studio) ──
  const [modules, setModules] = useState<Module[]>([
    { id: "mod-1", title: "Module 1: Foundations", lessons: [] }
  ])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [isPdfDragOver, setIsPdfDragOver] = useState(false)

  /* ════════════════════════════════════════════════
     API ACTIONS
     ════════════════════════════════════════════════ */

  const handleStep1Submit = async () => {
    if (!title || !description) return alert("Please fill in the title and description.");
    
    try {
      setIsSubmitting(true);
      // Generate a unique ID for the course frontend-side
      const newCourseId = `course_${crypto.randomUUID().split('-')[0]}`;
      
      const formData = new FormData();
      formData.append("id", newCourseId);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("price", price || "0");
      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile);
      }

      await api.post("/api/v1/courses", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setCourseId(newCourseId);
      setStep(2); // Move to The Studio smoothly
    } catch (error) {
      console.error("Failed to create course shell:", error);
      alert("Failed to create course. Ensure backend is running.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handlePublishCourse = async () => {
    if (!courseId) return;

    try {
      setIsSubmitting(true);

      // 1. Save all Modules and Lessons iteratively
      for (let mIndex = 0; mIndex < modules.length; mIndex++) {
        const mod = modules[mIndex];
        // Create Module
        const modRes = await api.post(`/api/v1/courses/${courseId}/modules`, {
          title: mod.title,
          order_index: mIndex
        });
        const dbModuleId = modRes.data.module.id;

        // Create Lessons inside Module
        for (let lIndex = 0; lIndex < mod.lessons.length; lIndex++) {
          const les = mod.lessons[lIndex];
          if (les.title) {
            await api.post(`/api/v1/modules/${dbModuleId}/lessons`, {
              title: les.title,
              video_url: les.videoUrl,
              order_index: lIndex
            });
          }
        }
      }

      // 2. Upload Master PDF for Aura AI (if provided)
      if (pdfFile) {
        const pdfData = new FormData();
        pdfData.append("course_id", courseId);
        pdfData.append("file", pdfFile);
        await api.post("/api/v1/upload-course", pdfData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      // 3. Flip the switch to "Published"
      await api.put(`/api/v1/courses/${courseId}/publish`);

      // 4. Return to Dashboard triumphantly
      onBack();

    } catch (error) {
      console.error("Failed to publish curriculum:", error);
      alert("An error occurred while publishing.");
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ════════════════════════════════════════════════
     LOCAL UI STATE HANDLERS
     ════════════════════════════════════════════════ */

  const handleThumbnailDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsThumbDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  }

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  }

  // Curriculum Helpers
  const addModule = () => {
    setModules([...modules, { id: crypto.randomUUID(), title: `Module ${modules.length + 1}`, lessons: [] }]);
  }
  const removeModule = (id: string) => setModules(modules.filter(m => m.id !== id));
  const updateModuleTitle = (id: string, newTitle: string) => {
    setModules(modules.map(m => m.id === id ? { ...m, title: newTitle } : m));
  }
  const addLesson = (moduleId: string) => {
    setModules(modules.map(m => m.id === moduleId ? { ...m, lessons: [...m.lessons, { id: crypto.randomUUID(), title: "", videoUrl: "" }] } : m));
  }
  const removeLesson = (moduleId: string, lessonId: string) => {
    setModules(modules.map(m => m.id === moduleId ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) } : m));
  }
  const updateLesson = (moduleId: string, lessonId: string, field: "title" | "videoUrl", val: string) => {
    setModules(modules.map(m => m.id === moduleId ? {
      ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, [field]: val } : l)
    } : m));
  }

  /* ════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════ */

  return (
    <main className="max-w-5xl mx-auto px-6 pt-28 pb-24 min-h-screen flex flex-col">
      {/* Back Header */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
        
        {/* Progress Indicator */}
        <div className="flex items-center gap-2 text-sm font-bold">
          <span className={step === 1 ? "text-blue-600" : "text-slate-400"}>1. Identity</span>
          <ChevronRight size={14} className="text-slate-300" />
          <span className={step === 2 ? "text-purple-600" : "text-slate-400"}>2. Studio</span>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        
        {/* ────────────────────────────────────────────────────────
            STEP 1: THE SPARK (Course Identity)
            ──────────────────────────────────────────────────────── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl mx-auto"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Course Identity</h1>
              <p className="mt-2 text-slate-500">Define the core vision for your new course.</p>
            </div>

            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 space-y-6">
              
              {/* Thumbnail Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsThumbDragOver(true); }}
                onDragLeave={() => setIsThumbDragOver(false)}
                onDrop={handleThumbnailDrop}
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl h-48 overflow-hidden transition-all cursor-pointer ${
                  isThumbDragOver ? "border-blue-500 bg-blue-50/50" : "border-slate-300/60 bg-white/30 hover:bg-white/50"
                }`}
              >
                {thumbnailPreview ? (
                  <>
                    <img src={thumbnailPreview} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-white font-semibold flex items-center gap-2"><ImageIcon size={18}/> Change Cover</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6">
                    <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700">Upload Course Cover Image</p>
                    <p className="text-xs font-medium text-slate-400 mt-1">16:9 ratio recommended (JPG, PNG)</p>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleThumbnailSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Course Title</label>
                  <input
                    type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Master React 18"
                    className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                  <select
                    value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will learners gain from this course?" rows={3}
                  className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Price (₹)</label>
                <input
                  type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                  placeholder="3999"
                  className="w-full md:w-1/3 bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleStep1Submit}
                disabled={isSubmitting || !title || !description}
                className="w-full rounded-full bg-slate-900 text-white py-4 text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><ChevronRight size={18}/> Continue to Studio</>}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ────────────────────────────────────────────────────────
            STEP 2: THE STUDIO (Curriculum & AI & Publish)
            ──────────────────────────────────────────────────────── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* LEFT COLUMN: Curriculum Builder */}
            <div className="lg:col-span-2 space-y-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Curriculum Builder</h2>
                <p className="text-sm text-slate-500">Organize your modules and paste YouTube/Vimeo links.</p>
              </div>

              {modules.map((mod) => (
                <div key={mod.id} className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-sm rounded-2xl p-5">
                  {/* Module Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <GripVertical size={18} className="text-slate-300 shrink-0 cursor-grab" />
                    <input
                      type="text" value={mod.title} onChange={(e) => updateModuleTitle(mod.id, e.target.value)}
                      className="flex-1 bg-transparent text-lg font-extrabold text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="Module Title..."
                    />
                    <button onClick={() => removeModule(mod.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Lessons List */}
                  <div className="space-y-3 ml-7">
                    {mod.lessons.map((lesson) => (
                      <div key={lesson.id} className="flex flex-col gap-2 bg-white/60 border border-slate-100 rounded-xl p-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <GripVertical size={14} className="text-slate-300 shrink-0 cursor-grab" />
                          <input
                            type="text" value={lesson.title} onChange={(e) => updateLesson(mod.id, lesson.id, "title", e.target.value)}
                            placeholder="Lesson Title (e.g. Introduction)"
                            className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                          />
                          <button onClick={() => removeLesson(mod.id, lesson.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {/* URL Input */}
                        <div className="flex items-center gap-2 pl-6">
                          <LinkIcon size={12} className="text-slate-400" />
                          <input
                            type="url" value={lesson.videoUrl} onChange={(e) => updateLesson(mod.id, lesson.id, "videoUrl", e.target.value)}
                            placeholder="Paste YouTube or Vimeo URL here..."
                            className="flex-1 bg-transparent text-xs font-medium text-slate-500 outline-none placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                    ))}

                    <button onClick={() => addLesson(mod.id)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer mt-2">
                      <Plus size={14} /> Add Video Lesson
                    </button>
                  </div>
                </div>
              ))}

              <button onClick={addModule} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300/60 rounded-2xl py-6 text-sm font-bold text-slate-500 hover:text-slate-700 hover:border-slate-400/60 transition-all cursor-pointer bg-white/20 hover:bg-white/40">
                <Plus size={16} /> Add New Module
              </button>
            </div>

            {/* RIGHT COLUMN: AI Brain & Publish */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* PDF Dropzone */}
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-sm rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BrainCircuit className="text-purple-500 w-5 h-5" />
                  <h3 className="font-bold text-slate-900">Aura AI Brain</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Upload the master notes, transcripts, or syllabus. Aura will process this PDF to answer student questions instantly.
                </p>

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsPdfDragOver(true); }}
                  onDragLeave={() => setIsPdfDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsPdfDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file && file.type === "application/pdf") setPdfFile(file);
                  }}
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    isPdfDragOver ? "border-purple-500 bg-purple-50/50" : pdfFile ? "border-emerald-400 bg-emerald-50/30" : "border-slate-300 bg-white/50 hover:bg-white/70"
                  }`}
                >
                  {pdfFile ? (
                    <>
                      <FileText className="w-8 h-8 text-emerald-500 mb-2" />
                      <p className="text-sm font-bold text-slate-900 truncate w-full px-2">{pdfFile.name}</p>
                      <button onClick={(e) => { e.stopPropagation(); setPdfFile(null); }} className="mt-2 text-xs font-bold text-red-500 hover:underline">
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-700">Drop Course PDF Here</p>
                      <p className="text-[10px] text-slate-400 mt-1">Up to 50MB</p>
                    </>
                  )}
                  <input type="file" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPdfFile(f); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>

              {/* Publish Actions */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white">
                <h3 className="font-bold text-lg mb-2">Ready to launch?</h3>
                <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                  Publishing will save your curriculum, trigger the Aura AI processing pipeline, and make your course visible in the global catalog.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handlePublishCourse}
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-white text-slate-900 py-3.5 text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin text-slate-900" /> : <><Rocket size={16}/> Publish to Catalog</>}
                </motion.button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}