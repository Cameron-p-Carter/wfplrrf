"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getAllAllocations,
  getOverAllocatedPeople,
  getPersonUtilization,
  getPeople,
  getPeopleWithContractCoverage,
} from "@/lib/supabase";
import { useTimePeriod } from "@/lib/providers/time-period-provider";
import type { Tables } from "@/types/supabase";

export function useResourceAnalytics() {
  const [overAllocatedPeople, setOverAllocatedPeople] = useState<any[]>([]);
  const [peopleUtilization, setPeopleUtilization] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { range } = useTimePeriod();

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [overAllocated, people, coveredIds] = await Promise.all([
        getOverAllocatedPeople(),
        getPeople(),
        getPeopleWithContractCoverage(range.startDate, range.endDate),
      ]);

      setOverAllocatedPeople(overAllocated);

      const coveredSet = new Set(coveredIds);
      const eligiblePeople = people.filter((p) => p.id && coveredSet.has(p.id));

      // Calculate utilization only for people with contract coverage in this period
      const utilizationPromises = eligiblePeople.map(async (person) => {
        if (!person.id) return null;
        
        const utilization = await getPersonUtilization(
          person.id,
          range.startDate,
          range.endDate
        );
        
        return {
          person_id: person.id,
          person_name: person.display_name,
          role_type_name: person.role_type_name,
          utilization_percentage: utilization,
          status: utilization > 100 ? 'over-allocated' : 
                  utilization >= 80 ? 'fully-utilized' :
                  utilization >= 50 ? 'partially-utilized' : 'under-utilized'
        };
      });
      
      const utilizationResults = await Promise.all(utilizationPromises);
      setPeopleUtilization(utilizationResults.filter(Boolean));
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch resource analytics";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range.startDate, range.endDate]);

  const getUtilizationStats = () => {
    const total = peopleUtilization.length;
    if (total === 0) return { total: 0, overAllocated: 0, fullyUtilized: 0, underUtilized: 0, averageUtilization: 0 };
    
    const overAllocated = peopleUtilization.filter(p => p.status === 'over-allocated').length;
    const fullyUtilized = peopleUtilization.filter(p => p.status === 'fully-utilized').length;
    const underUtilized = peopleUtilization.filter(p => p.status === 'under-utilized').length;
    const averageUtilization = peopleUtilization.reduce((sum, p) => sum + p.utilization_percentage, 0) / total;
    
    return {
      total,
      overAllocated,
      fullyUtilized,
      underUtilized,
      averageUtilization: Math.round(averageUtilization)
    };
  };

  return {
    overAllocatedPeople,
    peopleUtilization,
    utilizationStats: getUtilizationStats(),
    loading,
    error,
    refetch: fetchAnalytics,
  };
}

export function usePersonUtilization(personId: string, customStartDate?: string, customEndDate?: string) {
  const [utilization, setUtilization] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { range } = useTimePeriod();

  useEffect(() => {
    const fetchUtilization = async () => {
      if (!personId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Use custom dates if provided, otherwise use time period context
        const startDate = customStartDate || range.startDate;
        const endDate = customEndDate || range.endDate;
        
        const result = await getPersonUtilization(personId, startDate, endDate);
        setUtilization(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch person utilization";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchUtilization();
  }, [personId, customStartDate, customEndDate, range.startDate, range.endDate]);

  return {
    utilization,
    loading,
    error,
  };
}
