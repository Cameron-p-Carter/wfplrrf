"use client";

import React, { createContext, useContext, useState } from "react";

export type TimePeriod = "current-month" | "next-3-months" | "all-future";

export interface TimePeriodRange {
  startDate: string;
  endDate: string;
  label: string;
  description: string;
}

interface TimePeriodContextType {
  period: TimePeriod;
  setPeriod: (period: TimePeriod) => void;
  range: TimePeriodRange;
  periodOptions: { value: TimePeriod; label: string; description: string }[];
}

const TimePeriodContext = createContext<TimePeriodContextType | undefined>(undefined);

export function useTimePeriod() {
  const context = useContext(TimePeriodContext);
  if (!context) {
    throw new Error("useTimePeriod must be used within a TimePeriodProvider");
  }
  return context;
}

export function getTimePeriodRange(period: TimePeriod): TimePeriodRange {
  const now = new Date();
  
  switch (period) {
    case "current-month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0],
        label: "This Month",
        description: `${startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
      };
    }
    
    case "next-3-months": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfPeriod = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfPeriod.toISOString().split('T')[0],
        label: "Next 3 Months",
        description: `${startOfMonth.toLocaleDateString('en-US', { month: 'short' })} - ${endOfPeriod.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
      };
    }
    
    case "all-future": {
      const today = new Date();
      const futureEnd = new Date(2030, 11, 31); // Far future date
      
      return {
        startDate: today.toISOString().split('T')[0],
        endDate: futureEnd.toISOString().split('T')[0],
        label: "All Future",
        description: "From today onwards"
      };
    }
    
    default:
      throw new Error(`Unknown time period: ${period}`);
  }
}

interface TimePeriodProviderProps {
  children: React.ReactNode;
  defaultPeriod?: TimePeriod;
}

export function TimePeriodProvider({ 
  children, 
  defaultPeriod = "current-month" 
}: TimePeriodProviderProps) {
  const [period, setPeriod] = useState<TimePeriod>(defaultPeriod);
  
  const periodOptions = [
    {
      value: "current-month" as TimePeriod,
      label: "This Month",
      description: "Current month only"
    },
    {
      value: "next-3-months" as TimePeriod,
      label: "Next 3 Months", 
      description: "Current + next 2 months"
    },
    {
      value: "all-future" as TimePeriod,
      label: "All Future",
      description: "From today onwards"
    }
  ];

  const range = getTimePeriodRange(period);

  const value: TimePeriodContextType = {
    period,
    setPeriod,
    range,
    periodOptions
  };

  return (
    <TimePeriodContext.Provider value={value}>
      {children}
    </TimePeriodContext.Provider>
  );
}