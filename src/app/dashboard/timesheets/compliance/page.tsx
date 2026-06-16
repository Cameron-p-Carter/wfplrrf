"use client";

import * as React from "react";
import { useState, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { startOfWeek, addWeeks, subWeeks, format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  XCircle,
  Search,
  CalendarDays,
  CalendarRange,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTimesheetCompliance } from "@/lib/hooks/use-timesheet-compliance";
import { useNameMappingSuggestions } from "@/lib/hooks/use-name-mapping-suggestions";
import { getWeekLabel, formatDayShort, type EmployeeCompliance, type Violations } from "@/lib/utils/timesheet-compliance";

type FilterTab = "all" | "issues" | "compliant";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  slack: { label: "Slack sent", color: "bg-blue-100 text-blue-700 border-blue-200" },
  call: { label: "Call made", color: "bg-orange-100 text-orange-700 border-orange-200" },
  email: { label: "Email sent", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

function ViolationBadges({ emp }: { emp: EmployeeCompliance }) {
  const { violations: v, publicHolidaysThisWeek, expectedHours, isPartTime, isOffWork } = emp;

  if (isOffWork) {
    return (
      <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 font-normal text-xs">
        Off work
      </Badge>
    );
  }

  const badges: React.ReactNode[] = [];

  if (v.underHours) {
    badges.push(
      <Badge key="uh" variant="outline" className="bg-red-50 text-red-700 border-red-200 font-normal text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Under {expectedHours}h
      </Badge>
    );
  }
  if (v.overHours) {
    badges.push(
      <Badge key="oh" variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-normal text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Over 40h
      </Badge>
    );
  }
  if (v.gapDays.length > 0) {
    badges.push(
      <Badge key="gap" variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-normal text-xs">
        Gap: {v.gapDays.map((d) => formatDayShort(d).split(" ")[0]).join(", ")}
      </Badge>
    );
  }
  if (v.weekendWork.length > 0) {
    badges.push(
      <Badge key="wk" variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-normal text-xs">
        Weekend
      </Badge>
    );
  }

  if (badges.length > 0) {
    return <div className="flex flex-wrap gap-1">{badges}</div>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      <span className="text-xs text-emerald-600 font-medium">All good</span>
      {!isPartTime && publicHolidaysThisWeek > 0 && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal text-xs">
          {publicHolidaysThisWeek} PH · {expectedHours}h required
        </Badge>
      )}
    </div>
  );
}

interface ApproveDialogProps {
  open: boolean;
  employeeName: string;
  violations: EmployeeCompliance["violations"];
  onConfirm: (reason: string, approvedBy: string) => void;
  onClose: () => void;
}

function ApproveDialog({ open, employeeName, violations, onConfirm, onClose }: ApproveDialogProps) {
  const [reason, setReason] = useState("");
  const [approvedBy, setApprovedBy] = useState("");

  const violationTypes = [
    violations.underHours && "under_hours",
    violations.overHours && "over_hours",
    violations.gapDays.length > 0 && "gap_days",
    violations.weekendWork.length > 0 && "weekend_work",
  ].filter(Boolean) as string[];

  const handleConfirm = () => {
    if (!reason.trim() || !approvedBy.trim()) return;
    onConfirm(reason.trim(), approvedBy.trim());
    setReason("");
    setApprovedBy("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Exception</DialogTitle>
          <DialogDescription>
            Grant a manager exception for <strong>{employeeName}</strong> for this week.
            This will mark their timesheet as compliant.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Violations being approved</p>
            {violationTypes.map((v) => (
              <div key={v} className="flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-amber-500" />
                <span className="capitalize">{v.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="approved-by">Approved by (manager name)</Label>
            <Input
              id="approved-by"
              placeholder="e.g. John Smith"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="e.g. Employee was on approved client site, no system access"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!reason.trim() || !approvedBy.trim()}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve Exception
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildSlackMessage(
  employeeName: string,
  weekLabel: string,
  violations: Violations,
  weekdayHours: number,
  expectedHours: number,
  publicHolidaysThisWeek: number
): string {
  const bullets: string[] = [];
  if (violations.underHours) {
    const phNote = publicHolidaysThisWeek > 0 ? ` (${publicHolidaysThisWeek} public holiday — ${expectedHours}h required this week)` : '';
    bullets.push(`• Under ${expectedHours}h — logged ${weekdayHours.toFixed(1)}h${phNote}`);
  }
  if (violations.overHours) {
    bullets.push(`• Over 40h — logged ${weekdayHours.toFixed(1)}h`);
  }
  for (const d of violations.gapDays) {
    bullets.push(`• Missing entry: ${formatDayShort(d)}`);
  }
  for (const d of violations.weekendWork) {
    bullets.push(`• Weekend work recorded: ${formatDayShort(d)}`);
  }
  const firstName = employeeName.split(" ")[0];
  return [
    `Hi ${firstName}, your timesheet for *${weekLabel}* needs attention:`,
    "",
    bullets.join("\n"),
    "",
    "Please update your timesheet as soon as possible. Thanks!",
  ].join("\n");
}

interface SlackPreviewDialogProps {
  open: boolean;
  employeeName: string;
  message: string;
  sending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function SlackPreviewDialog({ open, employeeName, message, sending, onConfirm, onClose }: SlackPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Preview Slack Message</DialogTitle>
          <DialogDescription>
            This is the message that will be sent to <strong>{employeeName}</strong> via Slack DM.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/40 p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed">
          {message}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button
            onClick={onConfirm}
            disabled={sending}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompliancePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [weekStart, setWeekStartState] = useState(() => {
    const w = searchParams.get("week");
    return w ? new Date(w + "T00:00:00") : startOfWeek(new Date(), { weekStartsOn: 1 });
  });

  const setWeekStart = useCallback((date: Date) => {
    setWeekStartState(date);
    router.replace(`/dashboard/timesheets/compliance?week=${format(date, "yyyy-MM-dd")}`);
  }, [router]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [approvingEmployee, setApprovingEmployee] = useState<EmployeeCompliance | null>(null);
  const [slackPreview, setSlackPreview] = useState<{ emp: EmployeeCompliance; message: string } | null>(null);
  const [sendingEmployee, setSendingEmployee] = useState<string | null>(null);

  const openSlackPreview = (emp: EmployeeCompliance) => {
    const message = buildSlackMessage(
      emp.employeeName,
      getWeekLabel(weekStart),
      emp.violations,
      emp.weekdayHours,
      emp.expectedHours,
      emp.publicHolidaysThisWeek
    );
    setSlackPreview({ emp, message });
  };

  const confirmSendSlack = async () => {
    if (!slackPreview) return;
    const { emp } = slackPreview;
    setSendingEmployee(emp.employeeName);
    try {
      const res = await fetch("/api/timesheets/send-slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: format(weekStart, "yyyy-MM-dd"), employeeName: emp.employeeName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      toast.success(`Slack sent to ${emp.employeeName.split(" ")[0]}`);
      if (data.failed?.length > 0) toast.warning(data.failed[0]);
      setSlackPreview(null);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSendingEmployee(null);
    }
  };

  const { compliance, loading, compliantCount, issueCount, logAction, approveException, togglePartTime, toggleOffWork, refresh } =
    useTimesheetCompliance(weekStart);

  const { suggestions, confirmMapping } = useNameMappingSuggestions();

  const filtered = useMemo(() => {
    return compliance.filter((e) => {
      const matchSearch = e.employeeName.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === "all" ||
        (filter === "issues" && !e.isCompliant) ||
        (filter === "compliant" && e.isCompliant);
      return matchSearch && matchFilter;
    });
  }, [compliance, filter, search]);

  const noSubmissions = compliance.length === 0 && !loading;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Check</h1>
          <p className="text-muted-foreground">
            {loading ? "Loading…" : `${compliance.length} employees · ${issueCount} issues · ${compliantCount} compliant`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center rounded-md border divide-x overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none h-9 gap-1.5 bg-muted font-semibold"
            >
              <CalendarDays className="h-4 w-4" />
              Weekly
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none h-9 gap-1.5 text-muted-foreground"
              onClick={() => router.push("/dashboard/timesheets/compliance/monthly")}
            >
              <CalendarRange className="h-4 w-4" />
              Monthly
            </Button>
          </div>

          {/* Week navigator */}
          <Button variant="outline" size="sm" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium w-56 text-center">{getWeekLabel(weekStart)}</div>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            This week
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {loading ? <Skeleton className="h-8 w-12" /> : compliantCount}
            </div>
            <p className="text-xs text-muted-foreground">Full 40h, no gaps or violations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? <Skeleton className="h-8 w-12" /> : issueCount}
            </div>
            <p className="text-xs text-muted-foreground">Timesheets needing follow-up</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions Logged</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                new Set(compliance.flatMap((e) => e.actions).map((a) => a.employee_name)).size
              )}
            </div>
            <p className="text-xs text-muted-foreground">Employees contacted this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Name mapping suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2 pt-4 px-6">
            <CardTitle className="text-sm font-semibold text-amber-800">Name mapping suggestions</CardTitle>
            <CardDescription className="text-amber-700 text-xs">
              These timesheet names don't match the employee list but share a last name. Confirm to link them.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-4 space-y-2">
            {suggestions.map((s) => (
              <div key={s.timesheetName} className="flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-white px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium">{s.timesheetName}</span>
                  <span className="text-muted-foreground mx-2">→</span>
                  <span className="font-medium">{s.suggestedDisplayName}</span>
                  <span className="text-xs text-muted-foreground ml-2">(HR name)</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-300 hover:bg-amber-100 text-amber-800 shrink-0"
                  onClick={async () => {
                    await confirmMapping(s.timesheetName, s.suggestedDisplayName);
                    refresh();
                  }}
                >
                  Map
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Employee table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <span className="ml-1.5 text-xs text-muted-foreground">{compliance.length}</span>
                </TabsTrigger>
                <TabsTrigger value="issues">
                  Issues
                  {issueCount > 0 && (
                    <span className="ml-1.5 text-xs text-red-600">{issueCount}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="compliant">
                  Compliant
                  <span className="ml-1.5 text-xs text-emerald-600">{compliantCount}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-48 flex-1" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : noSubmissions ? (
            <div className="py-16 text-center">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No timesheet submissions for this week</p>
              <p className="text-xs text-muted-foreground">Upload a CSV that covers this period</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No employees match your filters
            </div>
          ) : (
            <div className="divide-y">
              {/* Header row */}
              <div className="hidden md:grid grid-cols-[1fr_80px_1fr_160px_180px] gap-4 px-6 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Employee</span>
                <span>Hours</span>
                <span>Issues</span>
                <span>Last action</span>
                <span className="text-right">Actions</span>
              </div>

              {filtered.map((emp) => (
                <EmployeeRow
                  key={emp.employeeName}
                  emp={emp}
                  sendingSlack={sendingEmployee === emp.employeeName}
                  onSlack={() => openSlackPreview(emp)}
                  onCall={() => logAction(emp.employeeName, "call")}
                  onTogglePartTime={() => togglePartTime(emp.employeeName, !emp.isPartTime)}
                  onToggleOffWork={() => toggleOffWork(emp.employeeName, !emp.isOffWork)}
                  onApprove={() => setApprovingEmployee(emp)}
                  onNameClick={() =>
                    router.push(
                      `/dashboard/timesheets/employee/${encodeURIComponent(emp.employeeName)}?week=${format(weekStart, "yyyy-MM-dd")}`
                    )
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {slackPreview && (
        <SlackPreviewDialog
          open={!!slackPreview}
          employeeName={slackPreview.emp.employeeName}
          message={slackPreview.message}
          sending={sendingEmployee === slackPreview.emp.employeeName}
          onConfirm={confirmSendSlack}
          onClose={() => setSlackPreview(null)}
        />
      )}

      {approvingEmployee && (
        <ApproveDialog
          open={!!approvingEmployee}
          employeeName={approvingEmployee.employeeName}
          violations={approvingEmployee.violations}
          onConfirm={(reason, approvedBy) => {
            const types = [
              approvingEmployee.violations.underHours && "under_hours",
              approvingEmployee.violations.overHours && "over_hours",
              approvingEmployee.violations.gapDays.length > 0 && "gap_days",
              approvingEmployee.violations.weekendWork.length > 0 && "weekend_work",
            ].filter(Boolean) as string[];
            approveException(approvingEmployee.employeeName, types, reason, approvedBy);
          }}
          onClose={() => setApprovingEmployee(null)}
        />
      )}
    </div>
  );
}

interface EmployeeRowProps {
  emp: EmployeeCompliance;
  sendingSlack: boolean;
  onSlack: () => void;
  onCall: () => void;
  onApprove: () => void;
  onTogglePartTime: () => void;
  onToggleOffWork: () => void;
  onNameClick: () => void;
}

function EmployeeRow({ emp, sendingSlack, onSlack, onCall, onApprove, onTogglePartTime, onToggleOffWork, onNameClick }: EmployeeRowProps) {
  const hoursColor =
    emp.isPartTime
      ? "text-muted-foreground"
      : emp.weekdayHours > 40
      ? "text-orange-600"
      : emp.weekdayHours >= 40
      ? "text-emerald-600"
      : emp.weekdayHours >= 30
      ? "text-amber-600"
      : "text-red-600";

  const latestAction = emp.latestAction;

  const lastActionEl = latestAction ? (
    <div className="flex flex-col gap-0.5">
      <Badge
        variant="outline"
        className={`text-xs font-normal w-fit ${ACTION_LABELS[latestAction.action_type]?.color ?? ""}`}
      >
        {ACTION_LABELS[latestAction.action_type]?.label}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {new Date(latestAction.created_at).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
        })}
        {latestAction.outcome && ` · ${latestAction.outcome}`}
      </span>
    </div>
  ) : (
    <span className="text-xs text-muted-foreground">None</span>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_1fr_160px_180px] gap-4 items-center px-6 py-4">
      {/* Name + compliance status */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`h-2 w-2 rounded-full flex-shrink-0 ${
            emp.isCompliant ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
        <button
          className="font-medium text-sm truncate hover:underline text-left"
          onClick={onNameClick}
        >
          {emp.employeeName}
        </button>
        {emp.hasApproval && (
          <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-200 bg-emerald-50 font-normal flex-shrink-0">
            Approved
          </Badge>
        )}
        <button
          onClick={onTogglePartTime}
          title={emp.isPartTime ? "Part-time (click to set full-time)" : "Full-time (click to set part-time)"}
          className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium border transition-colors ${
            emp.isPartTime
              ? "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
              : "text-muted-foreground/40 border-transparent hover:border-muted-foreground/20 hover:text-muted-foreground"
          }`}
        >
          PT
        </button>
        <button
          onClick={onToggleOffWork}
          title={emp.isOffWork ? "Off work (click to mark active)" : "Active (click to mark off work)"}
          className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium border transition-colors ${
            emp.isOffWork
              ? "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
              : "text-muted-foreground/40 border-transparent hover:border-muted-foreground/20 hover:text-muted-foreground"
          }`}
        >
          Off
        </button>
      </div>

      {/* Hours */}
      <div className={`text-sm font-semibold tabular-nums ${hoursColor}`}>
        {emp.weekdayHours.toFixed(1)}h
      </div>

      {/* Violations */}
      <div>
        <ViolationBadges emp={emp} />
      </div>

      {/* Last action */}
      <div>{lastActionEl}</div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-1.5">
        {!emp.isCompliant && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              onClick={onSlack}
              disabled={sendingSlack}
              title="Send Slack DM"
            >
              {sendingSlack ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Slack
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
              onClick={onCall}
              title="Log phone call made"
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground"
              onClick={onApprove}
              title="Grant manager exception"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        {emp.isCompliant && !emp.hasApproval && (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Compliant
          </span>
        )}
      </div>
    </div>
  );
}

export default function CompliancePage() {
  return (
    <Suspense>
      <CompliancePageInner />
    </Suspense>
  );
}
