import { useState, useCallback } from "react";
import type { BackupFile } from "../types";
import { API_URL, getAuthToken } from "./utils";

export function useBackup() {
     const [backups, setBackups] = useState<BackupFile[]>([]);
     const [processing, setProcessing] = useState<Record<string, boolean>>({});

     const fetchBackups = useCallback(async () => {
          try {
               const token = getAuthToken();
               const response = await fetch(`${API_URL}/backfill/backup/list`, {
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    setBackups(data.backups || []);
               }
          } catch (error) {
               console.error("Error fetching backups:", error);
          }
     }, []);

     const handleCreateBackup = async (symbol: string, interval: string) => {
          const jobKey = `backup_${symbol}_${interval}`;
          setProcessing((prev) => ({ ...prev, [jobKey]: true }));

          try {
               const token = getAuthToken();
               const response = await fetch(`${API_URL}/backfill/backup/create?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
               });

               if (response.ok) {
                    const data = await response.json();
                    await fetchBackups();
                    return { success: true, message: data.message || "Backup created successfully" };
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || "Failed to create backup");
               }
          } catch (error) {
               console.error("Error creating backup:", error);
               throw error;
          } finally {
               setProcessing((prev) => ({ ...prev, [jobKey]: false }));
          }
     };

     const handleRestoreBackup = async (backupFile: string, replaceExisting: boolean = false, fetchJobs: () => Promise<any>, fetchDataStatus: () => Promise<void>): Promise<{ success: true; message: string } | undefined> => {
          if (!confirm(`Are you sure you want to restore from ${backupFile}?`)) {
               return undefined;
          }

          setProcessing((prev) => ({ ...prev, [`restore_${backupFile}`]: true }));

          try {
               const token = getAuthToken();
               const response = await fetch(`${API_URL}/backfill/backup/restore`, {
                    method: "POST",
                    headers: {
                         Authorization: `Bearer ${token}`,
                         "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                         backup_file: backupFile,
                         replace_existing: replaceExisting,
                    }),
               });

               if (response.ok) {
                    const data = await response.json();
                    await fetchJobs();
                    await fetchBackups();
                    await fetchDataStatus();
                    return { success: true, message: data.message || "Backup restored successfully" };
               } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || "Failed to restore backup");
               }
          } catch (error) {
               console.error("Error restoring backup:", error);
               throw error;
          } finally {
               setProcessing((prev) => ({ ...prev, [`restore_${backupFile}`]: false }));
          }
     };

     return {
          backups,
          processing,
          fetchBackups,
          handleCreateBackup,
          handleRestoreBackup,
     };
}

