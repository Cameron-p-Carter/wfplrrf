"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPersonById, getPersonAllocations, getPersonLeave } from "@/lib/supabase";
import { usePersonUtilization } from "@/lib/hooks/use-resource-analytics";
import { useProjectAllocations } from "@/lib/hooks/use-project-allocations";
import { useLeavePeriods } from "@/lib/hooks/use-leave-periods";
import { Timeline } from "@/components/ui/timeline";
import { InteractiveTimeline } from "@/components/ui/interactive-timeline";
import { formatDate } from "@/lib/utils/date";
import { getDefaultTimelineRange, TimelineItem, TimelineConfig } from "@/lib/utils/timeline";
import type { Tables } from "@/types/supabase";

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const personId = params.id as string;
  
  const [person, setPerson] = useState<Tables<"people"> | null>(null);
  const [personLoading, setPersonLoading] = useState(true);
  const [allocations, setAllocations] = useState<Tables<"project_allocations_detailed">[]>([]);
  const [allocationsLoading, setAllocationsLoading] = useState(true);
  const [leavePeriods, setLeavePeriods] = useState<Tables<"leave_periods">[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  
  const { utilization, loading: utilizationLoading } = usePersonUtilization(personId);
  const { update: updateAllocation } = useProjectAllocations(''); // We'll pass the project ID when updating
  const { update: updateLeave } = useLeavePeriods();
  
  const [timelineConfig, setTimelineConfig] = useState<TimelineConfig>(() => ({
    ...getDefaultTimelineRange(),
    granularity: 'month' as const,
  }));

  useEffect(() => {
    const fetchPersonData = async () => {
      if (!personId) return;
      
      try {
        setPersonLoading(true);
        setAllocationsLoading(true);
        setLeaveLoading(true);
        
        const [personData, allocationsData, leaveData] = await Promise.all([
          getPersonById(personId),
          getPersonAllocations(personId),
          getPersonLeave(personId)
        ]);
        
        setPerson(personData);
        setAllocations(allocationsData);
        setLeavePeriods(leaveData);
      } catch (error) {
        console.error("Failed to fetch person data:", error);
        router.push("/dashboard/people");
      } finally {
        setPersonLoading(false);
        setAllocationsLoading(false);
        setLeaveLoading(false);
      }
    };

    fetchPersonData();
  }, [personId, router]);

  const getUtilizationBadge = (utilization: number) => {
    if (utilization > 100) {
      return <Badge variant="destructive">{utilization}%</Badge>;
    } else if (utilization >= 80) {
      return <Badge variant="default">{utilization}%</Badge>;
    } else if (utilization >= 50) {
      return <Badge variant="secondary">{utilization}%</Badge>;
    } else {
      return <Badge variant="outline">{utilization}%</Badge>;
    }
  };

  const getTimelineItems = (): TimelineItem[] => {
    const items: TimelineItem[] = [];
    
    // Add allocations as timeline items
    allocations.forEach(alloc => {
      if (alloc.start_date && alloc.end_date && alloc.project_name) {
        items.push({
          id: `alloc-${alloc.id}`,
          title: `${alloc.project_name} (${alloc.role_type_name})`,
          startDate: new Date(alloc.start_date),
          endDate: new Date(alloc.end_date),
          type: 'allocation',
          percentage: alloc.allocation_percentage || 0,
          metadata: alloc,
        });
      }
    });
    
    // Add leave periods as timeline items
    leavePeriods.forEach(leave => {
      if (leave.start_date && leave.end_date) {
        items.push({
          id: `leave-${leave.id}`,
          title: `Leave (${leave.status})`,
          startDate: new Date(leave.start_date),
          endDate: new Date(leave.end_date),
          type: 'leave',
          metadata: leave,
        });
      }
    });
    
    return items;
  };

  const handleTimelineItemClick = (item: TimelineItem) => {
    if (item.type === 'allocation' && item.metadata?.project_id) {
      router.push(`/dashboard/projects/${item.metadata.project_id}`);
    }
  };

  if (personLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-[300px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Person not found</h2>
          <p className="text-muted-foreground">The person you're looking for doesn't exist.</p>
          <Button onClick={() => router.push("/dashboard/people")} className="mt-4">
            Back to People
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/people")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to People
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{person.name}</h1>
          <div className="flex items-center space-x-4 mt-2">
            <Badge variant="outline">Role: {person.role_type_id}</Badge>
            {!utilizationLoading && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Current Utilization:</span>
                {getUtilizationBadge(utilization)}
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="allocations">
              Allocations
              {allocations.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {allocations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="leave">
              Leave
              {leavePeriods.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {leavePeriods.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline">
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Person Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm">{person.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Role Type</label>
                    <p className="text-sm">{person.role_type_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Utilization</label>
                    <div className="mt-1">
                      {utilizationLoading ? (
                        <Skeleton className="h-5 w-16" />
                      ) : (
                        getUtilizationBadge(utilization)
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {allocationsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">{allocations.length}</span> active project allocations
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">
                          {new Set(allocations.map(alloc => alloc.project_id)).size}
                        </span> different projects
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">{leavePeriods.length}</span> leave periods
                      </p>
                      {leavePeriods.filter(leave => leave.status === 'pending').length > 0 && (
                        <p className="text-sm text-orange-600">
                          <span className="font-medium">
                            {leavePeriods.filter(leave => leave.status === 'pending').length}
                          </span> pending leave requests
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="allocations">
            <Card>
              <CardHeader>
                <CardTitle>Project Allocations</CardTitle>
                <CardDescription>
                  Current and past project assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allocationsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-4 w-[120px]" />
                      </div>
                    ))}
                  </div>
                ) : allocations.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No project allocations found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {allocations.map((allocation) => (
                      <div
                        key={allocation.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => router.push(`/dashboard/projects/${allocation.project_id}`)}
                      >
                        <div className="space-y-1">
                          <h4 className="font-medium">{allocation.project_name}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{allocation.role_type_name}</Badge>
                            <Badge variant={
                              (allocation.allocation_percentage || 0) > 100 ? "destructive" :
                              (allocation.allocation_percentage || 0) >= 80 ? "default" : "secondary"
                            }>
                              {allocation.allocation_percentage}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(allocation.start_date!)} - {formatDate(allocation.end_date!)}
                          </p>
                        </div>
                        <ArrowLeft className="h-4 w-4 rotate-180" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave">
            <Card>
              <CardHeader>
                <CardTitle>Leave Periods</CardTitle>
                <CardDescription>
                  Scheduled time off and leave requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leaveLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    ))}
                  </div>
                ) : leavePeriods.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No leave periods found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {leavePeriods.map((leave) => (
                      <div
                        key={leave.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                            </span>
                            <Badge variant={
                              leave.status === 'approved' ? 'default' :
                              leave.status === 'pending' ? 'secondary' : 'destructive'
                            }>
                              {leave.status}
                            </Badge>
                          </div>
                          {leave.notes && (
                            <p className="text-sm text-muted-foreground">{leave.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <InteractiveTimeline
              title="Interactive Person Timeline"
              items={getTimelineItems()}
              config={timelineConfig}
              onConfigChange={setTimelineConfig}
              onItemClick={handleTimelineItemClick}
              onItemUpdate={async (item, newStartDate, newEndDate) => {
                if (item.type === 'allocation' && item.metadata) {
                  // Update allocation using the existing hook
                  await updateAllocation(item.metadata.id, {
                    ...item.metadata,
                    start_date: newStartDate.toISOString().split('T')[0],
                    end_date: newEndDate.toISOString().split('T')[0],
                  });
                  // Refresh the data
                  const updatedAllocations = await getPersonAllocations(personId);
                  setAllocations(updatedAllocations);
                } else if (item.type === 'leave' && item.metadata) {
                  // Update leave period using the existing hook
                  await updateLeave(item.metadata.id, {
                    start_date: newStartDate.toISOString().split('T')[0],
                    end_date: newEndDate.toISOString().split('T')[0],
                    person_id: personId,
                    status: item.metadata.status,
                    notes: item.metadata.notes,
                  });
                  // Refresh the data
                  const updatedLeave = await getPersonLeave(personId);
                  setLeavePeriods(updatedLeave);
                }
              }}
              enableSnapping={true}
              snapGranularity="day"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
