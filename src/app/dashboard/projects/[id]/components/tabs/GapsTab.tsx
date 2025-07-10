import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils/date";

interface Gap {
  role_type_name: string;
  required_count: number;
  allocated_count: number;
  gap_count: number;
  start_date: string;
  end_date: string;
}

interface GapsTabProps {
  gaps: Gap[];
  loading: boolean;
}

export function GapsTab({ gaps, loading }: GapsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Gaps</CardTitle>
        <CardDescription>
          Unfilled resource requirements that need attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[120px]" />
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Gap</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!gaps || gaps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No resource gaps! All requirements are fully allocated.
                  </TableCell>
                </TableRow>
              ) : (
                gaps.map((gap, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {gap.role_type_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{gap.required_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{gap.allocated_count.toFixed(1)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{gap.gap_count.toFixed(1)}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(gap.start_date)}</TableCell>
                    <TableCell>{formatDate(gap.end_date)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}