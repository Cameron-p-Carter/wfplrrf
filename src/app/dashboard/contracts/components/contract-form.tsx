"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { contractSchema, type ContractFormData } from "@/lib/utils/validation";
import { formatDateForInput } from "@/lib/utils/date";
import { usePeople } from "@/lib/hooks/use-people";
import type { Contract } from "@/lib/supabase";

interface ContractFormProps {
  initialData?: Contract;
  onSubmit: (data: ContractFormData) => Promise<void>;
  onCancel: () => void;
}

export function ContractForm({ initialData, onSubmit, onCancel }: ContractFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { people, loading: peopleLoading } = usePeople();

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      person_id: initialData?.person_id || "",
      contract_type: initialData?.contract_type || "permanent",
      status: initialData?.status || "active",
      start_date: initialData ? formatDateForInput(initialData.start_date) : "",
      end_date: initialData?.end_date ? formatDateForInput(initialData.end_date) : "",
      length_months: initialData?.length_months ?? undefined,
      notes: initialData?.notes || "",
    },
  });

  const contractType = form.watch("contract_type");
  const isPermanent = contractType === "permanent";

  const handleSubmit = async (data: ContractFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit({
        ...data,
        end_date: isPermanent ? undefined : (data.end_date || undefined),
      });
    } catch {
      // Error handled in parent
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
                disabled={peopleLoading || !!initialData}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={peopleLoading ? "Loading..." : "Select a person"}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {people.map((person) => (
                    <SelectItem key={person.id} value={person.id!}>
                      {person.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contract_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contract Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="fixed_term">Fixed Term</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="renewed">Renewed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

          {!isPermanent && (
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
          )}

          {!isPermanent && (
            <FormField
              control={form.control}
              name="length_months"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Length (months)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 12"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : parseInt(e.target.value, 10))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any notes..."
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : initialData ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
