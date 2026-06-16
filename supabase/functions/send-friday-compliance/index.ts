import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';


function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtAU(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const slackToken = Deno.env.get('SLACK_BOT_TOKEN')!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Allow caller to pass a specific week or employee; defaults to current week / all employees
    let body: { week?: string; employeeName?: string } = {};
    try {
      body = await req.json();
    } catch {
      // no body or invalid JSON — use defaults
    }
    const weekStart = body.week ? new Date(body.week + 'T00:00:00') : getMonday(new Date());

    const weekStartStr = fmt(weekStart);
    const weekEnd = new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000);
    const weekEndStr = fmt(weekEnd);
    const today = fmt(new Date());

    const weekLabel = `${weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    // Fetch entries, holidays, approvals, and employee settings in parallel
    const [entriesRes, holidaysRes, approvalsRes, settingsRes, peopleRes] = await Promise.all([
      supabase
        .from('timesheet_entries')
        .select('employee_name, entry_date, units, cost_centre')
        .gte('entry_date', weekStartStr)
        .lte('entry_date', weekEndStr),
      supabase.from('au_public_holidays').select('holiday_date'),
      supabase
        .from('timesheet_approvals')
        .select('employee_name')
        .eq('week_start', weekStartStr),
      supabase
        .from('timesheet_employee_settings')
        .select('employee_name, is_part_time'),
      supabase.from('people').select('display_name, email'),
    ]);

    if (entriesRes.error) throw new Error(entriesRes.error.message);
    if (holidaysRes.error) throw new Error(holidaysRes.error.message);
    if (approvalsRes.error) throw new Error(approvalsRes.error.message);

    const entries = entriesRes.data ?? [];
    const holidaySet = new Set((holidaysRes.data ?? []).map((h: { holiday_date: string }) => h.holiday_date));
    const approvedSet = new Set((approvalsRes.data ?? []).map((a: { employee_name: string }) => a.employee_name));
    const settings = (settingsRes.data ?? []) as { employee_name: string; is_part_time: boolean; is_off_work: boolean }[];
    const partTimeSet = new Set(settings.filter((s) => s.is_part_time).map((s) => s.employee_name));
    const offWorkSet = new Set(settings.filter((s) => s.is_off_work).map((s) => s.employee_name));
    const allPeople = (peopleRes.data ?? []) as { display_name: string; email: string | null }[];
    const allPeopleNames = allPeople.map((p) => p.display_name).filter(Boolean);

    // Weekday date strings Mon–Fri
    const weekdays: string[] = [];
    for (let i = 0; i < 5; i++) {
      weekdays.push(fmt(new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)));
    }

    const publicHolidaysThisWeek = weekdays.filter((d) => holidaySet.has(d)).length;
    const expectedHours = Math.max(0, 40 - publicHolidaysThisWeek * 8);

    // Group entries by employee → day
    type DayEntry = { hours: number; costCentres: string[] };
    const byEmployee = new Map<string, Record<string, DayEntry>>();
    for (const e of entries) {
      if (!byEmployee.has(e.employee_name)) byEmployee.set(e.employee_name, {});
      const dm = byEmployee.get(e.employee_name)!;
      if (!dm[e.entry_date]) dm[e.entry_date] = { hours: 0, costCentres: [] };
      dm[e.entry_date].hours += Number(e.units);
      dm[e.entry_date].costCentres.push(e.cost_centre);
    }

    // Identify non-compliant employees
    type Issue = {
      name: string;
      weekdayHours: number;
      bullets: string[];
    };

    const issues: Issue[] = [];

    for (const [name, dayMap] of byEmployee) {
      if (approvedSet.has(name)) continue;
      if (offWorkSet.has(name)) continue;

      const weekdayHours = weekdays.reduce((s, d) => s + (dayMap[d]?.hours ?? 0), 0);
      const isPartTime = partTimeSet.has(name);
      const bullets: string[] = [];

      if (!isPartTime && weekdayHours < expectedHours) {
        bullets.push(`• Under ${expectedHours}h — logged ${weekdayHours.toFixed(1)}h`);
      }
      if (!isPartTime && weekdayHours > 40) {
        bullets.push(`• Over 40h — logged ${weekdayHours.toFixed(1)}h`);
      }

      if (!isPartTime) {
        for (const d of weekdays) {
          if (!dayMap[d] && !holidaySet.has(d)) {
            bullets.push(`• Missing entry: ${fmtAU(d)}`);
          }
        }
      }

      for (const [date] of Object.entries(dayMap)) {
        const dow = new Date(date + 'T00:00:00').getDay();
        if (dow === 0 || dow === 6) {
          bullets.push(`• Weekend work recorded: ${fmtAU(date)}`);
        }
      }

      if (bullets.length > 0) {
        issues.push({ name, weekdayHours, bullets });
      }
    }

    // Add employees from the people list who submitted no entries at all
    for (const name of allPeopleNames) {
      if (byEmployee.has(name)) continue;
      if (approvedSet.has(name)) continue;
      if (offWorkSet.has(name)) continue;
      const isPartTime = partTimeSet.has(name);
      if (isPartTime) continue;
      const bullets: string[] = [`• No timesheet submitted — logged 0.0h`];
      issues.push({ name, weekdayHours: 0, bullets });
    }

    // If a specific employee was requested, filter to just them
    const targetEmployee: string | undefined = body.employeeName;
    const filteredIssues = targetEmployee
      ? issues.filter((i) => i.name === targetEmployee)
      : issues;

    if (filteredIssues.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, skipped: 0, failed: [], week: weekLabel, message: targetEmployee ? 'No issues found for employee' : 'All compliant' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build email map from already-fetched people data
    const emailByName = new Map(
      allPeople
        .filter((p) => p.email)
        .map((p) => [p.display_name, p.email as string])
    );

    // Slack helpers
    async function lookupSlackUser(email: string): Promise<string | null> {
      const res = await fetch(
        `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
        { headers: { Authorization: `Bearer ${slackToken}` } }
      );
      const data = await res.json();
      return data.ok ? data.user.id : null;
    }

    async function sendDM(userId: string, text: string): Promise<{ ok: boolean; error?: string }> {
      const openRes = await fetch('https://slack.com/api/conversations.open', {
        method: 'POST',
        headers: { Authorization: `Bearer ${slackToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: userId }),
      });
      const openData = await openRes.json();
      if (!openData.ok) return { ok: false, error: `conversations.open: ${openData.error}` };

      const msgRes = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${slackToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: openData.channel.id, text }),
      });
      const msgData = await msgRes.json();
      return msgData.ok ? { ok: true } : { ok: false, error: `chat.postMessage: ${msgData.error}` };
    }

    let sent = 0;
    let skipped = 0;
    const failed: string[] = [];

    for (const emp of filteredIssues) {
      const email = emailByName.get(emp.name);
      if (!email) {
        skipped++;
        failed.push(`${emp.name} (no email in people table)`);
        continue;
      }

      const slackUserId = await lookupSlackUser(email);
      if (!slackUserId) {
        skipped++;
        failed.push(`${emp.name} (not found in Slack workspace)`);
        continue;
      }

      const firstName = emp.name.split(' ')[0];
      const message = [
        `Hi ${firstName}, your timesheet for *${weekLabel}* needs attention:`,
        '',
        emp.bullets.join('\n'),
        '',
        'Please update your timesheet as soon as possible. Thanks!',
      ].join('\n');

      const result = await sendDM(slackUserId, message);

      if (result.ok) {
        sent++;
        await supabase.from('timesheet_actions').insert({
          employee_name: emp.name,
          week_start: weekStartStr,
          action_type: 'slack',
          action_date: today,
          action_by: 'Automated',
          outcome: 'Sent',
          notes: `Auto Friday reminder — ${emp.bullets.length} issue${emp.bullets.length !== 1 ? 's' : ''}`,
        });
      } else {
        failed.push(`${emp.name} (${result.error ?? 'Slack DM failed'})`);
      }
    }

    return new Response(
      JSON.stringify({ sent, skipped, failed, total: filteredIssues.length, week: weekLabel }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
