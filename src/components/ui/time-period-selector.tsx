import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTimePeriod } from "@/lib/providers/time-period-provider";
import { Calendar } from "lucide-react";

interface TimePeriodSelectorProps {
  showLabel?: boolean;
  compact?: boolean;
}

export function TimePeriodSelector({ showLabel = true, compact = false }: TimePeriodSelectorProps) {
  const { period, setPeriod, range, periodOptions } = useTimePeriod();

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
      {showLabel && !compact && (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Time Period:</span>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className={compact ? "w-[140px]" : "w-[160px]"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div>
                  <div className="font-medium">{option.label}</div>
                  {!compact && (
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {!compact && (
          <Badge variant="outline" className="text-xs">
            {range.description}
          </Badge>
        )}
      </div>
    </div>
  );
}