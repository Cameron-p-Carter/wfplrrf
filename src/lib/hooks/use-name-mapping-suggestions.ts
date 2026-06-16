'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAllPeopleForMapping,
  getRecentTimesheetNames,
  getTimesheetNameMappings,
  createTimesheetNameMapping,
} from '@/lib/supabase/queries/timesheets';

export interface NameMappingSuggestion {
  timesheetName: string;
  suggestedDisplayName: string;
}

export function useNameMappingSuggestions() {
  const [suggestions, setSuggestions] = useState<NameMappingSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [people, recentNames, confirmedMappings] = await Promise.all([
        getAllPeopleForMapping(),
        getRecentTimesheetNames(),
        getTimesheetNameMappings(),
      ]);

      const peopleDisplayNames = new Set(people.map((p) => p.display_name));
      const confirmedTimesheetNames = new Set(confirmedMappings.map((m) => m.timesheet_name));

      // Build last-name → people map
      const byLastName = new Map<string, typeof people>();
      for (const p of people) {
        const ln = p.last_name.toLowerCase();
        if (!byLastName.has(ln)) byLastName.set(ln, []);
        byLastName.get(ln)!.push(p);
      }

      const newSuggestions: NameMappingSuggestion[] = [];

      for (const timesheetName of recentNames) {
        // Skip if exact match or already mapped
        if (peopleDisplayNames.has(timesheetName)) continue;
        if (confirmedTimesheetNames.has(timesheetName)) continue;

        // Extract last name (last word)
        const parts = timesheetName.trim().split(/\s+/);
        const lastName = parts[parts.length - 1].toLowerCase();

        const matches = byLastName.get(lastName) ?? [];
        if (matches.length === 1) {
          newSuggestions.push({
            timesheetName,
            suggestedDisplayName: matches[0].display_name,
          });
        }
      }

      setSuggestions(newSuggestions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmMapping = useCallback(
    async (timesheetName: string, displayName: string) => {
      await createTimesheetNameMapping(timesheetName, displayName);
      await load();
    },
    [load]
  );

  return { suggestions, loading, confirmMapping, refresh: load };
}
