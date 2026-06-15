"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Users,
  Database,
  ChevronRight,
  Calendar,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTimesheets } from "@/lib/hooks/use-timesheets";
import { format } from "date-fns";

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "—";
  const fmt = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  };
  if (!end || start === end) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatUploadDate(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TimesheetsPage() {
  const router = useRouter();
  const { uploads, stats, loading, uploading, handleFileUpload } = useTimesheets();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      return;
    }
    setShowUploadDialog(false);
    await handleFileUpload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timesheets</h1>
          <p className="text-muted-foreground">
            {loading ? "Loading…" : `${stats.totalEntries.toLocaleString()} entries · ${stats.totalEmployees} employees tracked`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push("/dashboard/timesheets/compliance")}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Compliance Check
          </Button>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-20" /> : stats.totalEntries.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Timesheet rows in database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees Tracked</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : stats.totalEmployees}
            </div>
            <p className="text-xs text-muted-foreground">Unique employees with submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Upload</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : stats.latestUpload ? (
                <span className="text-base font-semibold truncate">
                  {formatUploadDate(stats.latestUpload.uploaded_at)}
                </span>
              ) : (
                <span className="text-muted-foreground text-base">None yet</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.latestUpload
                ? `${stats.latestUpload.new_rows} new rows`
                : "Upload a CSV to get started"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance shortcut */}
      <Card
        className="cursor-pointer hover:bg-muted/40 transition-colors border-dashed"
        onClick={() => router.push("/dashboard/timesheets/compliance")}
      >
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium">Weekly Compliance Check</p>
              <p className="text-sm text-muted-foreground">
                Review timesheet violations, log Slack messages and follow-up calls
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>

      {/* Upload history */}
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>All CSV files imported into the system</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : uploads.length === 0 ? (
            <div className="py-16 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No uploads yet</p>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="mr-2 h-4 w-4" /> Upload First CSV
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group"
                >
                  <div className="h-9 w-9 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{upload.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatUploadDate(upload.uploaded_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="tabular-nums">
                      {upload.row_count} rows
                    </Badge>
                    {upload.new_rows > 0 && (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 tabular-nums">
                        +{upload.new_rows} new
                      </Badge>
                    )}
                    {upload.duplicate_rows > 0 && (
                      <Badge variant="outline" className="text-muted-foreground tabular-nums">
                        {upload.duplicate_rows} dup
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 w-40 text-right">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDateRange(upload.date_range_start, upload.date_range_end)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Timesheet CSV</DialogTitle>
            <DialogDescription>
              Import a timesheet report exported from Employment Hero. Duplicate entries (same employee, date, and cost centre) will be skipped automatically.
            </DialogDescription>
          </DialogHeader>
          <div
            className={`mt-2 border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ cursor: "pointer" }}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Drop a CSV file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Employment Hero timesheet export format</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Processing CSV…
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
