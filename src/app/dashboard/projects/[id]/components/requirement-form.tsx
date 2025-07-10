"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { projectRequirementFormSchema, type ProjectRequirementFormFormData } from "@/lib/utils/validation";
import { formatDateForInput } from "@/lib/utils/date";
import { useRoleTypes } from "@/lib/hooks/use-role-types";

interface RequirementFormProps {
  initialData?: {
    role_type_id: string;
    required_count: number;
    start_date: string;
    end_date: string;
  };
  onSubmit: (data: { role_type_id: string; required_count: number; start_date: string; end_date: string }) => Promise<void>;
  onCancel: () => void;
}

export function RequirementForm({ initialData, onSubmit, onCancel }: RequirementFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { roleTypes, loading: roleTypesLoading } = useRoleTypes();

  const form = useForm<ProjectRequirementFormFormData>({
    resolver: zodResolver(projectRequirementFormSchema),
    defaultValues: {
      role_type_id: initialData?.role_type_id || "",
      required_count: initialData?.required_count || 1,
      start_date: initialData ? formatDateForInput(initialData.start_date) : "",
      end_date: initialData ? formatDateForInput(initialData.end_date) : "",
    },
  });

  const handleSubmit = async (data: ProjectRequirementFormFormData) => {
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
          name="required_count"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Required Count</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="1" 
                  max="100"
                  placeholder="e.g. 2"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                />
              </FormControl>
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

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || roleTypes.length === 0}>
            {isSubmitting ? "Saving..." : initialData ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
