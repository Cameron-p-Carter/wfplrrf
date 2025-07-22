"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getPeople, getPersonUtilization } from "@/lib/supabase";
import { useTimePeriod } from "@/lib/providers/time-period-provider";

interface UtilizationDataPoint {
  date: string;
  averageUtilization: number;
  totalPeople: number;
}

export function useUtilizationTimeline() {
  const [timelineData, setTimelineData] = useState<UtilizationDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { range, period } = useTimePeriod();

  const fetchUtilizationTimeline = async () => {
    try {
      setLoading(true);
      setError(null);

      const people = await getPeople();
      if (people.length === 0) {
        setTimelineData([]);
        return;
      }

      const startDate = new Date(range.startDate);
      let endDate = new Date(range.endDate);
      
      // Limit "all-future" to max 1 year
      if (period === "all-future") {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        if (endDate > oneYearFromNow) {
          endDate = oneYearFromNow;
        }
      }

      const dataPoints: UtilizationDataPoint[] = [];

      // Generate date intervals based on time period with Australian formatting
      const getDateIntervals = () => {
        const intervals = [];
        let current = new Date(startDate);

        switch (period) {
          case "current-month":
            // Weekly intervals for current month
            while (current <= endDate) {
              const intervalEnd = new Date(current);
              intervalEnd.setDate(intervalEnd.getDate() + 6); // Week end
              if (intervalEnd > endDate) intervalEnd.setTime(endDate.getTime());
              
              intervals.push({
                start: new Date(current),
                end: intervalEnd,
                label: current.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) // "15 Jan"
              });
              
              current.setDate(current.getDate() + 7);
            }
            break;

          case "next-3-months":
            // Bi-weekly intervals for 3 months
            while (current <= endDate) {
              const intervalEnd = new Date(current);
              intervalEnd.setDate(intervalEnd.getDate() + 13); // 2 weeks
              if (intervalEnd > endDate) intervalEnd.setTime(endDate.getTime());
              
              intervals.push({
                start: new Date(current),
                end: intervalEnd,
                label: current.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) // "15 Jan"
              });
              
              current.setDate(current.getDate() + 14);
            }
            break;

          case "all-future":
            // Monthly intervals for up to 1 year
            while (current <= endDate && intervals.length < 12) {
              const intervalEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
              if (intervalEnd > endDate) intervalEnd.setTime(endDate.getTime());
              
              intervals.push({
                start: new Date(current),
                end: intervalEnd,
                label: current.toLocaleDateString('en-AU', { month: 'short' }) // "Jan"
              });
              
              current.setMonth(current.getMonth() + 1);
              current.setDate(1);
            }
            break;
        }

        return intervals;
      };

      const intervals = getDateIntervals();

      // Calculate average utilization for each interval
      for (const interval of intervals) {
        let totalUtilization = 0;
        let validPeople = 0;

        const intervalStart = interval.start.toISOString().split('T')[0];
        const intervalEnd = interval.end.toISOString().split('T')[0];

        // Get utilization for each person in this interval
        for (const person of people) {
          if (!person.id) continue;

          try {
            const utilization = await getPersonUtilization(person.id, intervalStart, intervalEnd);
            totalUtilization += utilization;
            validPeople++;
          } catch (error) {
            // Skip this person if utilization calculation fails
            console.warn(`Failed to get utilization for person ${person.id}:`, error);
          }
        }

        const averageUtilization = validPeople > 0 ? totalUtilization / validPeople : 0;

        dataPoints.push({
          date: interval.label,
          averageUtilization: Math.round(averageUtilization * 10) / 10, // Round to 1 decimal
          totalPeople: validPeople
        });
      }

      setTimelineData(dataPoints);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch utilization timeline";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUtilizationTimeline();
  }, [range.startDate, range.endDate, period]);

  const getCurrentAverage = () => {
    if (timelineData.length === 0) return 0;
    const total = timelineData.reduce((sum, point) => sum + point.averageUtilization, 0);
    return Math.round((total / timelineData.length) * 10) / 10;
  };

  const getTrend = () => {
    if (timelineData.length < 2) return "stable";
    
    const firstHalf = timelineData.slice(0, Math.floor(timelineData.length / 2));
    const secondHalf = timelineData.slice(Math.floor(timelineData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, point) => sum + point.averageUtilization, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, point) => sum + point.averageUtilization, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 5) return "increasing";
    if (diff < -5) return "decreasing";
    return "stable";
  };

  return {
    timelineData,
    currentAverage: getCurrentAverage(),
    trend: getTrend(),
    loading,
    error,
    refetch: fetchUtilizationTimeline,
  };
}