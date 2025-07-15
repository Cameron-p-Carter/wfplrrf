"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, User, Percent, AlertTriangle, AlertCircle } from "lucide-react";
import { usePeople } from "@/lib/hooks/use-people";
import { useResourceAnalytics } from "@/lib/hooks/use-resource-analytics";
import { formatDate } from "@/lib/utils/date";
import { getPersonLeaveConflicts } from "@/lib/supabase";
import type { Tables } from "@/types/supabase";

interface SmartAllocationFormProps {
  initialData?: {
    person_id: string;
    role_type_id: string;
    allocation_percentage: number;
    start_date: string;
    end_date: string;
    requirement_id?: string;
  };
  prefilledData?: {
    role_type_id: string;
    start_date: string;
    end_date: string;
    requirement_id?: string;
    requiredCount?: number;
  };
  onSubmit: (data: {
    person_id: string;
    role_type_id: string;
    allocation_percentage: number;
    start_date: string;
    end_date: string;
    requirement_id?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

interface PersonWithUtilization extends Tables<"people_with_roles"> {
  currentUtilization: number;
  isAvailable: boolean;
  matchesRole: boolean;
}

export function SmartAllocationForm({ initialData, prefilledData, onSubmit, onCancel }: SmartAllocationFormProps) {
  const [formData, setFormData] = useState(() => {
    // Calculate smart default allocation percentage
    let defaultAllocation = initialData?.allocation_percentage || 100;
    
    // If we have prefilled data with a requirement_id, we might be allocating to a gap
    // In that case, use the requirement's needed count as the default percentage
    if (prefilledData?.requirement_id && prefilledData.requiredCount) {
      // Convert required_count (e.g., 0.2) to percentage (e.g., 20%)
      defaultAllocation = Math.round(prefilledData.requiredCount * 100);
    }
    
    return {
      person_id: initialData?.person_id || "",
      role_type_id: prefilledData?.role_type_id || initialData?.role_type_id || "",
      allocation_percentage: defaultAllocation,
      start_date: prefilledData?.start_date || initialData?.start_date || "",
      end_date: prefilledData?.end_date || initialData?.end_date || "",
      requirement_id: prefilledData?.requirement_id || initialData?.requirement_id || undefined,
    };
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveConflicts, setLeaveConflicts] = useState<{
    pending: Tables<"leave_periods">[];
    approved: Tables<"leave_periods">[];
    unapproved: Tables<"leave_periods">[];
  } | null>(null);
  const [showApprovedLeaveDialog, setShowApprovedLeaveDialog] = useState(false);
  const { people, loading: peopleLoading } = usePeople();
  const { peopleUtilization, loading: utilizationLoading } = useResourceAnalytics();

  // Smart sorting of people
  const getSortedPeople = (): PersonWithUtilization[] => {
    if (peopleLoading || utilizationLoading) return [];

    const peopleWithUtilization: PersonWithUtilization[] = people.map(person => {
      const utilization = peopleUtilization.find(u => u.person_id === person.id);
      const currentUtilization = utilization?.utilization_percentage || 0;
      const isAvailable = currentUtilization < 100;
      const matchesRole = person.role_type_id === formData.role_type_id;

      return {
        ...person,
        currentUtilization,
        isAvailable,
        matchesRole,
      };
    });

    // Sort by priority: available + matching role > available + other role > busy + matching role > busy + other role
    return peopleWithUtilization.sort((a, b) => {
      // First priority: available people with matching role
      if (a.isAvailable && a.matchesRole && !(b.isAvailable && b.matchesRole)) return -1;
      if (b.isAvailable && b.matchesRole && !(a.isAvailable && a.matchesRole)) return 1;

      // Second priority: available people with other roles
      if (a.isAvailable && !a.matchesRole && !(b.isAvailable && !b.matchesRole)) {
        if (b.isAvailable && b.matchesRole) return 1; // Matching role wins
        if (!b.isAvailable) return -1; // Available wins over busy
      }
      if (b.isAvailable && !b.matchesRole && !(a.isAvailable && !a.matchesRole)) {
        if (a.isAvailable && a.matchesRole) return -1; // Matching role wins
        if (!a.isAvailable) return 1; // Available wins over busy
      }

      // Third priority: busy people with matching role
      if (!a.isAvailable && a.matchesRole && !(!b.isAvailable && b.matchesRole)) return -1;
      if (!b.isAvailable && b.matchesRole && !(!a.isAvailable && a.matchesRole)) return 1;

      // Within same category, sort by utilization (lower first)
      return a.currentUtilization - b.currentUtilization;
    });
  };

  const sortedPeople = getSortedPeople();

  // Check for leave conflicts when person or dates change
  useEffect(() => {
    const checkLeaveConflicts = async () => {
      if (formData.person_id && formData.start_date && formData.end_date) {
        try {
          const conflicts = await getPersonLeaveConflicts(
            formData.person_id,
            formData.start_date,
            formData.end_date
          );
          setLeaveConflicts(conflicts);
        } catch (error) {
          console.error("Failed to check leave conflicts:", error);
          setLeaveConflicts(null);
        }
      } else {
        setLeaveConflicts(null);
      }
    };

    checkLeaveConflicts();
  }, [formData.person_id, formData.start_date, formData.end_date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.person_id || !formData.role_type_id) return;

    // Check for approved leave conflicts before submitting
    if (leaveConflicts?.approved && leaveConflicts.approved.length > 0) {
      setShowApprovedLeaveDialog(true);
      return;
    }

    await submitAllocation();
  };

  const submitAllocation = async () => {
    try {
      setIsSubmitting(true);
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovedLeaveConfirm = async () => {
    setShowApprovedLeaveDialog(false);
    await submitAllocation();
  };

  const getPersonBadgeVariant = (person: PersonWithUtilization) => {
    if (person.isAvailable && person.matchesRole) return "default";
    if (person.isAvailable && !person.matchesRole) return "secondary";
    if (!person.isAvailable && person.matchesRole) return "outline";
    return "destructive";
  };

  const getPersonBadgeText = (person: PersonWithUtilization) => {
    if (person.isAvailable && person.matchesRole) return "Perfect Match";
    if (person.isAvailable && !person.matchesRole) return "Available";
    if (!person.isAvailable && person.matchesRole) return "Busy - Same Role";
    return "Busy - Different Role";
  };

  const renderPersonGroups = () => {
    const availableMatchingRole = sortedPeople.filter(p => p.isAvailable && p.matchesRole);
    const availableOtherRole = sortedPeople.filter(p => p.isAvailable && !p.matchesRole);
    const busyMatchingRole = sortedPeople.filter(p => !p.isAvailable && p.matchesRole);
    const busyOtherRole = sortedPeople.filter(p => !p.isAvailable && !p.matchesRole);

    return (
      <div className="space-y-4">
        {availableMatchingRole.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-2">✓ Available - Perfect Role Match</h4>
            <div className="space-y-2">
              {availableMatchingRole.map(person => (
                <div
                  key={person.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.person_id === person.id 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, person_id: person.id! }))}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.role_type_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">{person.currentUtilization}% utilized</Badge>
                      <Badge variant="default">Perfect Match</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {availableOtherRole.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-blue-700 mb-2">✓ Available - Different Role</h4>
            <div className="space-y-2">
              {availableOtherRole.map(person => (
                <div
                  key={person.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.person_id === person.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, person_id: person.id! }))}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.role_type_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{person.currentUtilization}% utilized</Badge>
                      <Badge variant="secondary">Available</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {busyMatchingRole.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-orange-700 mb-2">⚠ Busy - Same Role</h4>
            <div className="space-y-2">
              {busyMatchingRole.map(person => (
                <div
                  key={person.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.person_id === person.id 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-25'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, person_id: person.id! }))}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-orange-600" />
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.role_type_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{person.currentUtilization}% utilized</Badge>
                      <Badge variant="outline">Busy - Same Role</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {busyOtherRole.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-700 mb-2">⚠ Busy - Different Role</h4>
            <div className="space-y-2">
              {busyOtherRole.map(person => (
                <div
                  key={person.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.person_id === person.id 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-red-300 hover:bg-red-25'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, person_id: person.id! }))}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">{person.role_type_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive">{person.currentUtilization}% utilized</Badge>
                      <Badge variant="destructive">Busy - Different Role</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Assignment Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Assignment Details</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Start Date</span>
            </Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>End Date</span>
            </Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="allocation_percentage" className="flex items-center space-x-2">
            <Percent className="h-4 w-4" />
            <span>Allocation Percentage</span>
          </Label>
          <Input
            id="allocation_percentage"
            type="number"
            min="1"
            max="100"
            value={formData.allocation_percentage}
            onChange={(e) => setFormData(prev => ({ ...prev, allocation_percentage: parseInt(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <Separator />

      {/* Leave Conflict Warnings */}
      {leaveConflicts && (leaveConflicts.pending.length > 0 || leaveConflicts.approved.length > 0) && (
        <div className="space-y-2">
          {leaveConflicts.pending.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Caution:</strong> This person has pending leave during{" "}
                {leaveConflicts.pending.map((leave, index) => (
                  <span key={leave.id}>
                    {index > 0 && ", "}
                    {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                  </span>
                ))}
                . The leave request is still pending approval.
              </AlertDescription>
            </Alert>
          )}
          
          {leaveConflicts.approved.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This person has approved leave during{" "}
                {leaveConflicts.approved.map((leave, index) => (
                  <span key={leave.id}>
                    {index > 0 && ", "}
                    {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                  </span>
                ))}
                . They will not be available during this period.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Person Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Select Person</h3>
        <p className="text-sm text-muted-foreground">
          People are sorted by availability and role match. Green = best options, Red = may cause over-allocation.
        </p>
        
        {peopleLoading || utilizationLoading ? (
          <div className="text-center py-8">Loading people...</div>
        ) : (
          renderPersonGroups()
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !formData.person_id}>
          {isSubmitting ? "Allocating..." : "Allocate"}
        </Button>
      </div>

      {/* Approved Leave Confirmation Dialog */}
      <AlertDialog open={showApprovedLeaveDialog} onOpenChange={setShowApprovedLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approved Leave Conflict</AlertDialogTitle>
            <AlertDialogDescription>
              This person has approved leave during{" "}
              {leaveConflicts?.approved.map((leave, index) => (
                <span key={leave.id}>
                  {index > 0 && ", "}
                  <strong>{formatDate(leave.start_date)} - {formatDate(leave.end_date)}</strong>
                </span>
              ))}
              . They will not be available during this period.
              <br /><br />
              Are you sure you want to proceed with this allocation?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprovedLeaveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
