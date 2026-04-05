"use client"

import { useEffect, useRef } from "react"
import { useApi } from "@/hooks/useApi"
import { useNotification } from "@/contexts/NotificationContext"

export function NotificationBanner() {
  const api = useApi()
  const { showNotification } = useNotification()
  const hasChecked = useRef(false)

  useEffect(() => {
    // Prevent strict mode double-firing
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkStatus = async () => {
      try {
        const response = await api.get("/api/v1/teach/status");
        if (response.data?.status === "success" && response.data.application) {
          const app = response.data.application;

          // 🚀 Fire the Global Engine!
          showNotification({
            type: app.status === "approved" ? "success" : "info",
            title: app.status === "approved" ? "Instructor Application Approved!" : "Instructor Application Update",
            message: app.status === "approved" 
              ? "Welcome to the team! You can now access the Studio to create and publish courses." 
              : "Your application was reviewed but not accepted at this time. Keep learning and try again later!",
            duration: 0, // 0 = Stays on screen until they click X
            onCloseCallback: async () => {
              // This runs the moment they click X on the global notification
              try {
                await api.put(`/api/v1/teach/dismiss/${app.id}`);
              } catch (error) {
                console.error("Failed to dismiss notification", error);
              }
            }
          });
        }
      } catch (error) {
        console.error("Failed to fetch application status", error);
      }
    };
    
    checkStatus();
  }, [api, showNotification]);

  // 🚀 This component no longer renders anything. The Global UI handles the visuals.
  return null; 
}