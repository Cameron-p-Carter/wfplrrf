"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { personSchema, type PersonFormData } from "@/lib/utils/validation";
import { useRoleTypes } from "@/lib/hooks/use-role-types";

interface PersonFormProps {
  initialData?: PersonFormData;
  onSubmit: (data: PersonFormData) => Promise<void>;
  onCancel: () => void;
}

export function PersonForm({ initialData, onSubmit, onCancel }: PersonFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { roleTypes, loading: roleTypesLoading } = useRoleTypes();

  const form = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      name: initialData?.name || "",
      role_type_id: initialData?.role_type_id || "",
    },
  });

  const handleSubmit = async (data: PersonFormData) => {
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. John Doe" {...field} />
              </FormControl>
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
                  No role types available. Create one first in the Role Types section.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

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
