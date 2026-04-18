"use client"

import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import {
  Sparkles,
  Brain,
  BarChart3,
  Zap,
  Star,
  UserCircle,
  ClipboardCheck,
  GraduationCap,
  MessageSquare,
} from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "Adaptive AI Tutor",
    description:
      "Aura learns your pace, your style, and your goals to deliver a hyper-personalized curriculum in real-time.",
    span: "md:col-span-2",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    description:
      "Visualize your progress with beautiful, intuitive dashboards that track every milestone.",
    span: "",
  },
  {
    icon: MessageSquare,
    title: "Real-time AI Mentorship",
    description:
      "Aura acts as your 24/7 personalized tutor, answering questions and guiding you through concepts in real-time.",
    span: "",
  },
  {
    icon: Zap,
    title: "Instant Assessments",
    description:
      "AI-generated quizzes and assessments that adapt to your knowledge level. Get instant feedback and targeted review materials.",
    span: "md:col-span-2",
  },
]

const howItWorks = [
  {
    step: 1,
    icon: ClipboardCheck,
    title: "Enroll",
    description: "Browse our curated catalog and enroll in courses that match your goals and interests.",
  },
  {
    step: 2,
    icon: MessageSquare,
    title: "Learn & Ask Aura",
    description: "Dive into lessons, projects, and get real-time help from your personal AI tutor.",
  },
  {
    step: 3,
    icon: GraduationCap,
    title: "Pass AI Quizzes",
    description: "Prove your mastery with adaptive quizzes and earn your verified certification.",
  },
]

const reviews = [
  {
    name: "Priya Sharma",
    role: "ML Engineer at Flipkart",
    review:
      "Aura completely changed how I learn. The AI tutor feels like having a personal mentor available 24/7. Finished my ML certification in half the expected time.",
    rating: 5,
  },
  {
    name: "Arjun Mehta",
    role: "Design Lead at Razorpay",
    review:
      "The adaptive quizzes are brilliant. They genuinely test understanding, not just memorization. Best learning platform I have used in years.",
    rating: 5,
  },
  {
    name: "Sneha Reddy",
    role: "Full-Stack Developer",
    review:
      "I went from zero TypeScript knowledge to confidently building production apps. The curriculum adapts perfectly to your skill level.",
    rating: 5,
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

export function LandingPage() {
  const navigate = useNavigate()
  return (
    <div className="relative min-h-screen">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          <motion.div
            variants={itemVariants}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-5 py-2"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-base font-medium text-slate-600">
              AI-Powered Learning Platform
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-6xl md:text-8xl font-extrabold tracking-tighter text-slate-900 leading-[0.9]"
          >
            Learn with
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Aura
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-8 text-xl font-medium text-slate-500 max-w-2xl mx-auto leading-relaxed"
          >
            The next-generation learning platform that adapts to you.
            Powered by AI, designed for humans.
          </motion.p>

          <motion.button
            variants={itemVariants}
            onClick={() => navigate("/auth")}
            className="mt-10 rounded-full bg-slate-900 text-white px-10 py-4 text-lg font-semibold shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:shadow-[0_0_60px_rgba(59,130,246,0.45)] hover:bg-slate-800 transition-all duration-300 cursor-pointer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Experience Aura AI
          </motion.button>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-slate-900 text-balance">
            How it{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              works
            </span>
          </h2>
          <p className="mt-4 text-lg font-medium text-slate-500 max-w-xl mx-auto leading-relaxed">
            Three simple steps to transform your learning journey.
          </p>
        </motion.div>

        <div className="flex gap-6 overflow-x-auto snap-x pb-8 hide-scrollbar">
          {howItWorks.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                delay: i * 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="min-w-[300px] flex-1 snap-center bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 flex flex-col items-center text-center"
            >
              {/* Glowing step circle */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                  <item.icon className="w-9 h-9 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                  {item.step}
                </span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                {item.title}
              </h3>
              <p className="text-base font-medium text-slate-500 leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-slate-900">
            Everything you need to{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              excel
            </span>
          </h2>
          <p className="mt-4 text-lg font-medium text-slate-500 max-w-xl mx-auto leading-relaxed">
            A beautifully integrated suite of tools, all driven by
            intelligent AI.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className={`bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 md:p-10 ${feature.span}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ scale: 1.02 }}
            >
              <feature.icon className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-lg font-medium text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-slate-900 text-balance">
            Loved by{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              learners
            </span>
          </h2>
          <p className="mt-4 text-lg font-medium text-slate-500 max-w-xl mx-auto leading-relaxed">
            Join thousands of students already transforming their careers.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review, i) => (
            <motion.div
              key={review.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 md:p-10"
            >
              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: review.rating }).map((_, s) => (
                  <Star
                    key={s}
                    size={18}
                    className="text-amber-400 fill-amber-400"
                  />
                ))}
              </div>
              <p className="text-lg font-medium text-slate-600 leading-relaxed mb-6">
                {'"'}
                {review.review}
                {'"'}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {review.name}
                  </p>
                  <p className="text-xs font-medium text-slate-400">
                    {review.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 pb-8 pt-24">
        <div className="flex flex-col items-center gap-8">
          <div className="flex items-center gap-8">
            {["About", "Privacy", "Terms", "Contact"].map((link) => (
              <button
                key={link}
                onClick={() => navigate(`/legal/${link.toLowerCase()}`)}
                className="text-base font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                {link}
              </button>
            ))}
          </div>
          <div className="w-full overflow-hidden flex items-end justify-center leading-none select-none">
            <span className="text-[15vw] font-black tracking-tighter text-slate-900/15 leading-none">
              AURA.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
