'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  getEmployeeEntries,
  getPublicHolidays,
  getAllEmployeeActions,
  getAllEmployeeApprovals,
  logTimesheetAction,
  upsertTimesheetApproval,
  type TimesheetEntry,
  type TimesheetAction,
  type TimesheetApproval,
  type PublicHoliday,
} from '@/lib/supabase/queries/timesheets';

export interface EmployeeTimesheetData {
  entries: TimesheetEntry[];
  holidays: PublicHoliday[];
  actions: TimesheetAction[];
  approvals: TimesheetApproval[];
  loading: boolean;
}

export function useEmployeeTimesheet(
  employeeName: string,
  fromDate: string,
  toDate: string
) {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [actions, setActions] = useState<TimesheetAction[]>([]);
  const [approvals, setApprovals] = useState<TimesheetApproval[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!employeeName) return;
    setLoading(true);
    try {
      const [entryData, holidayData, actionData, approvalData] = await Promise.all([
        getEmployeeEntries(employeeName, fromDate, toDate),
        getPublicHolidays(),
        getAllEmployeeActions(employeeName),
        getAllEmployeeApprovals(employeeName),
      ]);
      setEntries(entryData);
      setHolidays(holidayData);
      setActions(actionData);
      setApprovals(approvalData);
    } finally {
      setLoading(false);
    }
  }, [employeeName, fromDate, toDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logAction = useCallback(
    async (weekStart: string, actionType: 'slack' | 'call' | 'email', notes?: string) => {
      try {
        await logTimesheetAction({
          employee_name: employeeName,
          week_start: weekStart,
          action_type: actionType,
          action_date: format(new Date(), 'yyyy-MM-dd'),
          action_by: null,
          outcome: null,
          notes: notes ?? null,
        });
        const label = actionType === 'slack' ? 'Slack' : actionType === 'call' ? 'Call' : 'Email';
        toast.success(`${label} logged for ${employeeName}`);
        await refresh();
      } catch {
        toast.error('Failed to log action');
      }
    },
    [employeeName, refresh]
  );

  const approveException = useCallback(
    async (weekStart: string, violationTypes: string[], reason: string, approvedBy: string) => {
      try {
        await upsertTimesheetApproval({
          employee_name: employeeName,
          week_start: weekStart,
          violation_types: violationTypes,
          approved_by: approvedBy,
          approval_reason: reason,
        });
        toast.success('Exception approved');
        await refresh();
      } catch {
        toast.error('Failed to save approval');
      }
    },
    [employeeName, refresh]
  );

  return { entries, holidays, actions, approvals, loading, logAction, approveException, refresh };
}
