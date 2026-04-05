"use client"

import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"

const legalContent: Record<string, { title: string; body: string }> = {
  About: {
    title: "About Aura",
    body: `Aura is the next-generation AI-powered Learning Management System, designed to transform the way people learn and teach.

Founded in 2024, our mission is to democratize high-quality education through the power of artificial intelligence. We believe that every learner is unique, and education should adapt to the individual -- not the other way around.

Our platform combines cutting-edge AI with beautifully designed interfaces to create an immersive, intuitive learning experience. From personalized curriculum recommendations to real-time adaptive assessments, Aura meets learners exactly where they are and guides them to where they want to be.

We are a team of educators, engineers, and designers united by the belief that technology can unlock human potential at scale. Our headquarters are in San Francisco, with distributed teams across North America, Europe, and Asia.

Whether you are a student exploring a new field, a professional upskilling for a career change, or an instructor sharing your expertise with the world, Aura is your partner in the pursuit of knowledge.`,
  },
  Privacy: {
    title: "Privacy Policy",
    body: `Effective Date: January 1, 2026

At Aura, we take your privacy seriously. This Privacy Policy describes how we collect, use, and share information about you when you use our platform and services.

Information We Collect: We collect information you provide directly, such as your name, email address, and learning preferences. We also collect usage data, including courses viewed, time spent learning, and assessment results, to improve your personalized experience.

How We Use Your Information: Your data powers Aura's AI engine, enabling personalized curriculum recommendations, adaptive assessments, and progress tracking. We do not sell your personal information to third parties.

Data Security: We employ industry-standard encryption, access controls, and regular security audits to protect your information. All data is stored in SOC 2 Type II certified data centers.

Your Rights: You may access, correct, or delete your personal data at any time through your account settings. You can also export a complete copy of your learning history and achievements.

Cookies & Tracking: We use essential cookies to maintain your session and preferences. Analytics cookies help us understand how learners interact with our platform to improve the experience.

Contact Us: For privacy-related inquiries, please reach out to privacy@aura.edu.`,
  },
  Terms: {
    title: "Terms of Service",
    body: `Effective Date: January 1, 2026

Welcome to Aura. By accessing or using our platform, you agree to be bound by these Terms of Service.

Account Registration: You must provide accurate information when creating your account. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.

Acceptable Use: You agree to use Aura for lawful educational purposes only. You may not redistribute course materials, attempt to reverse-engineer our AI systems, or engage in any activity that disrupts the platform or other users' experiences.

Intellectual Property: Course content is owned by the respective instructors and licensed to Aura for distribution on the platform. Learners receive a personal, non-transferable license to access purchased courses.

Instructor Terms: Instructors retain ownership of their original content. By publishing on Aura, instructors grant us a non-exclusive license to host, distribute, and promote their courses. Revenue sharing is determined by the instructor agreement at the time of publication.

Refund Policy: Learners may request a full refund within 14 days of purchase if they have completed less than 25% of the course content.

Limitation of Liability: Aura provides educational content on an "as-is" basis. While we strive for accuracy and quality, we do not guarantee specific outcomes from using the platform.

Changes to Terms: We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the revised terms.`,
  },
  Contact: {
    title: "Contact Us",
    body: `We would love to hear from you. Whether you have a question about our platform, need technical support, or want to explore partnership opportunities, our team is here to help.

General Inquiries: hello@aura.edu
Technical Support: support@aura.edu
Press & Media: press@aura.edu
Partnerships: partners@aura.edu

Our Office:
Aura Learning, Inc.
548 Market Street, Suite 300
San Francisco, CA 94104

We typically respond within 24 hours during business days. For urgent technical issues, our support team is available around the clock through the Aura AI chat assistant built into the platform.`,
  },
}

export function LegalView({
  page,
  onBack,
}: {
  page: string
  onBack: () => void
}) {
  const content = legalContent[page] ?? legalContent["About"]

  return (
    <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer mb-8"
      >
        <ArrowLeft size={18} />
        Back to Home
      </motion.button>

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 md:p-12"
      >
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-8">
          {content.title}
        </h1>
        <div className="text-sm font-medium text-slate-600 leading-[1.8] whitespace-pre-line">
          {content.body}
        </div>
      </motion.article>
    </main>
  )
}
