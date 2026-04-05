import { NotificationBanner } from "@/components/aura/notification-banner"
import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useAuth, useUser } from "@clerk/clerk-react"

// Import all the premium v0 components
import { SpatialBackground } from "@/components/aura/spatial-background"
import { LandingPage } from "@/components/aura/landing-page"
import { AuthPage } from "@/components/aura/auth-page"
import { DashboardView } from "@/components/aura/dashboard-view"
import { CatalogView } from "@/components/aura/catalog-view"
import { CourseDetailsView } from "@/components/aura/course-details-view"
import { TeachView } from "@/components/aura/teach-view"
import { LegalView } from "@/components/aura/legal-view"
import { ApplicationSuccessView } from "@/components/aura/application-success-view"
import { LearningModeView } from "@/components/aura/learning-mode-view"
import { InstructorCourseBuilderView } from "@/components/aura/instructor-course-builder-view"
import { FloatingNavbar } from "@/components/aura/floating-navbar"
import { AuraChat } from "@/components/aura/aura-chat"
import { AdminDashboardView } from "@/components/aura/admin-dashboard-view"
import './index.css'

export type ViewType =
  | "landing"
  | "auth"
  | "dashboard"
  | "catalog"
  | "course-details"
  | "teach"
  | "legal"
  | "application-success"
  | "learning-mode"
  | "instructor-course-builder"
  | "admin-dashboard"

export type RoleType = "student" | "instructor" | "admin"

const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
}

export default function App() {
  const { isSignedIn, isLoaded, getToken, signOut } = useAuth();
  const { user } = useUser();

  const [currentView, setCurrentView] = useState<ViewType>("landing")
  const [role, setRole] = useState<RoleType>("student")

  const [selectedCourseId, setSelectedCourseId] = useState<string | number | null>(null)
  const [legalPage, setLegalPage] = useState<string>("About")

  const [isSyncingRole, setIsSyncingRole] = useState(false)

  useEffect(() => {
    let isMounted = true;

    const syncDatabaseRole = async () => {
      if (!isSignedIn) {
        if (currentView !== "landing" && currentView !== "auth") {
          setCurrentView("landing");
        }
        return;
      }

      if (currentView === "landing" || currentView === "auth") {
        setIsSyncingRole(true);

        try {
          const token = await getToken();
          const response = await fetch("http://localhost:8000/api/v1/users/me", {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.status === 404) {
            console.error("Ghost Session detected. Forcing logout.");
            signOut();
            return;
          }

          if (!response.ok) throw new Error("Network response was not ok");

          const data = await response.json();

          if (isMounted && data.status === "success") {
            const realRole = data.user.role;
            setRole(realRole);

            if (realRole === "admin") {
              setCurrentView("admin-dashboard");
            } else {
              setCurrentView("dashboard");
            }
          }
        } catch (error) {
          console.error("Failed to sync role with backend. Defaulting to student.", error);
          if (isMounted) {
            setRole("student");
            setCurrentView("dashboard");
          }
        } finally {
          if (isMounted) setIsSyncingRole(false);
        }
      }
    };

    if (isLoaded) {
      syncDatabaseRole();
    }

    return () => { isMounted = false };
  }, [isSignedIn, isLoaded, getToken, signOut]);

  const showNavbar = isSignedIn && currentView !== "landing" && currentView !== "auth"

  function handleNavNavigate(view: ViewType) {
    setCurrentView(view)
  }

  function handleCourseClick(courseId: string | number, isEnrolled: boolean = false) {
    setSelectedCourseId(courseId)
    if (isEnrolled) {
      setCurrentView("learning-mode");
    } else {
      setCurrentView("course-details");
    }
  }

  // 🚀 THE FIX: Target-Aware Routing
  // The dashboard now tells us EXACTLY which course the user wants to resume
  function handleContinueLearning(targetCourseId?: string | number) {
    if (targetCourseId) {
      setSelectedCourseId(targetCourseId);
    }
    setCurrentView("learning-mode");
  }

  function handleLegalClick(page: string) {
    setLegalPage(page)
    setCurrentView("legal")
  }

  function handleBackToCatalog() {
    setCurrentView("catalog")
  }



  if (!isLoaded) return null;

  if (isSyncingRole) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 relative z-[999]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Authenticating Identity...</p>
      </div>
    )
  }

  return (
    <>
      <SpatialBackground />

      {showNavbar && (
        <FloatingNavbar
          currentView={currentView}
          role={role}
          onNavigate={handleNavNavigate}
          onLogoClick={() => setCurrentView(role === "admin" ? "admin-dashboard" : "dashboard")}
        />
      )}

      {isSignedIn && <NotificationBanner />}

      <AnimatePresence mode="wait">
        {!isSignedIn && currentView === "landing" && (
          <motion.div key="landing" {...pageTransition}>
            <LandingPage
              onEnter={() => setCurrentView("auth")}
              onLegalClick={handleLegalClick}
            />
          </motion.div>
        )}

        {!isSignedIn && currentView === "auth" && (
          <motion.div key="auth" {...pageTransition} className="w-full h-screen">
            <AuthPage />
          </motion.div>
        )}

        {isSignedIn && currentView === "dashboard" && (
          <motion.div key="dashboard" {...pageTransition}>
            <DashboardView
              role={role}
              onCourseClick={handleCourseClick}
              // 🚀 Wire the new target-aware function
              onContinueLearning={handleContinueLearning}
              onCreateCourse={() => setCurrentView("instructor-course-builder")}
            />
          </motion.div>
        )}

        {isSignedIn && currentView === "catalog" && (
          <motion.div key="catalog" {...pageTransition}>
            <CatalogView onCourseClick={handleCourseClick} />
          </motion.div>
        )}

        {isSignedIn && currentView === "course-details" && (
          <motion.div key="course-details" {...pageTransition}>
            <CourseDetailsView
              courseId={selectedCourseId}
              onBack={handleBackToCatalog}
              onStartCourse={() => setCurrentView("learning-mode")}
            />
          </motion.div>
        )}

        {isSignedIn && currentView === "teach" && (
          <motion.div key="teach" {...pageTransition}>
            <TeachView
              role={role}
              onApplicationSuccess={() => setCurrentView("application-success")}
            />
          </motion.div>
        )}

        {isSignedIn && currentView === "application-success" && (
          <motion.div key="application-success" {...pageTransition}>
            <ApplicationSuccessView
              onBackToDashboard={() => setCurrentView("dashboard")}
            />
          </motion.div>
        )}

        {isSignedIn && currentView === "learning-mode" && (
          <motion.div key="learning-mode" {...pageTransition}>
            <LearningModeView
              courseId={selectedCourseId}
              onBack={() => setCurrentView("dashboard")}
            />
          </motion.div>
        )}

        {isSignedIn && currentView === "instructor-course-builder" && (
          <motion.div key="instructor-course-builder" {...pageTransition}>
            <InstructorCourseBuilderView
              onBack={() => setCurrentView("dashboard")}
            />
          </motion.div>
        )}

        {isSignedIn && currentView === "admin-dashboard" && (
          <motion.div key="admin-dashboard" {...pageTransition}>
            <AdminDashboardView role={role} />
          </motion.div>
        )}

        {currentView === "legal" && (
          <motion.div key="legal" {...pageTransition}>
            <LegalView
              page={legalPage}
              onBack={() => setCurrentView(isSignedIn ? "dashboard" : "landing")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isSignedIn && <AuraChat courseId={selectedCourseId} />}
    </>
  )
}