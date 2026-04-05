import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, Info, X } from "lucide-react"

interface NotificationProps {
  notification: {
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null;
  onClose: () => void;
}

export function GlobalNotificationUI({ notification, onClose }: NotificationProps) {
  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.4, type: "spring", bounce: 0.25 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50 pointer-events-auto"
        >
          <div className={`p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border backdrop-blur-xl flex items-start sm:items-center justify-between gap-4 transition-colors duration-300
            ${notification.type === 'success' ? "bg-emerald-50/90 border-emerald-200/60" : ""}
            ${notification.type === 'error' ? "bg-rose-50/90 border-rose-200/60" : ""}
            ${notification.type === 'info' ? "bg-slate-50/90 border-slate-200/60" : ""}
          `}>
            
            <div className="flex items-start sm:items-center gap-3">
              {notification.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />}
              {notification.type === 'error' && <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />}
              {notification.type === 'info' && <Info className="w-6 h-6 text-slate-500 shrink-0 mt-0.5 sm:mt-0" />}
              
              <div>
                <h4 className={`text-sm font-bold 
                  ${notification.type === 'success' ? "text-emerald-900" : ""}
                  ${notification.type === 'error' ? "text-rose-900" : ""}
                  ${notification.type === 'info' ? "text-slate-900" : ""}
                `}>
                  {notification.title}
                </h4>
                <p className={`text-sm font-medium mt-0.5 
                  ${notification.type === 'success' ? "text-emerald-700" : ""}
                  ${notification.type === 'error' ? "text-rose-700" : ""}
                  ${notification.type === 'info' ? "text-slate-600" : ""}
                `}>
                  {notification.message}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`shrink-0 p-2 rounded-full transition-colors cursor-pointer
                ${notification.type === 'success' ? "hover:bg-emerald-100 text-emerald-600" : ""}
                ${notification.type === 'error' ? "hover:bg-rose-100 text-rose-600" : ""}
                ${notification.type === 'info' ? "hover:bg-slate-200 text-slate-500" : ""}
              `}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}