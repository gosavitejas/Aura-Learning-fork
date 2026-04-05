"use client"

import { useClerk, useUser, UserProfile } from "@clerk/clerk-react";
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Library,
  GraduationCap,
  User,
  LogOut,
  ShieldAlert,
  X
} from "lucide-react"
import type { ViewType, RoleType } from "@/App"

const studentLinks: { label: string; view: ViewType; icon: React.ElementType }[] = [
  { label: "Dashboard", view: "dashboard", icon: LayoutDashboard },
  { label: "Catalog", view: "catalog", icon: Library },
  { label: "Teach", view: "teach", icon: GraduationCap },
]

const instructorLinks: { label: string; view: ViewType; icon: React.ElementType }[] = [
  { label: "Dashboard", view: "dashboard", icon: LayoutDashboard },
  { label: "Catalog", view: "catalog", icon: Library },
  { label: "Teach", view: "teach", icon: GraduationCap },
]

const adminLinks: { label: string; view: ViewType; icon: React.ElementType }[] = [
  { label: "Command Center", view: "admin-dashboard", icon: ShieldAlert },
  { label: "Global Catalog", view: "catalog", icon: Library },
]

export function FloatingNavbar({
  currentView,
  role,
  onNavigate,
  onLogoClick,
}: {
  currentView: ViewType
  role: RoleType
  onNavigate: (view: ViewType) => void
  onLogoClick: () => void
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 🚀 NEW STATE: Controls the Clerk Profile Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  const { signOut } = useClerk();
  const { user } = useUser();



  const visibleLinks = role === "admin" ? adminLinks : role === "instructor" ? instructorLinks : studentLinks;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <>
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-40"
      >
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-full h-16 flex items-center justify-between px-6">

          <button
            onClick={onLogoClick}
            className="text-xl font-extrabold tracking-tighter text-slate-900 cursor-pointer"
          >
            Aura
          </button>

          <div className="flex items-center gap-1">
            {visibleLinks.map((link) => {
              const isActive = currentView === link.view || (link.view === "teach" && currentView === "instructor-course-builder");

              return (
                <button
                  key={link.label}
                  onClick={() => {
                    if (link.view === "teach" && role === "instructor") {
                      onNavigate("instructor-course-builder");
                    } else {
                      onNavigate(link.view);
                    }
                  }}
                  className={`relative flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-colors cursor-pointer ${isActive
                    ? "text-slate-900 bg-slate-900/5"
                    : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  <link.icon size={18} />
                  <span className="hidden md:inline">{link.label}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3" ref={dropdownRef}>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center cursor-pointer ring-2 ring-transparent hover:ring-blue-200 transition-all overflow-hidden p-0"
              >
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt={user?.fullName || "User Avatar"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {user?.firstName?.charAt(0) || "A"}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-12 w-56 z-50 bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_16px_48px_rgb(0,0,0,0.08)] rounded-2xl p-2 overflow-hidden"
                  >
                    <div className="px-3 py-3 border-b border-slate-100 mb-1">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {user?.fullName || "Aura User"}
                      </p>
                      <p className="text-xs font-medium text-slate-400 truncate">
                        {user?.primaryEmailAddress?.emailAddress || "user@aura.edu"}
                      </p>
                      <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {role} view
                      </span>
                    </div>

                    {/* 🚀 WIRED BUTTON: Opens Modal & Closes Dropdown */}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <User size={16} />
                      Profile
                    </button>



                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false)
                          onLogoClick()
                          signOut()
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* 🚀 NEW: The Supreme Z-Index Clerk Modal Overlay */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6"
            onClick={() => setIsProfileModalOpen(false)} // Close if they click the dark background
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()} // Prevent clicking the actual modal from closing it
              className="relative max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl hide-scrollbar"
            >
              {/* Custom Close Button in case they don't click the backdrop */}
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="absolute top-4 right-4 z-50 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer shadow-sm"
              >
                <X size={16} className="text-slate-600" />
              </button>

              <UserProfile routing="hash" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}