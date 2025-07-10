"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { projectAllocationFormSchema, type ProjectAllocationFormFormData } from "@/lib/utils/validation";
import { formatDateForInput, formatDate } from "@/lib/utils/date";
import { usePeople } from "@/lib/hooks/use-people";
import { useRoleTypes } from "@/lib/hooks/use-role-types";
import { getPersonLeaveConflicts } from "@/lib/supabase";
import type { Tables } from "@/types/supabase";

interface AllocationFormProps {
  initialData?: {
    person_id: string;
    role_type_id: string;
    allocation_percentage: number;
    start_date: string;
    end_date: string;
    requirement_id?: string;
  };
  onSubmit: (data: { person_id: string; role_type_id: string; allocation_percentage: number; start_date: string; end_date: string; requirement_id?: string }) => Promise<void>;
  onCancel: () => void;
}

export function AllocationForm({ initialData, onSubmit, onCancel }: AllocationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveConflicts, setLeaveConflicts] = useState<{
    pending: Tables<"leave_periods">[];
    approved: Tables<"leave_periods">[];
    unapproved: Tables<"leave_periods">[];
  } | null>(null);
  const [showApprovedLeaveDialog, setShowApprovedLeaveDialog] = useState(false);
  const { people, loading: peopleLoading } = usePeople();
  const { roleTypes, loading: roleTypesLoading } = useRoleTypes();

  const form = useForm<ProjectAllocationFormFormData>({
    resolver: zodResolver(projectAllocationFormSchema),
    defaultValues: {
      person_id: initialData?.person_id || "",
      role_type_id: initialData?.role_type_id || "",
      allocation_percentage: initialData?.allocation_percentage || 100,
      start_date: initialData ? formatDateForInput(initialData.start_date) : "",
      end_date: initialData ? formatDateForInput(initialData.end_date) : "",
    },
  });

  // Watch form values for leave conflict checking
  const watchedValues = form.watch();

  // Check for leave conflicts when person or dates change
  useEffect(() => {
    const checkLeaveConflicts = async () => {
      if (watchedValues.person_id && watchedValues.start_date && watchedValues.end_date) {
        try {
          const conflicts = await getPersonLeaveConflicts(
            watchedValues.person_id,
            watchedValues.start_date,
            watchedValues.end_date
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
  }, [watchedValues.person_id, watchedValues.start_date, watchedValues.end_date]);

  const handleSubmit = async (data: ProjectAllocationFormFormData) => {
    // Check for approved leave conflicts before submitting
    if (leaveConflicts?.approved && leaveConflicts.approved.length > 0) {
      setShowApprovedLeaveDialog(true);
      return;
    }

    await submitAllocation(data);
  };

  const submitAllocation = async (data: ProjectAllocationFormFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
    } catch (error) {
      // Error is handled in the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovedLeaveConfirm = async () => {
    setShowApprovedLeaveDialog(false);
    const data = form.getValues();
    await submitAllocation(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="person_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Person</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={peopleLoading || people.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={
                        peopleLoading 
                          ? "Loading people..." 
                          : people.length === 0 
                            ? "No people available" 
                            : "Select a person"
                      } 
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {people.map((person) => (
                    <SelectItem key={person.id} value={person.id!}>
                      {person.name} ({person.role_type_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {people.length === 0 && !peopleLoading && (
                <p className="text-sm text-muted-foreground">
                  No people available. Add people first in the People section.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role_type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={roleTypesLoading || roleTypes.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={
                        roleTypesLoading 
                          ? "Loading role types..." 
                          : roleTypes.length === 0 
                            ? "No role types available" 
                            : "Select a role type"
                      } 
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roleTypes.map((roleType) => (
                    <SelectItem key={roleType.id} value={roleType.id}>
                      {roleType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roleTypes.length === 0 && !roleTypesLoading && (
                <p className="text-sm text-muted-foreground">
                  No role types available. Create role types first in the Role Types section.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allocation_percentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allocation Percentage</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="1" 
                  max="100"
                  placeholder="e.g. 50"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                />
              </FormControl>
              <p className="text-sm text-muted-foreground">
                Percentage of this person's time allocated to this project (1-100%)
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || people.length === 0 || roleTypes.length === 0}>
            {isSubmitting ? "Saving..." : initialData ? "Update" : "Create"}
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
    </Form>
  );
}
