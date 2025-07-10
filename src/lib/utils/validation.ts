import { z } from "zod";

export const roleTypeSchema = z.object({
  name: z.string().min(1, "Role type name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
});

export const personSchema = z.object({
  name: z.string().min(1, "Person name is required").max(100, "Name must be less than 100 characters"),
  role_type_id: z.string().min(1, "Role type is required"),
});

export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200, "Name must be less than 200 characters"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: "End date must be after start date",
  path: ["end_date"],
});

const baseProjectRequirementSchema = z.object({
  project_id: z.string().min(1, "Project is required"),
  role_type_id: z.string().min(1, "Role type is required"),
  required_count: z.number().min(1, "At least 1 person is required").max(100, "Cannot require more than 100 people"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
});

export const projectRequirementSchema = baseProjectRequirementSchema.refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: "End date must be after start date",
  path: ["end_date"],
});

export const projectRequirementFormSchema = baseProjectRequirementSchema.omit({ project_id: true }).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: "End date must be after start date",
  path: ["end_date"],
});

export const leavePeriodSchema = z.object({
  person_id: z.string().min(1, "Person is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  status: z.enum(["pending", "approved", "unapproved"], {
    required_error: "Status is required",
  }),
  notes: z.string().optional(),
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: "End date must be after start date",
  path: ["end_date"],
});

const baseProjectAllocationSchema = z.object({
  project_id: z.string().min(1, "Project is required"),
  person_id: z.string().min(1, "Person is required"),
  role_type_id: z.string().min(1, "Role type is required"),
  requirement_id: z.string().optional(),
  allocation_percentage: z.number().min(1, "Allocation must be at least 1%").max(100, "Allocation cannot exceed 100%"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
});

export const projectAllocationSchema = baseProjectAllocationSchema.refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: "End date must be after start date",
  path: ["end_date"],
});

export const projectAllocationFormSchema = baseProjectAllocationSchema.omit({ project_id: true }).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: "End date must be after start date",
  path: ["end_date"],
});

export type RoleTypeFormData = z.infer<typeof roleTypeSchema>;
export type PersonFormData = z.infer<typeof personSchema>;
export type ProjectFormData = z.infer<typeof projectSchema>;
export type ProjectRequirementFormData = z.infer<typeof projectRequirementSchema>;
export type ProjectRequirementFormFormData = z.infer<typeof projectRequirementFormSchema>;
export type LeavePeriodFormData = z.infer<typeof leavePeriodSchema>;
export type ProjectAllocationFormData = z.infer<typeof projectAllocationSchema>;
export type ProjectAllocationFormFormData = z.infer<typeof projectAllocationFormSchema>;
