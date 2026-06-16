'use client';

import { useState, useEffect, useCallback } from 'react';
import { startOfWeek, endOfMonth, addDays, format } from 'date-fns';
import {
  getTimesheetEntriesForWeek,
  getPublicHolidays,
  getTimesheetActionsForDateRange,
  getTimesheetApprovalsForDateRange,
  getTimesheetEmployeeSettings,
  getAllPeopleNames,
} from '@/lib/supabase/queries/timesheets';
import {
  computeMonthCompliance,
  type EmployeeMonthCompliance,
} from '@/lib/utils/timesheet-compliance';

export function useMonthlyCompliance(monthStart: Date) {
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');

  const [compliance, setCompliance] = useState<EmployeeMonthCompliance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const ms = new Date(monthStartStr + 'T00:00:00');
    const firstWeekStart = startOfWeek(ms, { weekStartsOn: 1 });
    const me = endOfMonth(ms);
    const lastWeekStart = startOfWeek(me, { weekStartsOn: 1 });
    const lastWeekEnd = addDays(lastWeekStart, 6);

    const fromStr = format(firstWeekStart, 'yyyy-MM-dd');
    const toStr = format(lastWeekEnd, 'yyyy-MM-dd');
    const toWeekStartStr = format(lastWeekStart, 'yyyy-MM-dd');

    setLoading(true);
    try {
      const [entries, holidays, actions, approvals, settings, peopleNames] = await Promise.all([
        getTimesheetEntriesForWeek(fromStr, toStr),
        getPublicHolidays(),
        getTimesheetActionsForDateRange(fromStr, toWeekStartStr),
        getTimesheetApprovalsForDateRange(fromStr, toWeekStartStr),
        getTimesheetEmployeeSettings(),
        getAllPeopleNames(),
      ]);

      const partTimeSet = new Set(settings.filter((s) => s.is_part_time).map((s) => s.employee_name));
      const offWorkSet = new Set(settings.filter((s) => s.is_off_work).map((s) => s.employee_name));
      const result = computeMonthCompliance(ms, entries, holidays, actions, approvals, partTimeSet, peopleNames, offWorkSet);
      setCompliance(result);
    } finally {
      setLoading(false);
    }
  }, [monthStartStr]);

  useEffect(() => {
    load();
  }, [load]);

  const compliantCount = compliance.filter((e) => e.isCompliant).length;
  const issueCount = compliance.filter((e) => !e.isCompliant).length;
  const totalHours = compliance.reduce((s, e) => s + e.totalWeekdayHours, 0);

  return { compliance, loading, compliantCount, issueCount, totalHours, refresh: load };
}
