"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Sparkles, 
  X, 
  ArrowUp, 
  Loader2, 
  ChevronDown, // 🚀 NEW: For the Pill
  Check        // 🚀 NEW: For the Active Highlighter
} from "lucide-react"
import { useApi } from "@/hooks/useApi"
import { matchPath, useLocation } from "react-router-dom"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

type ChatContext = {
  id: string
  title: string
}

export function AuraChat({ courseId }: { courseId?: string | number | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Context State
  const [contexts, setContexts] = useState<ChatContext[]>([])
  const [selectedContext, setSelectedContext] = useState<string>("")
  
  // 🚀 NEW: Custom Dropdown Engine State & Ref
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const api = useApi()
  const location = useLocation()

  const routeCourseId = useMemo(() => {
    const pathname = location.pathname
    const routeMatch =
      matchPath("/courses/:courseId", pathname) ||
      matchPath("/learn/:courseId", pathname)
    return routeMatch?.params.courseId ?? null
  }, [location.pathname])

  // 1. Fetch available chat contexts (enrolled + created courses) when chat opens
  useEffect(() => {
    if (isOpen) {
      const fetchContexts = async () => {
        try {
          const response = await api.get('/api/v1/chat/contexts');
          if (response.data && response.data.status === 'success') {
            setContexts(response.data.contexts);
          }
        } catch (error) {
          console.error("Failed to load chat contexts", error);
        }
      };
      fetchContexts();
    }
  }, [isOpen, api]);

  // 2. Auto-sync the dropdown if the user navigates into a specific course
  useEffect(() => {
    const activeCourseId = routeCourseId ?? courseId
    if (activeCourseId) {
      setSelectedContext(String(activeCourseId));
    } else {
      setSelectedContext("");
    }
  }, [courseId, routeCourseId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [isOpen, messages, isLoading])

  // 🚀 NEW: The "Click-Outside" Shield
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    // Only bind the listener if the dropdown is open to save memory
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isDropdownOpen])

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputValue(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px"
    }
  }

  async function handleSendMessage() {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    const newUserMsg: Message = { id: crypto.randomUUID(), role: "user", content: userText };
    
    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await api.post("/api/v1/ask-aura", {
        query: userText,
        current_course_id: selectedContext === "" ? null : selectedContext
      });

      let replyText = "I'm sorry, I couldn't process that request.";
      if (typeof response.data === 'string') {
        replyText = response.data;
      } else if (response.data?.answer) {
        replyText = response.data.answer;
      } else if (response.data?.result) {
        replyText = response.data.result;
      } else if (response.data?.content) {
        replyText = response.data.content;
      }

      const aiMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: replyText };
      setMessages((prev) => [...prev, aiMsg]);

    } catch (error) {
      console.error("Aura API Error:", error);
      const errorMsg: Message = { 
        id: crypto.randomUUID(), 
        role: "assistant", 
        content: "Sorry, my neural networks are experiencing a slight hiccup. Please check your backend terminal!" 
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  // Helper to get the display title for the selected context
  const activeContextTitle = selectedContext === "" 
    ? "Platform Assistant (General)" 
    : contexts.find(c => c.id === selectedContext)?.title || "Platform Assistant (General)";

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="pill"
            layoutId="aura-chat-container"
            onClick={() => setIsOpen(true)}
            className="bg-slate-900/80 backdrop-blur-xl text-white rounded-full flex items-center gap-3 px-6 py-4 cursor-pointer shadow-2xl border border-white/10"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            animate={{ y: [0, -5, 0] }}
            transition={{
              y: { duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
            }}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-semibold">Ask Aura</span>
          </motion.button>
        ) : (
          <motion.div
            key="chat"
            layoutId="aura-chat-container"
            className="w-[90vw] sm:w-[500px] h-[70vh] max-h-[700px] bg-white/60 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-3xl flex flex-col overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/40 shrink-0 bg-white/30 backdrop-blur-md z-20">
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                
                <div className="flex flex-col flex-1 min-w-0 relative" ref={dropdownRef}>
                  <h3 className="text-sm font-bold text-slate-900 mb-0.5">Aura AI</h3>
                  
                  {/* 🚀 THE NEW GLASS PILL TRIGGER */}
                  <button
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    className="flex items-center justify-between w-full text-xs font-medium text-slate-600 bg-white/50 hover:bg-white/80 border border-slate-200/60 rounded-md px-2 py-1 transition-all cursor-pointer outline-none shadow-sm"
                  >
                    <span className="truncate pr-2">{activeContextTitle}</span>
                    <motion.div
                      animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </motion.div>
                  </button>

                  {/* 🚀 THE CINEMATIC POPOVER MENU */}
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute left-0 top-[110%] mt-1.5 w-[260px] bg-white/90 backdrop-blur-3xl border border-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-xl py-1.5 z-50 max-h-[200px] overflow-y-auto hide-scrollbar"
                      >
                        {/* Global Assistant Option */}
                        <button
                          onClick={() => {
                            setSelectedContext("")
                            setIsDropdownOpen(false)
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                            selectedContext === "" 
                              ? "bg-purple-50/80 text-purple-700" 
                              : "text-slate-600 hover:bg-slate-100/80"
                          }`}
                        >
                          <span className="truncate pr-2">Platform Assistant (General)</span>
                          {selectedContext === "" && <Check className="w-3.5 h-3.5 shrink-0 text-purple-600" />}
                        </button>
                        
                        {/* Dynamic Course Contexts */}
                        {contexts.length > 0 && (
                          <div className="px-3 pb-1 pt-2 mt-1 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Enrolled Courses
                          </div>
                        )}
                        
                        {contexts.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedContext(c.id)
                              setIsDropdownOpen(false)
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                              selectedContext === c.id 
                                ? "bg-purple-50/80 text-purple-700" 
                                : "text-slate-600 hover:bg-slate-100/80"
                            }`}
                          >
                            <span className="truncate pr-2">{c.title}</span>
                            {selectedContext === c.id && <Check className="w-3.5 h-3.5 shrink-0 text-purple-600" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200/80 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 hide-scrollbar z-10">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <p className="text-base font-semibold text-slate-700">Hi, I'm Aura</p>
                <p className="text-sm font-medium text-slate-500 mt-1 max-w-[80%] mx-auto">
                  {selectedContext !== "" 
                    ? "I'm connected to this course's master PDF. Ask me anything about the material!"
                    : "I'm your AI learning companion. Ask me to help you find a course!"}
                </p>
              </motion.div>

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-slate-900 text-white rounded-2xl rounded-br-sm shadow-md"
                        : "bg-white/80 backdrop-blur-xl border border-white/60 text-slate-700 rounded-2xl rounded-bl-sm shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                  <div className="bg-white/80 backdrop-blur-xl border border-white/60 text-slate-700 rounded-2xl rounded-bl-sm px-4 py-4 shadow-sm flex gap-1.5">
                    <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                    <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.15, ease: "easeInOut" }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                    <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.3, ease: "easeInOut" }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/40 shrink-0 bg-white/30 backdrop-blur-md z-10 relative">
              <div className="flex items-end gap-2 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-purple-500/20 transition-shadow">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleTextareaInput}
                  placeholder="Ask anything..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none resize-none leading-relaxed max-h-[120px] py-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-md"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <ArrowUp className="w-4 h-4 text-white" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
