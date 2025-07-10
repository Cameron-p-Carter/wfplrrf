"use client";

import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { TimelineConfig } from "@/lib/utils/timeline";

interface TimelineHeaderProps {
  title: string;
  config: TimelineConfig;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export function TimelineHeader({ title, config, onNavigate }: TimelineHeaderProps) {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
        <div className="flex items-center space-x-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onNavigate('prev')}
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onNavigate('next')}
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}