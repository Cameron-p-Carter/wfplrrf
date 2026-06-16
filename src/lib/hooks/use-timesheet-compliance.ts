'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  getTimesheetEntriesForWeek,
  getPublicHolidays,
  getTimesheetActionsForWeek,
  getTimesheetApprovalsForWeek,
  getTimesheetEmployeeSettings,
  getAllPeopleNames,
  setEmployeePartTime,
  setEmployeeOffWork,
  logTimesheetAction,
  upsertTimesheetApproval,
} from '@/lib/supabase/queries/timesheets';
import { computeWeekCompliance, type EmployeeCompliance } from '@/lib/utils/timesheet-compliance';

export function useTimesheetCompliance(weekStart: Date) {
  const [compliance, setCompliance] = useState<EmployeeCompliance[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(
    new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    'yyyy-MM-dd'
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [entries, holidays, actions, approvals, settings, peopleNames] = await Promise.all([
        getTimesheetEntriesForWeek(weekStartStr, weekEndStr),
        getPublicHolidays(),
        getTimesheetActionsForWeek(weekStartStr),
        getTimesheetApprovalsForWeek(weekStartStr),
        getTimesheetEmployeeSettings(),
        getAllPeopleNames(),
      ]);
      const partTimeSet = new Set(settings.filter((s) => s.is_part_time).map((s) => s.employee_name));
      const offWorkSet = new Set(settings.filter((s) => s.is_off_work).map((s) => s.employee_name));
      const computedWeekStart = new Date(weekStartStr + 'T00:00:00');
      const results = computeWeekCompliance(computedWeekStart, entries, holidays, actions, approvals, partTimeSet, peopleNames, offWorkSet);
      setCompliance(results);
    } finally {
      setLoading(false);
    }
  }, [weekStartStr, weekEndStr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logAction = useCallback(
    async (employeeName: string, actionType: 'slack' | 'call' | 'email', notes?: string) => {
      try {
        await logTimesheetAction({
          employee_name: employeeName,
          week_start: weekStartStr,
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
    [weekStartStr, refresh]
  );

  const approveException = useCallback(
    async (employeeName: string, violationTypes: string[], reason: string, approvedBy: string) => {
      try {
        await upsertTimesheetApproval({
          employee_name: employeeName,
          week_start: weekStartStr,
          violation_types: violationTypes,
          approved_by: approvedBy,
          approval_reason: reason,
        });
        toast.success(`Exception approved for ${employeeName}`);
        await refresh();
      } catch {
        toast.error('Failed to save approval');
      }
    },
    [weekStartStr, refresh]
  );

  const togglePartTime = useCallback(
    async (employeeName: string, isPartTime: boolean) => {
      try {
        await setEmployeePartTime(employeeName, isPartTime);
        await refresh();
      } catch {
        toast.error('Failed to update part-time setting');
      }
    },
    [refresh]
  );

  const toggleOffWork = useCallback(
    async (employeeName: string, isOffWork: boolean) => {
      try {
        await setEmployeeOffWork(employeeName, isOffWork);
        await refresh();
      } catch {
        toast.error('Failed to update off-work setting');
      }
    },
    [refresh]
  );

  const compliantCount = compliance.filter((e) => e.isCompliant).length;
  const issueCount = compliance.filter((e) => !e.isCompliant).length;

  return {
    compliance,
    loading,
    compliantCount,
    issueCount,
    logAction,
    approveException,
    togglePartTime,
    toggleOffWork,
    refresh,
  };
}
