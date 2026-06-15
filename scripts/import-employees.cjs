const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local')
  const content = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    env[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim()
  }
  return env
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim())
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? '').trim()]))
  })
}

function parseDate(str) {
  if (!str || str === '0') return null
  const parts = str.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function parseBool(str) {
  if (!str) return null
  return str.toLowerCase() === 'true'
}

async function main() {
  const env = loadEnv()

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const csvPath = path.resolve(__dirname, '../supabase/migrations/employee_details.csv')
  const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'))

  const active = rows.filter(r => r.employee_status === 'Active')
  console.log(`${active.length} active / ${rows.length} total employees`)

  // --- Step 1: upsert role_types from unique positions ---
  const positions = [...new Set(active.map(r => r.employee_position).filter(Boolean))]
  console.log(`\n${positions.length} unique positions found`)

  const { data: existingRoleTypes, error: rtFetchErr } = await supabase
    .from('role_types')
    .select('id, name')

  if (rtFetchErr) { console.error('Failed to fetch role_types:', rtFetchErr.message); process.exit(1) }

  const roleTypeMap = new Map(existingRoleTypes.map(rt => [rt.name, rt.id]))

  for (const position of positions) {
    if (roleTypeMap.has(position)) continue
    const { data, error } = await supabase
      .from('role_types')
      .insert({ name: position })
      .select('id, name')
      .single()
    if (error) {
      console.error(`  Failed to create role_type "${position}":`, error.message)
    } else {
      roleTypeMap.set(data.name, data.id)
      console.log(`  Created role_type: ${position}`)
    }
  }

  // --- Step 2: import people ---
  console.log('\nImporting people...')

  const BATCH = 50
  let imported = 0
  let skipped = 0

  for (let i = 0; i < active.length; i += BATCH) {
    const batch = active.slice(i, i + BATCH)
    const records = []

    for (const r of batch) {
      const role_type_id = roleTypeMap.get(r.employee_position)
      if (!role_type_id) {
        console.warn(`  Skipping ${r.display_name}: no role_type for "${r.employee_position}"`)
        skipped++
        continue
      }
      records.push({
        first_name:           r.first_name,
        last_name:            r.last_name,
        preferred_name:       r.preferred_name || null,
        display_name:         r.display_name || `${r.first_name} ${r.last_name}`,
        email:                r.employee_email || null,
        employee_number:      r.employee_number || null,
        external_hr_id:       r.id || null,
        external_hr_uuid:     r.uuid || null,
        employee_position:    r.employee_position || null,
        role_type_id,
        employee_status:      r.employee_status || null,
        employee_status_enum: r.employee_status_enum || null,
        worker_type:          r.worker_type || null,
        start_date:           parseDate(r.start_date),
        system_access_date:   parseDate(r.system_access_date),
        terminated:           parseBool(r.terminated) || false,
        terminated_date:      parseDate(r.terminated_date),
        country:              r.country || null,
        work_location_id:     r.work_location_id || null,
        manager_external_id:  r.manager_id || null,
        manager_name:         r.manager_name || null,
        team_ids:             r.team_ids || null,
        is_payroll_connected: parseBool(r.is_payroll_connected),
        preboarding_access:   parseBool(r.preboarding_access),
        is_peo_employee:      parseBool(r.is_peo_employee),
        has_rehire_offboard:  parseBool(r.has_rehire_offboard),
      })
    }

    if (records.length === 0) continue

    const { error } = await supabase
      .from('people')
      .upsert(records, { onConflict: 'external_hr_id' })

    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH) + 1} error:`, error.message)
    } else {
      imported += records.length
      process.stdout.write(`  ${imported} imported\r`)
    }
  }

  console.log(`\nImported ${imported}, skipped ${skipped}`)

  // --- Step 3: resolve manager_id ---
  console.log('\nResolving manager relationships...')

  const { data: allPeople, error: peopleFetchErr } = await supabase
    .from('people')
    .select('id, external_hr_id, manager_external_id')

  if (peopleFetchErr) { console.error('Failed to fetch people:', peopleFetchErr.message); process.exit(1) }

  const hrIdToUuid = new Map(
    allPeople.filter(p => p.external_hr_id).map(p => [p.external_hr_id, p.id])
  )

  let resolved = 0
  let unresolved = 0

  for (const person of allPeople) {
    if (!person.manager_external_id) continue
    const managerId = hrIdToUuid.get(person.manager_external_id)
    if (!managerId) { unresolved++; continue }

    const { error } = await supabase
      .from('people')
      .update({ manager_id: managerId })
      .eq('id', person.id)

    if (!error) resolved++
  }

  console.log(`  Resolved: ${resolved}, unresolved: ${unresolved}`)
  console.log('\nDone.')
}

main().catch(err => { console.error(err); process.exit(1) })
