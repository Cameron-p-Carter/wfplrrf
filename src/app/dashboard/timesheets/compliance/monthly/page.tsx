"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { startOfMonth, addMonths, subMonths, format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Search,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMonthlyCompliance } from "@/lib/hooks/use-monthly-compliance";
import { getMonthLabel, type EmployeeMonthCompliance, type WeekSummary } from "@/lib/utils/timesheet-compliance";

type FilterTab = "all" | "issues" | "compliant";

function WeekBadge({
  week,
  employeeName,
  onClick,
}: {
  week: WeekSummary;
  employeeName: string;
  onClick: () => void;
}) {
  const day = new Date(week.weekStart + "T00:00:00");
  const label = day.toLocaleDateString("en-AU", { day: "numeric", month: "short" });

  let cls = "";
  if (week.hasApproval) {
    cls = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
  } else if (week.isCompliant) {
    cls = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
  } else {
    cls = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
  }

  return (
    <button
      onClick={onClick}
      title={`${week.weekLabel} — ${week.weekdayHours.toFixed(1)}h${week.isCompliant ? " ✓" : ` · ${week.violationCount} issue${week.violationCount !== 1 ? "s" : ""}`}`}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium transition-colors ${cls}`}
    >
      {label}
    </button>
  );
}

function MonthlyEmployeeRow({
  emp,
  onWeekClick,
  onNameClick,
}: {
  emp: EmployeeMonthCompliance;
  onWeekClick: (weekStart: string) => void;
  onNameClick: () => void;
}) {
  const hoursColor =
    emp.totalWeekdayHours >= emp.weeks.length * 40
      ? "text-emerald-600"
      : emp.totalWeekdayHours >= emp.weeks.length * 30
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_90px_1fr_130px] gap-4 items-center px-6 py-4">
      {/* Name + status */}
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
        {emp.hasAnyApproval && (
          <Badge
            variant="outline"
            className="text-xs text-amber-700 border-amber-200 bg-amber-50 font-normal flex-shrink-0"
          >
            Exception
          </Badge>
        )}
      </div>

      {/* Total hours */}
      <div className={`text-sm font-semibold tabular-nums ${hoursColor}`}>
        {emp.totalWeekdayHours.toFixed(1)}h
      </div>

      {/* Week breakdown */}
      <div className="flex flex-wrap gap-1">
        {emp.weeks.map((w) => (
          <WeekBadge
            key={w.weekStart}
            week={w}
            employeeName={emp.employeeName}
            onClick={() => onWeekClick(w.weekStart)}
          />
        ))}
      </div>

      {/* Issues summary */}
      <div className="text-sm">
        {emp.issueWeeks === 0 ? (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            All weeks clean
          </span>
        ) : (
          <span className="text-xs text-red-600 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            {emp.issueWeeks} week{emp.issueWeeks !== 1 ? "s" : ""} with issues
          </span>
        )}
      </div>
    </div>
  );
}

export default function MonthlyCompliancePage() {
  const router = useRouter();
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const { compliance, loading, compliantCount, issueCount, totalHours } =
    useMonthlyCompliance(monthStart);

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

  const goToEmployee = (name: string, weekStart: string) => {
    router.push(
      `/dashboard/timesheets/employee/${encodeURIComponent(name)}?week=${weekStart}`
    );
  };

  const goToEmployeeFirstIssue = (emp: EmployeeMonthCompliance) => {
    const firstIssueWeek = emp.weeks.find((w) => !w.isCompliant);
    const weekStart = firstIssueWeek?.weekStart ?? emp.weeks[0]?.weekStart;
    if (weekStart) {
      goToEmployee(emp.employeeName, weekStart);
    } else {
      router.push(`/dashboard/timesheets/employee/${encodeURIComponent(emp.employeeName)}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Compliance</h1>
          <p className="text-muted-foreground">
            {loading
              ? "Loading…"
              : `${compliance.length} employees · ${issueCount} with issues · ${compliantCount} fully compliant`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center rounded-md border divide-x overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none h-9 gap-1.5 text-muted-foreground"
              onClick={() => router.push("/dashboard/timesheets/compliance")}
            >
              <CalendarDays className="h-4 w-4" />
              Weekly
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none h-9 gap-1.5 bg-muted font-semibold"
            >
              <CalendarRange className="h-4 w-4" />
              Monthly
            </Button>
          </div>

          {/* Month navigator */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthStart(subMonths(monthStart, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium w-36 text-center">
            {getMonthLabel(monthStart)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthStart(addMonths(monthStart, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonthStart(startOfMonth(new Date()))}
          >
            This month
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fully Compliant</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {loading ? <Skeleton className="h-8 w-12" /> : compliantCount}
            </div>
            <p className="text-xs text-muted-foreground">All weeks clean this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees with Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? <Skeleton className="h-8 w-12" /> : issueCount}
            </div>
            <p className="text-xs text-muted-foreground">One or more weeks need follow-up</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Tracked</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : `${totalHours.toFixed(0)}h`}
            </div>
            <p className="text-xs text-muted-foreground">Weekday hours across all employees</p>
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
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-5 w-48 flex-1" />
                  <Skeleton className="h-5 w-28" />
                </div>
              ))}
            </div>
          ) : noSubmissions ? (
            <div className="py-16 text-center">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                No timesheet submissions for {getMonthLabel(monthStart)}
              </p>
              <p className="text-xs text-muted-foreground">Upload a CSV that covers this period</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No employees match your filters
            </div>
          ) : (
            <div className="divide-y">
              {/* Header */}
              <div className="hidden md:grid grid-cols-[1fr_90px_1fr_130px] gap-4 px-6 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Employee</span>
                <span>Month hours</span>
                <span>Week breakdown</span>
                <span>Status</span>
              </div>

              {filtered.map((emp) => (
                <MonthlyEmployeeRow
                  key={emp.employeeName}
                  emp={emp}
                  onWeekClick={(weekStart) => goToEmployee(emp.employeeName, weekStart)}
                  onNameClick={() => goToEmployeeFirstIssue(emp)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      {!loading && compliance.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium">Week badges:</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-200 border border-emerald-300" />
            Compliant
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-200 border border-red-300" />
            Issues
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-200 border border-amber-300" />
            Approved exception
          </span>
          <span className="ml-2">Click any badge to view that week</span>
        </div>
      )}
    </div>
  );
}
