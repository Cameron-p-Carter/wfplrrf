import { eachDayOfInterval, format, getDay } from 'date-fns';

export interface TimesheetEntry {
  id: string;
  employee_name: string;
  entry_date: string;
  units: number;
  cost_centre: string;
  status: string;
}

export interface PublicHoliday {
  holiday_date: string;
  holiday_name: string;
  state: string;
}

export interface TimesheetAction {
  id: string;
  employee_name: string;
  week_start: string;
  action_type: 'slack' | 'call' | 'email';
  action_date: string;
  action_by: string | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
}

export interface TimesheetApproval {
  id: string;
  employee_name: string;
  week_start: string;
  violation_types: string[];
  approved_by: string;
  approval_reason: string | null;
  created_at: string;
}

export interface DayEntry {
  hours: number;
  costCentres: string[];
}

export interface Violations {
  underHours: boolean;
  weekendWork: string[];
  publicHolidayWork: string[];
  gapDays: string[];
}

export interface EmployeeCompliance {
  employeeName: string;
  totalHours: number;
  weekdayHours: number;
  dayEntries: Record<string, DayEntry>;
  violations: Violations;
  violationCount: number;
  isCompliant: boolean;
  hasApproval: boolean;
  approval: TimesheetApproval | null;
  actions: TimesheetAction[];
  latestAction: TimesheetAction | null;
}

const LEAVE_KEYWORDS = ['leave', 'holiday', 'sick', 'rdo', 'flex day', 'time off'];

function isLeaveOrHolidayCentre(costCentre: string): boolean {
  const lower = costCentre.toLowerCase();
  return LEAVE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function computeWeekCompliance(
  weekStart: Date,
  entries: TimesheetEntry[],
  holidays: PublicHoliday[],
  actions: TimesheetAction[],
  approvals: TimesheetApproval[]
): EmployeeCompliance[] {
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  const holidaySet = new Set(holidays.map((h) => h.holiday_date));

  // Mon–Fri days for this week
  const weekdays = eachDayOfInterval({ start: weekStart, end: new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000) });

  // Entries in range
  const weekEntries = entries.filter(
    (e) => e.entry_date >= weekStartStr && e.entry_date <= weekEndStr
  );

  // Group by employee
  const byEmployee = new Map<string, TimesheetEntry[]>();
  for (const e of weekEntries) {
    if (!byEmployee.has(e.employee_name)) byEmployee.set(e.employee_name, []);
    byEmployee.get(e.employee_name)!.push(e);
  }

  const results: EmployeeCompliance[] = [];

  for (const [employeeName, empEntries] of byEmployee) {
    const dayEntries: Record<string, DayEntry> = {};
    let totalHours = 0;

    for (const entry of empEntries) {
      if (!dayEntries[entry.entry_date]) {
        dayEntries[entry.entry_date] = { hours: 0, costCentres: [] };
      }
      dayEntries[entry.entry_date].hours += Number(entry.units);
      dayEntries[entry.entry_date].costCentres.push(entry.cost_centre);
      totalHours += Number(entry.units);
    }

    // Weekday hours only (Mon–Fri)
    const weekdayHours = weekdays.reduce((sum, day) => {
      const ds = format(day, 'yyyy-MM-dd');
      return sum + (dayEntries[ds]?.hours ?? 0);
    }, 0);

    // Violations
    const weekendWork: string[] = [];
    const publicHolidayWork: string[] = [];
    const gapDays: string[] = [];

    for (const entry of empEntries) {
      const dow = getDay(new Date(entry.entry_date + 'T00:00:00'));
      if (dow === 0 || dow === 6) {
        if (!weekendWork.includes(entry.entry_date)) weekendWork.push(entry.entry_date);
      }
    }

    for (const entry of empEntries) {
      if (holidaySet.has(entry.entry_date) && !isLeaveOrHolidayCentre(entry.cost_centre)) {
        if (!publicHolidayWork.includes(entry.entry_date)) publicHolidayWork.push(entry.entry_date);
      }
    }

    // Gap days: weekdays with no entries, excluding public holidays (PH = no entry required)
    for (const day of weekdays) {
      const ds = format(day, 'yyyy-MM-dd');
      if (!dayEntries[ds] && !holidaySet.has(ds)) gapDays.push(ds);
    }

    // Expected hours reduced by 8h per public holiday this week
    const publicHolidaysThisWeek = weekdays.filter((d) => holidaySet.has(format(d, 'yyyy-MM-dd'))).length;
    const expectedHours = Math.max(0, 40 - publicHolidaysThisWeek * 8);
    const underHours = weekdayHours < expectedHours;

    const violations: Violations = { underHours, weekendWork, publicHolidayWork, gapDays };
    const violationCount =
      (underHours ? 1 : 0) +
      weekendWork.length +
      publicHolidayWork.length +
      gapDays.length;

    const approval = approvals.find(
      (a) => a.employee_name === employeeName && a.week_start === weekStartStr
    ) ?? null;

    const empActions = actions
      .filter((a) => a.employee_name === employeeName && a.week_start === weekStartStr)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    results.push({
      employeeName,
      totalHours,
      weekdayHours,
      dayEntries,
      violations,
      violationCount,
      isCompliant: violationCount === 0 || !!approval,
      hasApproval: !!approval,
      approval,
      actions: empActions,
      latestAction: empActions[0] ?? null,
    });
  }

  return results.sort((a, b) => {
    if (a.isCompliant !== b.isCompliant) return a.isCompliant ? 1 : -1;
    if (a.violationCount !== b.violationCount) return b.violationCount - a.violationCount;
    return a.employeeName.localeCompare(b.employeeName);
  });
}

export function getWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

export function formatDayShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}
