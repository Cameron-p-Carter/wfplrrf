"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { startOfWeek, addWeeks, subWeeks } from "date-fns";
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
import { getWeekLabel, formatDayShort, type EmployeeCompliance } from "@/lib/utils/timesheet-compliance";

type FilterTab = "all" | "issues" | "compliant";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  slack: { label: "Slack sent", color: "bg-blue-100 text-blue-700 border-blue-200" },
  call: { label: "Call made", color: "bg-orange-100 text-orange-700 border-orange-200" },
  email: { label: "Email sent", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

function ViolationBadges({ v }: { v: EmployeeCompliance["violations"] }) {
  const badges: React.ReactNode[] = [];

  if (v.underHours) {
    badges.push(
      <Badge key="uh" variant="outline" className="bg-red-50 text-red-700 border-red-200 font-normal text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Under 40h
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
  if (v.publicHolidayWork.length > 0) {
    badges.push(
      <Badge key="ph" variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-normal text-xs">
        PH wrong CC
      </Badge>
    );
  }

  return badges.length > 0 ? (
    <div className="flex flex-wrap gap-1">{badges}</div>
  ) : (
    <span className="text-xs text-emerald-600 font-medium">All good</span>
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
    violations.gapDays.length > 0 && "gap_days",
    violations.weekendWork.length > 0 && "weekend_work",
    violations.publicHolidayWork.length > 0 && "ph_work",
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

export default function CompliancePage() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [approvingEmployee, setApprovingEmployee] = useState<EmployeeCompliance | null>(null);

  const { compliance, loading, compliantCount, issueCount, logAction, approveException } =
    useTimesheetCompliance(weekStart);

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
        {/* Week navigator */}
        <div className="flex items-center gap-2">
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
                  onSlack={() => logAction(emp.employeeName, "slack")}
                  onCall={() => logAction(emp.employeeName, "call")}
                  onApprove={() => setApprovingEmployee(emp)}
                  onNameClick={() =>
                    router.push(`/dashboard/timesheets/employee/${encodeURIComponent(emp.employeeName)}`)
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {approvingEmployee && (
        <ApproveDialog
          open={!!approvingEmployee}
          employeeName={approvingEmployee.employeeName}
          violations={approvingEmployee.violations}
          onConfirm={(reason, approvedBy) => {
            const types = [
              approvingEmployee.violations.underHours && "under_hours",
              approvingEmployee.violations.gapDays.length > 0 && "gap_days",
              approvingEmployee.violations.weekendWork.length > 0 && "weekend_work",
              approvingEmployee.violations.publicHolidayWork.length > 0 && "ph_work",
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
  onSlack: () => void;
  onCall: () => void;
  onApprove: () => void;
  onNameClick: () => void;
}

function EmployeeRow({ emp, onSlack, onCall, onApprove, onNameClick }: EmployeeRowProps) {
  const hoursColor =
    emp.weekdayHours >= 40
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
      </div>

      {/* Hours */}
      <div className={`text-sm font-semibold tabular-nums ${hoursColor}`}>
        {emp.weekdayHours.toFixed(1)}h
      </div>

      {/* Violations */}
      <div>
        <ViolationBadges v={emp.violations} />
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
              title="Log Slack message sent"
            >
              <MessageSquare className="h-3.5 w-3.5" />
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
