'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  getTimesheetUploads,
  getTimesheetStats,
  uploadTimesheetCSV,
  deleteAllTimesheetData,
  type TimesheetUpload,
} from '@/lib/supabase/queries/timesheets';
import { parseTimesheetCSV } from '@/lib/utils/csv-parser';

interface TimesheetStats {
  totalEntries: number;
  totalEmployees: number;
  latestUpload: TimesheetUpload | null;
}

export function useTimesheets() {
  const [uploads, setUploads] = useState<TimesheetUpload[]>([]);
  const [stats, setStats] = useState<TimesheetStats>({ totalEntries: 0, totalEmployees: 0, latestUpload: null });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [uploadData, statsData] = await Promise.all([
        getTimesheetUploads(),
        getTimesheetStats(),
      ]);
      setUploads(uploadData);
      setStats(statsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const text = await file.text();
        const rows = parseTimesheetCSV(text);
        if (rows.length === 0) {
          toast.error('No valid rows found. Check the CSV format.');
          return null;
        }
        const result = await uploadTimesheetCSV(file.name, rows);
        toast.success(
          `Uploaded ${result.newRows} new entries` +
            (result.duplicateRows > 0 ? ` · ${result.duplicateRows} duplicates skipped` : '')
        );
        await refresh();
        return result;
      } catch {
        toast.error('Upload failed. Please check the CSV format and try again.');
        return null;
      } finally {
        setUploading(false);
      }
    },
    [refresh]
  );

  const clearAll = useCallback(async () => {
    try {
      await deleteAllTimesheetData();
      toast.success('All timesheet data cleared');
      await refresh();
    } catch {
      toast.error('Failed to clear data');
    }
  }, [refresh]);

  return { uploads, stats, loading, uploading, handleFileUpload, clearAll, refresh };
}
