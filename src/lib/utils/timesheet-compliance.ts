import { eachDayOfInterval, format, getDay, startOfWeek, endOfMonth, addDays } from 'date-fns';

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
  overHours: boolean;
  weekendWork: string[];
  gapDays: string[];
}

export interface EmployeeCompliance {
  employeeName: string;
  totalHours: number;
  weekdayHours: number;
  expectedHours: number;
  publicHolidaysThisWeek: number;
  dayEntries: Record<string, DayEntry>;
  violations: Violations;
  violationCount: number;
  isCompliant: boolean;
  isPartTime: boolean;
  isOffWork: boolean;
  hasApproval: boolean;
  approval: TimesheetApproval | null;
  actions: TimesheetAction[];
  latestAction: TimesheetAction | null;
}

export function computeWeekCompliance(
  weekStart: Date,
  entries: TimesheetEntry[],
  holidays: PublicHoliday[],
  actions: TimesheetAction[],
  approvals: TimesheetApproval[],
  partTimeEmployees: Set<string> = new Set(),
  allEmployeeNames: string[] = [],
  offWorkEmployees: Set<string> = new Set(),
  nameMappings: Map<string, string> = new Map()
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

  // Group by employee, applying name mappings (timesheet name → canonical display name)
  const byEmployee = new Map<string, TimesheetEntry[]>();
  for (const e of weekEntries) {
    const name = nameMappings.get(e.employee_name) ?? e.employee_name;
    if (!byEmployee.has(name)) byEmployee.set(name, []);
    byEmployee.get(name)!.push(e);
  }

  const results: EmployeeCompliance[] = [];

  for (const [employeeName, empEntries] of byEmployee) {
    if (offWorkEmployees.has(employeeName)) continue;

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
    const gapDays: string[] = [];

    for (const entry of empEntries) {
      const dow = getDay(new Date(entry.entry_date + 'T00:00:00'));
      if (dow === 0 || dow === 6) {
        if (!weekendWork.includes(entry.entry_date)) weekendWork.push(entry.entry_date);
      }
    }

    // Gap days: weekdays with no entries, excluding public holidays (PH = no entry required)
    for (const day of weekdays) {
      const ds = format(day, 'yyyy-MM-dd');
      if (!dayEntries[ds] && !holidaySet.has(ds)) gapDays.push(ds);
    }

    // Expected hours reduced by 8h per public holiday this week
    const isPartTime = partTimeEmployees.has(employeeName);
    const publicHolidaysThisWeek = weekdays.filter((d) => holidaySet.has(format(d, 'yyyy-MM-dd'))).length;
    const expectedHours = Math.max(0, 40 - publicHolidaysThisWeek * 8);
    const underHours = !isPartTime && weekdayHours < expectedHours;
    const overHours = !isPartTime && weekdayHours > 40;
    if (isPartTime) gapDays.length = 0;

    const violations: Violations = { underHours, overHours, weekendWork, gapDays };
    const violationCount =
      (underHours ? 1 : 0) +
      (overHours ? 1 : 0) +
      weekendWork.length +
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
      expectedHours,
      publicHolidaysThisWeek,
      dayEntries,
      violations,
      violationCount,
      isCompliant: violationCount === 0 || !!approval,
      isPartTime,
      isOffWork: false,
      hasApproval: !!approval,
      approval,
      actions: empActions,
      latestAction: empActions[0] ?? null,
    });
  }

  // Add employees from the known list who submitted no entries at all
  for (const employeeName of allEmployeeNames) {
    if (byEmployee.has(employeeName)) continue;
    if (offWorkEmployees.has(employeeName)) continue;

    const isPartTime = partTimeEmployees.has(employeeName);
    const publicHolidaysThisWeek = weekdays.filter((d) => holidaySet.has(format(d, 'yyyy-MM-dd'))).length;
    const expectedHours = Math.max(0, 40 - publicHolidaysThisWeek * 8);

    const gapDays = isPartTime
      ? []
      : weekdays.map((d) => format(d, 'yyyy-MM-dd')).filter((ds) => !holidaySet.has(ds));

    const underHours = !isPartTime;
    const violations: Violations = { underHours, overHours: false, weekendWork: [], gapDays };
    const violationCount = (underHours ? 1 : 0) + gapDays.length;

    const approval = approvals.find(
      (a) => a.employee_name === employeeName && a.week_start === weekStartStr
    ) ?? null;

    const empActions = actions
      .filter((a) => a.employee_name === employeeName && a.week_start === weekStartStr)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    results.push({
      employeeName,
      totalHours: 0,
      weekdayHours: 0,
      expectedHours,
      publicHolidaysThisWeek,
      dayEntries: {},
      violations,
      violationCount,
      isCompliant: violationCount === 0 || !!approval,
      isPartTime,
      isOffWork: false,
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

export interface WeekSummary {
  weekStart: string;
  weekLabel: string;
  weekdayHours: number;
  totalHours: number;
  violations: Violations;
  violationCount: number;
  isCompliant: boolean;
  hasApproval: boolean;
}

export interface EmployeeMonthCompliance {
  employeeName: string;
  totalMonthHours: number;
  totalWeekdayHours: number;
  weeks: WeekSummary[];
  totalViolationCount: number;
  compliantWeeks: number;
  issueWeeks: number;
  isCompliant: boolean;
  hasAnyApproval: boolean;
  actions: TimesheetAction[];
  latestAction: TimesheetAction | null;
}

export function computeMonthCompliance(
  monthStart: Date,
  entries: TimesheetEntry[],
  holidays: PublicHoliday[],
  actions: TimesheetAction[],
  approvals: TimesheetApproval[],
  partTimeEmployees: Set<string> = new Set(),
  allEmployeeNames: string[] = [],
  offWorkEmployees: Set<string> = new Set(),
  nameMappings: Map<string, string> = new Map()
): EmployeeMonthCompliance[] {
  const monthEnd = endOfMonth(monthStart);

  // Collect all Mondays whose weekdays (Mon–Fri) overlap with this month
  const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const weekStarts: Date[] = [];
  let ws = firstWeekStart;
  while (ws <= monthEnd) {
    const fri = addDays(ws, 4);
    if (fri >= monthStart) weekStarts.push(new Date(ws));
    ws = addDays(ws, 7);
  }

  // Compute per-week compliance for each overlapping week
  const allWeekCompliances = weekStarts.map((w) =>
    computeWeekCompliance(w, entries, holidays, actions, approvals, partTimeEmployees, allEmployeeNames, offWorkEmployees, nameMappings)
  );

  // Union of all employees who appear in any week
  const employeeNames = new Set<string>();
  for (const wc of allWeekCompliances) {
    for (const emp of wc) employeeNames.add(emp.employeeName);
  }

  const results: EmployeeMonthCompliance[] = [];

  for (const employeeName of employeeNames) {
    const weeks: WeekSummary[] = [];
    let totalWeekdayHours = 0;
    let totalMonthHours = 0;
    let totalViolationCount = 0;
    let compliantWeeks = 0;
    let issueWeeks = 0;

    for (let i = 0; i < weekStarts.length; i++) {
      const empWeek = allWeekCompliances[i].find((e) => e.employeeName === employeeName);
      if (!empWeek) continue;

      totalWeekdayHours += empWeek.weekdayHours;
      totalMonthHours += empWeek.totalHours;
      if (empWeek.isCompliant) compliantWeeks++;
      else {
        issueWeeks++;
        totalViolationCount += empWeek.violationCount;
      }

      weeks.push({
        weekStart: format(weekStarts[i], 'yyyy-MM-dd'),
        weekLabel: getWeekLabel(weekStarts[i]),
        weekdayHours: empWeek.weekdayHours,
        totalHours: empWeek.totalHours,
        violations: empWeek.violations,
        violationCount: empWeek.violationCount,
        isCompliant: empWeek.isCompliant,
        hasApproval: empWeek.hasApproval,
      });
    }

    const empActions = actions
      .filter((a) => a.employee_name === employeeName)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    results.push({
      employeeName,
      totalMonthHours,
      totalWeekdayHours,
      weeks,
      totalViolationCount,
      compliantWeeks,
      issueWeeks,
      isCompliant: issueWeeks === 0,
      hasAnyApproval: weeks.some((w) => w.hasApproval),
      actions: empActions,
      latestAction: empActions[0] ?? null,
    });
  }

  return results.sort((a, b) => {
    if (a.isCompliant !== b.isCompliant) return a.isCompliant ? 1 : -1;
    if (a.issueWeeks !== b.issueWeeks) return b.issueWeeks - a.issueWeeks;
    return a.employeeName.localeCompare(b.employeeName);
  });
}

export function getMonthLabel(monthStart: Date): string {
  return monthStart.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
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
