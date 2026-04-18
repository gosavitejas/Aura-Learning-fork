import { NotificationBanner } from '@/components/aura/notification-banner'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@clerk/clerk-react'
import {
  matchPath,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { SpatialBackground } from '@/components/aura/spatial-background'
import { LandingPage } from '@/components/aura/landing-page'
import { AuthPage } from '@/components/aura/auth-page'
import { DashboardView } from '@/components/aura/dashboard-view'
import { CatalogView } from '@/components/aura/catalog-view'
import { CourseDetailsView } from '@/components/aura/course-details-view'
import { TeachView } from '@/components/aura/teach-view'
import { LegalView } from '@/components/aura/legal-view'
import { ApplicationSuccessView } from '@/components/aura/application-success-view'
import { LearningModeView } from '@/components/aura/learning-mode-view'
import { InstructorCourseBuilderView } from '@/components/aura/instructor-course-builder-view'
import { FloatingNavbar } from '@/components/aura/floating-navbar'
import { AuraChat } from '@/components/aura/aura-chat'
import { AdminDashboardView } from '@/components/aura/admin-dashboard-view'
import './index.css'

export type RoleType = 'student' | 'instructor' | 'admin'

const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
}

function TransitionPage({
  children,
  pageKey,
  className,
}: {
  children: ReactNode
  pageKey: string
  className?: string
}) {
  return (
    <motion.div key={pageKey} {...pageTransition} className={className}>
      {children}
    </motion.div>
  )
}

export default function App() {
  const { isSignedIn, isLoaded, getToken, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [role, setRole] = useState<RoleType>('student')
  const [isSyncingRole, setIsSyncingRole] = useState(false)

  const pathname = location.pathname
  const defaultRoute = role === 'admin' ? '/admin' : '/dashboard'

  const selectedCourseId = useMemo(() => {
    const courseMatch =
      matchPath('/courses/:courseId', pathname) ||
      matchPath('/learn/:courseId', pathname)
    return courseMatch?.params.courseId ?? null
  }, [pathname])

  useEffect(() => {
    let isMounted = true

    const syncDatabaseRole = async () => {
      if (!isSignedIn) {
        if (isMounted) {
          setRole('student')
          setIsSyncingRole(false)
        }
        return
      }

      setIsSyncingRole(true)

      try {
        const token = await getToken()
        const response = await fetch('http://localhost:8000/api/v1/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.status === 404) {
          console.error('Ghost Session detected. Forcing logout.')
          signOut()
          return
        }

        if (!response.ok) throw new Error('Network response was not ok')

        const data = await response.json()

        if (isMounted && data.status === 'success') {
          const realRole = data.user.role as RoleType
          setRole(realRole)

          const isPublicPath =
            pathname === '/' || pathname === '/auth' || pathname.startsWith('/legal/')

          if (pathname === '/auth') {
            const redirectTarget = new URLSearchParams(location.search).get('redirect')
            if (redirectTarget) {
              navigate(redirectTarget, { replace: true })
              return
            }
          }

          if (isPublicPath) {
            navigate(realRole === 'admin' ? '/admin' : '/dashboard', { replace: true })
            return
          }

          if (pathname === '/admin' && realRole !== 'admin') {
            navigate('/dashboard', { replace: true })
            return
          }

          if (pathname === '/teach/course-builder' && realRole !== 'instructor') {
            navigate('/teach', { replace: true })
          }
        }
      } catch (error) {
        console.error('Failed to sync role with backend. Defaulting to student.', error)
        if (isMounted) {
          setRole('student')
          if (pathname === '/' || pathname === '/auth') {
            navigate('/dashboard', { replace: true })
          }
        }
      } finally {
        if (isMounted) setIsSyncingRole(false)
      }
    }

    if (isLoaded) {
      syncDatabaseRole()
    }

    return () => {
      isMounted = false
    }
  }, [
    isSignedIn,
    isLoaded,
    getToken,
    signOut,
    navigate,
    pathname,
    location.search,
  ])

  if (!isLoaded) return null

  const renderAuthLoading =
    isSignedIn &&
    isSyncingRole &&
    !(pathname === '/' || pathname === '/auth' || pathname.startsWith('/legal/'))

  if (renderAuthLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 relative z-[999]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Authenticating Identity...</p>
      </div>
    )
  }

  const showNavbar = isSignedIn && pathname !== '/' && pathname !== '/auth'

  const protectedElement = (element: ReactNode) => {
    if (!isSignedIn) {
      const redirect = encodeURIComponent(
        `${location.pathname}${location.search}${location.hash}`
      )
      return <Navigate to={`/auth?redirect=${redirect}`} replace />
    }
    return <>{element}</>
  }

  const roleElement = (allowed: RoleType[], element: ReactNode, fallback: string) => {
    if (!isSignedIn) {
      const redirect = encodeURIComponent(
        `${location.pathname}${location.search}${location.hash}`
      )
      return <Navigate to={`/auth?redirect=${redirect}`} replace />
    }

    if (!allowed.includes(role)) {
      return <Navigate to={fallback} replace />
    }

    return <>{element}</>
  }

  return (
    <>
      <SpatialBackground />

      {showNavbar && <FloatingNavbar role={role} />}

      {isSignedIn && <NotificationBanner />}

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<TransitionPage pageKey="landing"><LandingPage /></TransitionPage>} />

          <Route
            path="/auth"
            element={
              <TransitionPage pageKey="auth" className="w-full h-screen">
                <AuthPage />
              </TransitionPage>
            }
          />

          <Route path="/legal" element={<Navigate to="/legal/about" replace />} />

          <Route
            path="/legal/:page"
            element={
              <TransitionPage pageKey="legal">
                <LegalView />
              </TransitionPage>
            }
          />

          <Route
            path="/dashboard"
            element={protectedElement(
              <TransitionPage pageKey="dashboard">
                <DashboardView role={role} />
              </TransitionPage>
            )}
          />

          <Route
            path="/catalog"
            element={protectedElement(
              <TransitionPage pageKey="catalog">
                <CatalogView />
              </TransitionPage>
            )}
          />

          <Route
            path="/courses/:courseId"
            element={protectedElement(
              <TransitionPage pageKey="course-details">
                <CourseDetailsView />
              </TransitionPage>
            )}
          />

          <Route
            path="/learn/:courseId"
            element={protectedElement(
              <TransitionPage pageKey="learning-mode">
                <LearningModeView />
              </TransitionPage>
            )}
          />

          <Route
            path="/teach"
            element={protectedElement(
              <TransitionPage pageKey="teach">
                <TeachView role={role} />
              </TransitionPage>
            )}
          />

          <Route
            path="/application-success"
            element={protectedElement(
              <TransitionPage pageKey="application-success">
                <ApplicationSuccessView />
              </TransitionPage>
            )}
          />

          <Route
            path="/teach/course-builder"
            element={roleElement(
              ['instructor'],
              <TransitionPage pageKey="instructor-course-builder">
                <InstructorCourseBuilderView />
              </TransitionPage>,
              '/teach'
            )}
          />

          <Route
            path="/admin"
            element={roleElement(
              ['admin'],
              <TransitionPage pageKey="admin-dashboard">
                <AdminDashboardView role={role} />
              </TransitionPage>,
              '/dashboard'
            )}
          />

          <Route path="*" element={<Navigate to={isSignedIn ? defaultRoute : '/'} replace />} />
        </Routes>
      </AnimatePresence>

      {isSignedIn && <AuraChat courseId={selectedCourseId} />}
    </>
  )
}
