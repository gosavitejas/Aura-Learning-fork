import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { GlobalNotificationUI } from '@/components/ui/global-notification';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationOptions {
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; 
  onCloseCallback?: () => void; // 🚀 Allows the UI to trigger specific API calls when closed
}

interface NotificationContextType {
  showNotification: (options: NotificationOptions) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<NotificationOptions | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const hideNotification = useCallback(() => {
    // If the notification had a specific close action (like dismissing from the DB), run it!
    if (notification?.onCloseCallback) {
      notification.onCloseCallback();
    }
    
    setNotification(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [notification]);

  const showNotification = useCallback((options: NotificationOptions) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    setNotification(options);

    // Auto-dismiss after duration (default 5s). If duration is 0, it stays forever until X is clicked.
    const duration = options.duration !== undefined ? options.duration : 5000;
    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        hideNotification();
      }, duration);
    }
  }, [hideNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <GlobalNotificationUI notification={notification} onClose={hideNotification} />
    </NotificationContext.Provider>
  );
}

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};