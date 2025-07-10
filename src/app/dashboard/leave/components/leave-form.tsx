"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { leavePeriodSchema, type LeavePeriodFormData } from "@/lib/utils/validation";
import { formatDateForInput } from "@/lib/utils/date";
import { usePeople } from "@/lib/hooks/use-people";
import type { Tables } from "@/types/supabase";

interface LeaveFormProps {
  initialData?: Tables<"leave_periods">;
  onSubmit: (data: LeavePeriodFormData) => Promise<void>;
  onCancel: () => void;
}

export function LeaveForm({ initialData, onSubmit, onCancel }: LeaveFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { people, loading: peopleLoading } = usePeople();

  const form = useForm<LeavePeriodFormData>({
    resolver: zodResolver(leavePeriodSchema),
    defaultValues: {
      person_id: initialData?.person_id || "",
      start_date: initialData ? formatDateForInput(initialData.start_date) : "",
      end_date: initialData ? formatDateForInput(initialData.end_date) : "",
      status: initialData?.status || "pending",
      notes: initialData?.notes || "",
    },
  });

  const handleSubmit = async (data: LeavePeriodFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
    } catch (error) {
      // Error is handled in the parent component
    } finally {
      setIsSubmitting(false);
    }
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

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="unapproved">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any notes about this leave period..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || people.length === 0}>
            {isSubmitting ? "Saving..." : initialData ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
