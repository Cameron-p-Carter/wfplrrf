import { supabase } from '../shared/base-queries';
import { handleDatabaseError } from '../shared/error-handling';
import { parseDateDMY, parseApprovedOn, type CsvTimesheetRow } from '@/lib/utils/csv-parser';

export interface TimesheetUpload {
  id: string;
  filename: string;
  uploaded_at: string;
  row_count: number;
  new_rows: number;
  duplicate_rows: number;
  date_range_start: string | null;
  date_range_end: string | null;
}

export interface TimesheetEntry {
  id: string;
  upload_id: string | null;
  employee_name: string;
  entry_date: string;
  start_time: string | null;
  end_time: string | null;
  breaks: string | null;
  units: number;
  cost_centre: string;
  notes: string | null;
  status: string;
  approved_by: string | null;
  approved_on: string | null;
  manager: string | null;
  created_at: string;
}

export interface PublicHoliday {
  id: string;
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

export async function getTimesheetUploads(): Promise<TimesheetUpload[]> {
  try {
    const { data, error } = await supabase
      .from('timesheet_uploads')
      .select('*')
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'fetch timesheet uploads');
  }
}

export async function uploadTimesheetCSV(
  filename: string,
  rows: CsvTimesheetRow[]
): Promise<{ upload: TimesheetUpload; newRows: number; duplicateRows: number }> {
  try {
    // Create upload record
    const { data: upload, error: uploadError } = await supabase
      .from('timesheet_uploads')
      .insert({ filename, row_count: rows.length })
      .select()
      .single();
    if (uploadError) throw uploadError;

    // Prepare and filter entries (skip rows with invalid dates)
    const entries = rows
      .map((row) => ({
        upload_id: upload.id,
        employee_name: row.employee,
        entry_date: parseDateDMY(row.date),
        start_time: row.startTime || null,
        end_time: row.endTime || null,
        breaks: row.breaks || null,
        units: row.units,
        cost_centre: row.costCentre,
        notes: row.notes || null,
        status: row.status || 'Pending',
        approved_by: row.approvedBy || null,
        approved_on: parseApprovedOn(row.approvedOn),
        manager: row.manager || null,
      }))
      .filter((e) => e.entry_date.length === 10);

    let newRows = 0;
    let duplicateRows = 0;

    // Insert in batches, ignoring duplicates
    const BATCH = 100;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      const { data: inserted, error: insertError } = await supabase
        .from('timesheet_entries')
        .upsert(batch, {
          onConflict: 'employee_name,entry_date,cost_centre',
          ignoreDuplicates: true,
        })
        .select('id');
      if (insertError) throw insertError;
      newRows += inserted?.length ?? 0;
      duplicateRows += batch.length - (inserted?.length ?? 0);
    }

    // Compute date range
    const dates = entries.map((e) => e.entry_date).sort();
    const dateRangeStart = dates[0] ?? null;
    const dateRangeEnd = dates[dates.length - 1] ?? null;

    // Update upload summary
    const { data: updatedUpload, error: updateError } = await supabase
      .from('timesheet_uploads')
      .update({ new_rows: newRows, duplicate_rows: duplicateRows, date_range_start: dateRangeStart, date_range_end: dateRangeEnd })
      .eq('id', upload.id)
      .select()
      .single();
    if (updateError) throw updateError;

    return { upload: updatedUpload, newRows, duplicateRows };
  } catch (error) {
    handleDatabaseError(error, 'upload timesheet CSV');
  }
}

export async function getTimesheetEntriesForWeek(
  weekStart: string,
  weekEnd: string
): Promise<TimesheetEntry[]> {
  try {
    const { data, error } = await supabase
      .from('timesheet_entries')
      .select('*')
      .gte('entry_date', weekStart)
      .lte('entry_date', weekEnd)
      .order('employee_name')
      .order('entry_date');
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'fetch timesheet entries for week');
  }
}

export async function getTimesheetEntriesForUpload(uploadId: string): Promise<TimesheetEntry[]> {
  try {
    const { data, error } = await supabase
      .from('timesheet_entries')
      .select('*')
      .eq('upload_id', uploadId)
      .order('employee_name')
      .order('entry_date');
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'fetch entries for upload');
  }
}

export async function getPublicHolidays(): Promise<PublicHoliday[]> {
  try {
    const { data, error } = await supabase
      .from('au_public_holidays')
      .select('*')
      .order('holiday_date');
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'fetch public holidays');
  }
}

export async function getTimesheetActionsForDateRange(
  fromWeekStart: string,
  toWeekStart: string
): Promise<TimesheetAction[]> {
  try {
    const { data, error } = await supabase
      .from('timesheet_actions')
      .select('*')
      .gte('week_start', fromWeekStart)
      .lte('week_start', toWeekStart)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'fetch timesheet actions for date range');
  }
}

export async function getTimesheetApprovalsForDateRange(
  fromWeekStart: string,
  toWeekStart: string
): Promise<TimesheetApproval[]> {
  try {
    const { data, error } = await supabase
      .from('timesheet_approvals')
      .select('*')
      .gte('week_start', fromWeekStart)
      .lte('week_start', toWeekStart);
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'fetch timesheet approvals for date range');
  }
}

export async function getTimesheetActionsForWeek(weekStart: string): Promise<TimesheetAction[]> {
  try {
    const { data, error } = await supabase
      .from('timesheet_actions')
      .select('*')
      .eq('week_start', weekStart)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'fetch timesheet actions');
  }
}

export async function logTimesheetAction(
  action: Omit<TimesheetAction, 'id' | 'created_at'>
): Promise<TimesheetAction> {
  try {
    const { data, error } = await supabase
      .from('timesheet_actions')
      .insert(action)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'log timesheet action');
  }
}

export async function updateActionOutcome(
  actionId: string,
  outcome: string,
  notes?: string
): Promise<TimesheetAction> {
  try {
    const { data, error } = await supabase
      .from('timesheet_actions')
      .update({ outcome, notes: notes ?? null })
      .eq('id', actionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'update action outcome');
  }
}

export async function getTimesheetApprovalsForWeek(weekStart: string): Promise<TimesheetApproval[]> {
  try {
    const { data, error } = await supabase
      .from('timesheet_approvals')
      .select('*')
      .eq('week_start', weekStart);
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'fetch timesheet approvals');
  }
}

export async function upsertTimesheetApproval(
  approval: Omit<TimesheetApproval, 'id' | 'created_at'>
): Promise<TimesheetApproval> {
  try {
    const { data, error } = await supabase
      .from('timesheet_approvals')
      .upsert(approval, { onConflict: 'employee_name,week_start' })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'upsert timesheet approval');
  }
}

export async function getEmployeeEntries(
  employeeName: string,
  fromDate: string,
  toDate: string
): Promise<TimesheetEntry[]> {
  try {
    const { data, error } = await supabase
      .from('timesheet_entries')
      .select('*')
      .eq('employee_name', employeeName)
      .gte('entry_date', fromDate)
      .lte('entry_date', toDate)
      .order('entry_date')
      .order('cost_centre');
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'fetch employee entries');
  }
}

export async function getAllEmployeeActions(employeeName: string): Promise<TimesheetAction[]> {
  try {
    const { data, error } = await supabase
      .from('timesheet_actions')
      .select('*')
      .eq('employee_name', employeeName)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'fetch employee actions');
  }
}

export async function getAllEmployeeApprovals(employeeName: string): Promise<TimesheetApproval[]> {
  try {
    const { data, error } = await supabase
      .from('timesheet_approvals')
      .select('*')
      .eq('employee_name', employeeName)
      .order('week_start', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    handleDatabaseError(error, 'fetch employee approvals');
  }
}

export interface TimesheetEmployeeSettings {
  employee_name: string;
  is_part_time: boolean;
  updated_at: string;
}

export async function getTimesheetEmployeeSettings(): Promise<TimesheetEmployeeSettings[]> {
  try {
    const { data, error } = await supabase
      .from('timesheet_employee_settings')
      .select('*');
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    handleDatabaseError(error, 'fetch timesheet employee settings');
  }
}

export async function setEmployeePartTime(employeeName: string, isPartTime: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('timesheet_employee_settings')
      .upsert({ employee_name: employeeName, is_part_time: isPartTime, updated_at: new Date().toISOString() }, { onConflict: 'employee_name' });
    if (error) throw error;
  } catch (error) {
    handleDatabaseError(error, 'set employee part time');
  }
}

export async function deleteAllTimesheetData(): Promise<void> {
  try {
    // Delete entries first (upload_id FK is SET NULL, so order matters less, but entries is the main data)
    const { error: e1 } = await supabase.from('timesheet_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e1) throw e1;
    const { error: e2 } = await supabase.from('timesheet_uploads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e2) throw e2;
    const { error: e3 } = await supabase.from('timesheet_actions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e3) throw e3;
    const { error: e4 } = await supabase.from('timesheet_approvals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e4) throw e4;
  } catch (error) {
    handleDatabaseError(error, 'delete all timesheet data');
  }
}

export async function getTimesheetStats(): Promise<{
  totalEntries: number;
  totalEmployees: number;
  latestUpload: TimesheetUpload | null;
}> {
  try {
    const [countResult, empResult, uploadResult] = await Promise.all([
      supabase.from('timesheet_entries').select('id', { count: 'exact', head: true }),
      supabase.from('timesheet_entries').select('employee_name').limit(1000),
      supabase.from('timesheet_uploads').select('*').order('uploaded_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const uniqueEmployees = new Set(empResult.data?.map((r) => r.employee_name) ?? []).size;

    return {
      totalEntries: countResult.count ?? 0,
      totalEmployees: uniqueEmployees,
      latestUpload: uploadResult.data ?? null,
    };
  } catch (error) {
    handleDatabaseError(error, 'fetch timesheet stats');
  }
}
