export type RecurringFrequency = "weekly" | "biweekly" | "monthly" | "custom"

export const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

export function calcRecurringDates(
  startDate: string,
  frequency: RecurringFrequency,
  endDate: string,
  customDays?: number[],
): string[] {
  const dates: string[] = []
  const end = new Date(endDate + "T00:00:00")
  const start = new Date(startDate + "T00:00:00")

  if (frequency === "custom") {
    if (!customDays || customDays.length === 0) return dates
    const current = new Date(start)
    current.setDate(current.getDate() + 1)
    while (current <= end) {
      if (customDays.includes(current.getDay())) {
        dates.push(current.toISOString().split("T")[0])
      }
      current.setDate(current.getDate() + 1)
      if (dates.length >= 365) break
    }
    return dates
  }

  let current = new Date(start)
  if (frequency === "monthly") {
    current.setMonth(current.getMonth() + 1)
  } else {
    current.setDate(current.getDate() + (frequency === "weekly" ? 7 : 14))
  }

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0])
    if (frequency === "monthly") {
      current = new Date(current)
      current.setMonth(current.getMonth() + 1)
    } else {
      current = new Date(current)
      current.setDate(current.getDate() + (frequency === "weekly" ? 7 : 14))
    }
    if (dates.length >= 52) break
  }
  return dates
}
