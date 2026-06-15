export interface CsvTimesheetRow {
  employee: string;
  date: string;
  startTime: string;
  endTime: string;
  breaks: string;
  units: number;
  costCentre: string;
  notes: string;
  status: string;
  approvedBy: string;
  approvedOn: string;
  manager: string;
}

function parseRawCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const n = text.length;
  for (let i = 0; i < n; i++) {
    const ch = text[i];
    const next = i + 1 < n ? text[i + 1] : '';

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(cell);
        cell = '';
        rows.push(row);
        row = [];
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(cell);
        cell = '';
        rows.push(row);
        row = [];
      } else {
        cell += ch;
      }
    }
  }

  if (row.length > 0 || cell) {
    row.push(cell);
    if (row.some((c) => c.trim())) rows.push(row);
  }

  return rows;
}

export function parseTimesheetCSV(text: string): CsvTimesheetRow[] {
  const rows = parseRawCSV(text);
  if (rows.length < 2) return [];

  return rows
    .slice(1) // skip header
    .filter((row) => row.length >= 6 && row[0]?.trim())
    .map((row) => ({
      employee: row[0]?.trim() ?? '',
      date: row[1]?.trim() ?? '',
      startTime: row[2]?.trim() ?? '',
      endTime: row[3]?.trim() ?? '',
      breaks: row[4]?.trim() ?? '',
      units: parseFloat(row[5]) || 0,
      costCentre: row[6]?.trim() ?? '',
      notes: row[7]?.trim() ?? '',
      status: row[8]?.trim() ?? 'Pending',
      approvedBy: row[9]?.trim() ?? '',
      approvedOn: row[10]?.trim() ?? '',
      manager: row[11]?.trim() ?? '',
    }))
    .filter((r) => r.employee && r.date && r.units > 0);
}

// "DD/MM/YYYY" → "YYYY-MM-DD"
export function parseDateDMY(dmy: string): string {
  const parts = dmy.split('/');
  if (parts.length !== 3) return '';
  const [d, m, y] = parts;
  if (!d || !m || !y) return '';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// "DD/MM/YYYY at HH:MM:SS" → ISO 8601 timestamptz string
export function parseApprovedOn(raw: string): string | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4}) at (\d{2}:\d{2}:\d{2})$/);
  if (!match) return null;
  const [, d, m, y, time] = match;
  return `${y}-${m}-${d}T${time}+10:00`;
}
