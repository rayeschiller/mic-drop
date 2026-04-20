// Timezone-aware helpers for converting a mic's stored local
// (date + start_time) into a correct UTC timestamp, using an
// IANA timezone string like "America/Los_Angeles".
//
// Why this exists:
//   The `mics` table stores `date` (Postgres DATE) and `start_time`
//   (Postgres TIME) with no zone. Hosts enter these in their own
//   local time. To decide whether a mic is "2 days from now" we
//   need the real UTC instant, which depends on the host's zone and
//   whether DST is in effect on that date.

const DEFAULT_TZ = "America/Los_Angeles"

/**
 * Convert a local date + start_time in the given IANA timezone into
 * the corresponding UTC milliseconds since epoch.
 *
 * Handles DST correctly (including the ±7 / ±8 hour flip for most US zones,
 * and southern-hemisphere zones like Australia/Sydney whose DST is reversed).
 *
 * For the ambiguous "fall back" hour, returns the earlier (pre-transition) instant.
 * For the non-existent "spring forward" hour, returns the instant that would have
 * been the wall-clock time had the transition not occurred — close enough for
 * reminder scheduling.
 */
export function micStartMs(
  date: string,          // "YYYY-MM-DD"
  startTime: string,     // "HH:MM" or "HH:MM:SS"
  timezone: string | null | undefined
): number {
  const tz = timezone || DEFAULT_TZ
  const [Y, M, D] = date.split("-").map(Number)
  const [hh = "0", mm = "0", ss = "0"] = startTime.split(":")
  const H = Number(hh), Min = Number(mm), S = Number(ss)

  // Naive: encode the wall-clock as if it were already UTC.
  const naiveUtc = Date.UTC(Y, (M || 1) - 1, D || 1, H, Min, S)

  // Two-pass refine: get the zone offset at the approximate instant,
  // then once more at the corrected instant (handles DST cleanly).
  const offset1 = getTimezoneOffsetMs(tz, naiveUtc)
  const candidate = naiveUtc - offset1
  const offset2 = getTimezoneOffsetMs(tz, candidate)
  return naiveUtc - offset2
}

/**
 * Returns "today" or "tomorrow" based on what the current local date is
 * in the mic's timezone, compared to the mic's stored local date.
 *
 * Used for day-of reminder email copy. The 6-hour reminder cron fires in
 * a ±30 min window around "6 hours before start", so for an evening mic
 * it sends on the same local date, but for a very early morning mic it
 * can fire on the prior local evening — that's why "today" isn't always
 * right and we need this check.
 *
 * Returns "soon" as a safe fallback if the date isn't ±1 day from now
 * (should not happen inside the cron's narrow window).
 */
export function reminderDayLabel(
  micDate: string,
  timezone: string | null | undefined,
  now: number = Date.now()
): "today" | "tomorrow" | "soon" {
  const tz = timezone || "America/Los_Angeles"
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const today = fmt.format(new Date(now))
  if (micDate === today) return "today"
  const tomorrow = fmt.format(new Date(now + 24 * 60 * 60 * 1000))
  if (micDate === tomorrow) return "tomorrow"
  return "soon"
}

/**
 * Returns the offset in milliseconds such that:
 *   localWallClock (as if it were UTC) = actualUtc + offset
 *
 * For America/Los_Angeles during PDT, this is -7 * 3600_000.
 * For Australia/Sydney during AEDT, this is +11 * 3600_000.
 */
export function getTimezoneOffsetMs(timezone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs))

  const map: Record<string, string> = {}
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value

  const localAsUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  )
  return localAsUtc - utcMs
}
