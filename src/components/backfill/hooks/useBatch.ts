import { useState, useCallback } from "react";
import type { BatchBackfillJob } from "../types";
import { API_URL, getAuthToken } from "./utils";

export function useBatch(selectedAccountId: number | null) {
     const [batchJobs, setBatchJobs] = useState<BatchBackfillJob[]>([]);
     const [batchFormData, setBatchFormData] = useState({
          exchange_account_id: selectedAccountId || 0,
          symbols: [] as string[],
          intervals: [] as string[],
          total_pages_per_job: 18,
          auto_backup: true,
     });
     const [processing, setProcessing] = useState<Record<string, boolean>>({});

     const fetchBatchJobs = useCallback(async () => {
          try {
               const token = getAuthToken();
               const response = await fetch(`${API_URL}/backfill/batch/jobs`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setBatchJobs(data.jobs || []);
                    return { success: true };
               } else {
                    if (response.status === 401) {
                         throw new Error("Please login to view batch backfill jobs");
                    } else if (response.status === 404) {
                         setBatchJobs([]);
                         return { success: true };
                    } else {
                         const errorData = await response.json().catch(() => ({}));
                         throw new Error(errorData.detail || "Failed to load batch jobs");
                    }
               }
          } catch (error) {
               console.error("Error fetching batch jobs:", error);
               if (batchJobs.length === 0) {
                    throw new Error("Failed to load batch backfill jobs. Please check your connection.");
               }
               throw error;
          }
     }, [batchJobs.length]);

     const handleStartBatch = async () => {
          if (!batchFormData.exchange_account_id) {
               throw new Error("Please select an exchange account");
          }

          if (batchFormData.symbols.length === 0) {
               throw new Error("Please select at least one symbol");
          }

          if (batchFormData.intervals.length === 0) {
               throw new Error("Please select at least one interval");
          }

          try {
               const token = getAuthToken();
               const response = await fetch(`${API_URL}/backfill/batch/start`, {
                    method: "POST",
                    headers: {
                         Authorization: `Bearer ${token}`,
                         "Content-Type": "application/json",
                    },
                    body: JSON.stringify(batchFormData),
               });

               if (response.ok) {
                    const data = await response.json();
                    setBatchFormData((prev) => ({
                         ...prev,
                         symbols: [],
                         intervals: [],
                    }));
                    await fetchBatchJobs();
                    return { success: true, message: data.message || "Batch backfill started successfully" };
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || "Failed to start batch backfill");
               }
          } catch (error) {
               console.error("Error starting batch backfill:", error);
               throw error;
          }
     };

     const handleProcessBatch = useCallback(async (batchId: string) => {
          const jobKey = `batch_${batchId}`;
          if (processing[jobKey]) return;

          setProcessing((prev) => ({ ...prev, [jobKey]: true }));

          try {
               const token = getAuthToken();
               const response = await fetch(`${API_URL}/backfill/batch/process/${batchId}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    await fetchBatchJobs();
                    return { success: true, message: data.message || "Batch processing started" };
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || "Failed to process batch");
               }
          } catch (error) {
               console.error("Error processing batch:", error);
               throw error;
          } finally {
               setProcessing((prev) => ({ ...prev, [jobKey]: false }));
          }
     }, [processing, fetchBatchJobs]);

     return {
          batchJobs,
          batchFormData,
          setBatchFormData,
          processing,
          fetchBatchJobs,
          handleStartBatch,
          handleProcessBatch,
     };
}

