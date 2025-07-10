import { format, parseISO, isValid } from "date-fns";

export function formatDate(date: string | Date, formatStr: string = "MMM dd, yyyy"): string {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return "Invalid date";
    }
    return format(dateObj, formatStr);
  } catch (error) {
    return "Invalid date";
  }
}

export function formatDateForInput(date: string | Date): string {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return "";
    }
    return format(dateObj, "yyyy-MM-dd");
  } catch (error) {
    return "";
  }
}

export function isDateAfter(date1: string | Date, date2: string | Date): boolean {
  try {
    const d1 = typeof date1 === "string" ? parseISO(date1) : date1;
    const d2 = typeof date2 === "string" ? parseISO(date2) : date2;
    return isValid(d1) && isValid(d2) && d1 > d2;
  } catch (error) {
    return false;
  }
}
