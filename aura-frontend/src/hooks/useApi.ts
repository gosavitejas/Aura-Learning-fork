import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { useMemo } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useApi() {
  const { getToken } = useAuth();

  // useMemo caches the Axios instance so it doesn't trigger infinite loops in useEffects
  const apiClient = useMemo(() => {
    const client = axios.create({
      baseURL: API_BASE_URL,
    });

    // Intercept every request to inject the secure Clerk token
    client.interceptors.request.use(async (config) => {
      try {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error("Failed to fetch Clerk token", error);
      }
      return config;
    });

    return client;
  }, [getToken]); // Only recreate if Clerk's token function changes

  return apiClient;
}