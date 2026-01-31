import { useState, useCallback } from "react";
import type { BackfillJob } from "../types";
import { API_URL, getAuthToken, calculatePages } from "./utils";

export function useJobs() {
     const [jobs, setJobs] = useState<BackfillJob[]>([]);
     const [loading, setLoading] = useState(false);
     const [processing, setProcessing] = useState<Record<string, boolean>>({});
     const [autoProcessingJobs, setAutoProcessingJobs] = useState<Set<string>>(new Set());

     const fetchJobs = useCallback(async () => {
          try {
               const token = getAuthToken();
               const response = await fetch(`${API_URL}/backfill/jobs`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setJobs(data.jobs || []);
                    return { success: true };
               } else {
                    if (response.status === 401) {
                         throw new Error("Please login to view backfill jobs");
                    } else if (response.status === 404) {
                         setJobs([]);
                         return { success: true };
                    } else {
                         const errorData = await response.json().catch(() => ({}));
                         throw new Error(errorData.detail || "Failed to load jobs");
                    }
               }
          } catch (error) {
               console.error("Error fetching jobs:", error);
               if (jobs.length === 0) {
                    throw new Error("Failed to load backfill jobs. Please check your connection.");
               }
               throw error;
          }
     }, [jobs.length]);

     const startBackfillForSymbol = async (symbol: string, interval: string, totalPages?: number, resume: boolean = false) => {
          setLoading(true);
          try {
               const token = getAuthToken();
               const pages = totalPages || calculatePages(interval);
               const response = await fetch(`${API_URL}/backfill/start`, {
                    method: "POST",
                    headers: {
                         Authorization: `Bearer ${token}`,
                         "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                         symbol: symbol,
                         interval: interval,
                         total_pages: pages,
                         resume: resume,
                    }),
               });

               if (response.ok) {
                    const data = await response.json();
                    await fetchJobs();
                    return { success: true, message: data.message };
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    return { success: false, message: errorData.detail || "Failed to start backfill" };
               }
          } catch (error) {
               console.error("Error starting backfill:", error);
               return { success: false, message: "Failed to start backfill" };
          } finally {
               setLoading(false);
          }
     };

     const handlePause = async (symbol: string, interval: string) => {
          const jobKey = `${symbol}_${interval}`;
          setProcessing((prev) => ({ ...prev, [jobKey]: true }));

          setAutoProcessingJobs((prev) => {
               const newSet = new Set(prev);
               newSet.delete(jobKey);
               return newSet;
          });

          try {
               const token = getAuthToken();
               const response = await fetch(`${API_URL}/backfill/pause?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    await fetchJobs();
                    return { success: true, message: data.message || "Backfill paused" };
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || "Failed to pause backfill");
               }
          } catch (error) {
               console.error("Error pausing backfill:", error);
               throw error;
          } finally {
               setProcessing((prev) => ({ ...prev, [jobKey]: false }));
          }
     };

     const handleUpdate = async (symbol: string, interval: string, fetchDataStatus: () => Promise<void>) => {
          const jobKey = `update_${symbol}_${interval}`;
          setProcessing((prev) => ({ ...prev, [jobKey]: true }));

          try {
               const token = getAuthToken();
               const url = `${API_URL}/backfill/update?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`;
               
               const response = await fetch(url, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });
               
               if (response.ok) {
                    const data = await response.json();
                    await fetchJobs();
                    await fetchDataStatus();
                    if (data.status === "success") {
                         return { success: true, message: data.message || `Updated ${data.candles_added || 0} new candles` };
                    } else {
                         throw new Error(data.message || "Failed to update candles");
                    }
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || "Failed to update candles");
               }
          } catch (error) {
               console.error("Error updating candles:", error);
               throw error;
          } finally {
               setProcessing((prev) => ({ ...prev, [jobKey]: false }));
          }
     };

     const handleProcess = useCallback(async (symbol: string, interval: string, autoContinue: boolean = false, fetchDataStatus: () => Promise<void>) => {
          const jobKey = `${symbol}_${interval}`;
          
          if (processing[jobKey]) {
               return;
          }

          setProcessing((prev) => ({ ...prev, [jobKey]: true }));

          try {
               const token = getAuthToken();
               const response = await fetch(`${API_URL}/backfill/process?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&auto_continue=${autoContinue}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    await fetchJobs();
                    await fetchDataStatus();
                    
                    if (data.status === "completed") {
                         setAutoProcessingJobs((prev) => {
                              const newSet = new Set(prev);
                              newSet.delete(jobKey);
                              return newSet;
                         });
                    }
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || "Failed to process backfill");
               }
          } catch (error) {
               console.error("Error processing backfill:", error);
               throw error;
          } finally {
               setProcessing((prev) => ({ ...prev, [jobKey]: false }));
          }
     }, [processing, fetchJobs]);

     const toggleAutoProcess = (symbol: string, interval: string) => {
          const jobKey = `${symbol}_${interval}`;
          setAutoProcessingJobs((prev) => {
               const newSet = new Set(prev);
               if (newSet.has(jobKey)) {
                    newSet.delete(jobKey);
               } else {
                    newSet.add(jobKey);
               }
               return newSet;
          });
     };

     return {
          jobs,
          loading,
          processing,
          autoProcessingJobs,
          fetchJobs,
          startBackfillForSymbol,
          handlePause,
          handleUpdate,
          handleProcess,
          toggleAutoProcess,
     };
}

