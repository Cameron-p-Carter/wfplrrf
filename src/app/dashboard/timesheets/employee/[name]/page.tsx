"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  eachDayOfInterval,
  format,
  getDay,
  isSameMonth,
  isToday,
  isFuture,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  MessageSquare,
  Phone,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEmployeeTimesheet } from "@/lib/hooks/use-employee-timesheet";
import type { TimesheetEntry } from "@/lib/supabase/queries/timesheets";

// ─── helpers ────────────────────────────────────────────────────────────────

const LEAVE_KW = ["leave", "holiday", "sick", "rdo", "flex day", "time off"];
function isLeaveCC(cc: string) {
  const l = cc.toLowerCase();
  return LEAVE_KW.some((k) => l.includes(k));
}

type DayStatus =
  | "future"
  | "weekend_empty"
  | "weekend_work"
  | "gap"
  | "partial"
  | "full"
  | "over"
  | "holiday_ok"
  | "holiday_wrong";

function getDayStatus(
  date: Date,
  entries: TimesheetEntry[],
  isHoliday: boolean
): DayStatus {
  const dow = getDay(date);
  const isWeekend = dow === 0 || dow === 6;
  const total = entries.reduce((s, e) => s + Number(e.units), 0);
  const future = isFuture(date) && !isToday(date);

  if (future) return "future";
  if (isWeekend) return total > 0 ? "weekend_work" : "weekend_empty";

  if (isHoliday) {
    if (total === 0) return "gap";
    return entries.some((e) => isLeaveCC(e.cost_centre)) ? "holiday_ok" : "holiday_wrong";
  }

  if (total === 0) return "gap";
  if (total < 8) return "partial";
  if (total > 8) return "over";
  return "full";
}

const STATUS = {
  future:         { header: "bg-muted/20 text-muted-foreground/50 border-muted/20", badge: "", label: "" },
  weekend_empty:  { header: "bg-slate-50 text-slate-400 border-slate-100",          badge: "", label: "" },
  weekend_work:   { header: "bg-orange-100 text-orange-700 border-orange-200",       badge: "bg-orange-100 text-orange-700 border-orange-200", label: "Weekend work" },
  gap:            { header: "bg-red-100 text-red-700 border-red-200",               badge: "bg-red-100 text-red-700 border-red-200", label: "No entry" },
  partial:        { header: "bg-amber-100 text-amber-700 border-amber-200",         badge: "bg-amber-100 text-amber-700 border-amber-200", label: "Under 8h" },
  full:           { header: "bg-emerald-100 text-emerald-700 border-emerald-200",   badge: "", label: "" },
  over:           { header: "bg-blue-100 text-blue-700 border-blue-200",            badge: "bg-blue-100 text-blue-700 border-blue-200", label: "Over 8h" },
  holiday_ok:     { header: "bg-violet-100 text-violet-700 border-violet-200",      badge: "", label: "" },
  holiday_wrong:  { header: "bg-orange-100 text-orange-700 border-orange-200",      badge: "bg-orange-100 text-orange-700 border-orange-200", label: "Wrong cost centre" },
};

const MONTH_CELL = {
  future:         "bg-transparent text-muted-foreground/30",
  weekend_empty:  "bg-slate-50 text-slate-300",
  weekend_work:   "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
  gap:            "bg-red-100 text-red-700 ring-1 ring-red-200",
  partial:        "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  full:           "bg-emerald-100 text-emerald-700",
  over:           "bg-blue-100 text-blue-700",
  holiday_ok:     "bg-violet-100 text-violet-700",
  holiday_wrong:  "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
};

// ─── week day card ───────────────────────────────────────────────────────────

function WeekDayCard({
  date,
  dayEntries,
  isHoliday,
  holidayName,
}: {
  date: Date;
  dayEntries: TimesheetEntry[];
  isHoliday: boolean;
  holidayName?: string;
}) {
  const status = getDayStatus(date, dayEntries, isHoliday);
  const total = dayEntries.reduce((s, e) => s + Number(e.units), 0);
  const s = STATUS[status];
  const today = isToday(date);

  return (
    <div
      className={`flex flex-col rounded-xl border-2 overflow-hidden min-h-[220px] ${s.header} ${
        today ? "ring-2 ring-primary ring-offset-1" : ""
      }`}
    >
      {/* Day header */}
      <div className="px-3 pt-3 pb-2">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-70">
          {format(date, "EEE")}
        </div>
        <div className="text-2xl font-bold leading-none">{format(date, "d")}</div>
        <div className="text-xs mt-0.5 opacity-70">{format(date, "MMM yyyy")}</div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-background/60 px-3 py-2.5 space-y-1.5">
        {isHoliday && holidayName && (
          <div className="text-xs font-medium text-violet-600 truncate">
            📅 {holidayName}
          </div>
        )}

        {total > 0 && (
          <div className="text-sm font-bold">{total % 1 === 0 ? total : total.toFixed(1)}h</div>
        )}

        {dayEntries.map((e, i) => (
          <div key={i} className="space-y-0.5">
            <div className="text-xs font-medium leading-snug line-clamp-2">{e.cost_centre}</div>
            <div className="text-xs text-muted-foreground">{Number(e.units).toFixed(1)}h · {e.status}</div>
          </div>
        ))}

        {s.label && (
          <div className={`text-xs font-semibold flex items-center gap-1 mt-1 ${
            status === "gap" || status === "weekend_work" || status === "holiday_wrong"
              ? "text-inherit"
              : "text-inherit opacity-80"
          }`}>
            {(status === "gap" || status === "partial") && <AlertCircle className="h-3 w-3 flex-shrink-0" />}
            {s.label}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── month cell ──────────────────────────────────────────────────────────────

function MonthCell({
  date,
  dayEntries,
  isHoliday,
  inCurrentMonth,
}: {
  date: Date;
  dayEntries: TimesheetEntry[];
  isHoliday: boolean;
  inCurrentMonth: boolean;
}) {
  const status = getDayStatus(date, dayEntries, isHoliday);
  const total = dayEntries.reduce((s, e) => s + Number(e.units), 0);
  const cellClass = inCurrentMonth ? MONTH_CELL[status] : "bg-transparent text-muted-foreground/20";
  const today = isToday(date);

  return (
    <div
      className={`relative flex flex-col items-center justify-start rounded-lg p-1.5 min-h-[64px] transition-colors ${cellClass} ${
        today ? "ring-2 ring-primary ring-offset-1" : ""
      }`}
    >
      <span className={`text-xs font-semibold ${today ? "text-primary" : ""}`}>
        {format(date, "d")}
      </span>
      {inCurrentMonth && total > 0 && (
        <span className="text-xs font-bold mt-0.5">
          {total % 1 === 0 ? total : total.toFixed(1)}h
        </span>
      )}
      {inCurrentMonth && isHoliday && (
        <span className="text-[9px] text-violet-500 font-medium mt-0.5">PH</span>
      )}
      {inCurrentMonth && status === "gap" && (
        <XCircle className="h-3 w-3 mt-0.5 opacity-60" />
      )}
    </div>
  );
}

// ─── approve dialog ───────────────────────────────────────────────────────────

function ApproveDialog({
  open,
  weekStart,
  onConfirm,
  onClose,
}: {
  open: boolean;
  weekStart: string;
  onConfirm: (reason: string, approvedBy: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [approvedBy, setApprovedBy] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Exception</DialogTitle>
          <DialogDescription>
            Grant a manager exception for week of{" "}
            {new Date(weekStart + "T00:00:00").toLocaleDateString("en-AU", {
              day: "numeric", month: "short", year: "numeric",
            })}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Approved by (manager name)</Label>
            <Input
              placeholder="e.g. John Smith"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              placeholder="e.g. On approved client site with no system access"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!reason.trim() || !approvedBy.trim()}
            onClick={() => {
              onConfirm(reason.trim(), approvedBy.trim());
              setReason("");
              setApprovedBy("");
              onClose();
            }}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── action panel ─────────────────────────────────────────────────────────────

function WeekActionPanel({
  weekStart,
  weekEnd,
  weekdayHours,
  actions,
  approval,
  onSlack,
  onCall,
  onApprove,
}: {
  weekStart: string;
  weekEnd: string;
  weekdayHours: number;
  actions: Array<{ id: string; action_type: string; action_date: string; outcome: string | null; notes: string | null; created_at: string }>;
  approval: { approved_by: string; approval_reason: string | null } | null;
  onSlack: () => void;
  onCall: () => void;
  onApprove: () => void;
}) {
  const isCompliant = weekdayHours >= 40 && actions.length === 0 || !!approval;
  const label = new Date(weekStart + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric", month: "short",
  }) + " – " + new Date(weekEnd + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Actions for {label}</CardTitle>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-semibold ${weekdayHours >= 40 ? "text-emerald-600" : "text-red-600"}`}>
              {weekdayHours.toFixed(1)}h
            </span>
            <span className="text-xs text-muted-foreground">weekday hours</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {approval && (
          <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm">
            <div className="font-medium text-emerald-700">Exception approved by {approval.approved_by}</div>
            {approval.approval_reason && (
              <div className="text-emerald-600 text-xs mt-1">{approval.approval_reason}</div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={onSlack}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Log Slack
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50"
            onClick={onCall}
          >
            <Phone className="h-3.5 w-3.5" />
            Log Call
          </Button>
          {!approval && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onApprove}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve Exception
            </Button>
          )}
        </div>

        {actions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This week's actions</p>
            {actions.map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-xs">
                <Badge
                  variant="outline"
                  className={`font-normal flex-shrink-0 ${
                    a.action_type === "slack"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-orange-50 text-orange-700 border-orange-200"
                  }`}
                >
                  {a.action_type === "slack" ? "Slack" : a.action_type === "call" ? "Call" : "Email"}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString("en-AU", {
                    weekday: "short", day: "numeric", month: "short",
                  })}
                  {a.outcome && ` · ${a.outcome}`}
                </span>
                {a.notes && <span className="text-muted-foreground italic">"{a.notes}"</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

type ViewMode = "week" | "month";

export default function EmployeeTimesheetPage() {
  const router = useRouter();
  const params = useParams<{ name: string }>();
  const employeeName = decodeURIComponent(params.name);

  const [view, setView] = useState<ViewMode>("week");
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [approvingWeek, setApprovingWeek] = useState<string | null>(null);

  // Compute the date range to fetch
  const { fromDate, toDate } = useMemo(() => {
    if (view === "week") {
      return {
        fromDate: format(weekStart, "yyyy-MM-dd"),
        toDate: format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    } else {
      // Include adjacent calendar days for month grid (up to 6 weeks shown)
      const ms = startOfMonth(currentMonth);
      const me = endOfMonth(currentMonth);
      return {
        fromDate: format(startOfWeek(ms, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        toDate: format(endOfWeek(me, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    }
  }, [view, weekStart, currentMonth]);

  const { entries, holidays, actions, approvals, loading, logAction, approveException } =
    useEmployeeTimesheet(employeeName, fromDate, toDate);

  // Build a date → entries map
  const dayMap = useMemo(() => {
    const m: Record<string, TimesheetEntry[]> = {};
    for (const e of entries) {
      if (!m[e.entry_date]) m[e.entry_date] = [];
      m[e.entry_date].push(e);
    }
    return m;
  }, [entries]);

  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.holiday_date)), [holidays]);
  const holidayNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const h of holidays) m[h.holiday_date] = h.holiday_name;
    return m;
  }, [holidays]);

  // Week view data
  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(weekStart, { weekStartsOn: 1 }),
      }),
    [weekStart]
  );

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const weekdayHours = useMemo(() => {
    return weekDays
      .filter((d) => getDay(d) !== 0 && getDay(d) !== 6)
      .reduce((sum, d) => {
        const ds = format(d, "yyyy-MM-dd");
        return sum + (dayMap[ds]?.reduce((s, e) => s + Number(e.units), 0) ?? 0);
      }, 0);
  }, [weekDays, dayMap]);

  const weekActions = useMemo(
    () => actions.filter((a) => a.week_start === weekStartStr),
    [actions, weekStartStr]
  );
  const weekApproval = useMemo(
    () => approvals.find((a) => a.week_start === weekStartStr) ?? null,
    [approvals, weekStartStr]
  );

  // Month view calendar days
  const calDays = useMemo(() => {
    const ms = startOfMonth(currentMonth);
    const me = endOfMonth(currentMonth);
    return eachDayOfInterval({
      start: startOfWeek(ms, { weekStartsOn: 1 }),
      end: endOfWeek(me, { weekStartsOn: 1 }),
    });
  }, [currentMonth]);

  // Month stats
  const monthStats = useMemo(() => {
    const monthDays = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
    let totalHours = 0;
    let gapDays = 0;
    let violations = 0;
    for (const d of monthDays) {
      const dow = getDay(d);
      const isWeekend = dow === 0 || dow === 6;
      const ds = format(d, "yyyy-MM-dd");
      const dayEntries = dayMap[ds] ?? [];
      const dayHours = dayEntries.reduce((s, e) => s + Number(e.units), 0);
      if (!isWeekend) totalHours += dayHours;
      const status = getDayStatus(d, dayEntries, holidaySet.has(ds));
      if (status === "gap") gapDays++;
      if (["gap", "partial", "weekend_work", "holiday_wrong"].includes(status)) violations++;
    }
    return { totalHours, gapDays, violations };
  }, [calDays, dayMap, holidaySet, currentMonth]);

  // Navigation labels
  const periodLabel =
    view === "week"
      ? `${format(weekStart, "d MMM")} – ${format(
          endOfWeek(weekStart, { weekStartsOn: 1 }),
          "d MMM yyyy"
        )}`
      : format(currentMonth, "MMMM yyyy");

  const goPrev = () =>
    view === "week"
      ? setWeekStart(subWeeks(weekStart, 1))
      : setCurrentMonth(subMonths(currentMonth, 1));
  const goNext = () =>
    view === "week"
      ? setWeekStart(addWeeks(weekStart, 1))
      : setCurrentMonth(addMonths(currentMonth, 1));
  const goCurrent = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setCurrentMonth(startOfMonth(new Date()));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{employeeName}</h1>
            <p className="text-muted-foreground text-sm">Timesheet detail</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium w-44 text-center tabular-nums">{periodLabel}</div>
          <Button variant="outline" size="sm" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goCurrent}>
            Today
          </Button>
        </div>
      </div>

      {/* ── WEEK VIEW ── */}
      {view === "week" && (
        <>
          {/* 7-column day grid */}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[700px]">
              {loading
                ? [...Array(7)].map((_, i) => (
                    <div key={i} className="rounded-xl border-2 border-muted overflow-hidden min-h-[220px]">
                      <div className="bg-muted/40 px-3 pt-3 pb-2">
                        <Skeleton className="h-3 w-8 mb-1" />
                        <Skeleton className="h-7 w-6" />
                      </div>
                      <div className="bg-background/60 px-3 py-2.5 space-y-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))
                : weekDays.map((day) => {
                    const ds = format(day, "yyyy-MM-dd");
                    return (
                      <WeekDayCard
                        key={ds}
                        date={day}
                        dayEntries={dayMap[ds] ?? []}
                        isHoliday={holidaySet.has(ds)}
                        holidayName={holidayNames[ds]}
                      />
                    );
                  })}
            </div>
          </div>

          {/* Week summary + actions */}
          {!loading && (
            <WeekActionPanel
              weekStart={weekStartStr}
              weekEnd={weekEndStr}
              weekdayHours={weekdayHours}
              actions={weekActions}
              approval={weekApproval}
              onSlack={() => logAction(weekStartStr, "slack")}
              onCall={() => logAction(weekStartStr, "call")}
              onApprove={() => setApprovingWeek(weekStartStr)}
            />
          )}
        </>
      )}

      {/* ── MONTH VIEW ── */}
      {view === "month" && (
        <div className="space-y-4">
          {/* Month stats */}
          {!loading && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="text-2xl font-bold">{monthStats.totalHours.toFixed(1)}h</div>
                  <div className="text-xs text-muted-foreground">Total weekday hours</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className={`text-2xl font-bold ${monthStats.gapDays > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {monthStats.gapDays}
                  </div>
                  <div className="text-xs text-muted-foreground">Gap days (no entry)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className={`text-2xl font-bold ${monthStats.violations > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {monthStats.violations}
                  </div>
                  <div className="text-xs text-muted-foreground">Days with violations</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Calendar */}
          <Card>
            <CardContent className="pt-4">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1.5">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              {loading ? (
                <div className="grid grid-cols-7 gap-1.5">
                  {[...Array(35)].map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1.5">
                  {calDays.map((day) => {
                    const ds = format(day, "yyyy-MM-dd");
                    return (
                      <MonthCell
                        key={ds}
                        date={day}
                        dayEntries={dayMap[ds] ?? []}
                        isHoliday={holidaySet.has(ds)}
                        inCurrentMonth={isSameMonth(day, currentMonth)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t text-xs text-muted-foreground">
                {[
                  { cls: "bg-emerald-100 border-emerald-200", label: "8h (full)" },
                  { cls: "bg-amber-100 border-amber-200", label: "Partial (<8h)" },
                  { cls: "bg-red-100 border-red-200", label: "Gap (no entry)" },
                  { cls: "bg-violet-100 border-violet-200", label: "Public holiday" },
                  { cls: "bg-orange-100 border-orange-200", label: "Violation" },
                  { cls: "bg-slate-100 border-slate-200", label: "Weekend" },
                ].map(({ cls, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`h-3 w-3 rounded border ${cls}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ALL-TIME ACTION HISTORY ── */}
      {!loading && actions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Action History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {actions.map((a) => (
                <div key={a.id} className="flex items-start gap-3 text-sm py-1.5 border-b last:border-0">
                  <Badge
                    variant="outline"
                    className={`flex-shrink-0 font-normal text-xs ${
                      a.action_type === "slack"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-orange-50 text-orange-700 border-orange-200"
                    }`}
                  >
                    {a.action_type === "slack" ? "Slack" : a.action_type === "call" ? "Call" : "Email"}
                  </Badge>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">
                      Week of{" "}
                      {new Date(a.week_start + "T00:00:00").toLocaleDateString("en-AU", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                      {" · "}
                      {new Date(a.created_at).toLocaleDateString("en-AU", {
                        weekday: "short", day: "numeric", month: "short",
                      })}
                    </div>
                    {a.outcome && (
                      <div className="text-xs text-muted-foreground">Outcome: {a.outcome}</div>
                    )}
                    {a.notes && (
                      <div className="text-xs italic text-muted-foreground truncate">"{a.notes}"</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approve dialog */}
      {approvingWeek && (
        <ApproveDialog
          open={!!approvingWeek}
          weekStart={approvingWeek}
          onConfirm={(reason, approvedBy) => {
            approveException(approvingWeek, [], reason, approvedBy);
          }}
          onClose={() => setApprovingWeek(null)}
        />
      )}
    </div>
  );
}
