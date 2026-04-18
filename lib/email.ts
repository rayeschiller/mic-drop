import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":")
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

function formatDate(dateString: string): string {
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

export async function sendPerformerReminderEmails({
  performers,
  micName,
  micSlug,
  venue,
  date,
  startTime,
  timeLabel = "today",
}: {
  performers: { name: string; email: string }[]
  micName: string
  micSlug: string
  venue: string
  date: string
  startTime: string
  timeLabel?: string
}) {
  const micUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${micSlug}`
  const dateFormatted = formatDate(date)
  const timeFormatted = formatTime(startTime)

  await Promise.allSettled(
    performers.map(({ name, email }) =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "Mic Drop <noreply@yourdomain.com>",
        to: email,
        subject: `Reminder — ${micName} is in ${timeLabel}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #1a1a2e; color: #f8f8f8; border-radius: 12px;">
            <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 8px;">
              Mic<span style="color: #e879a0;">Drop</span>
            </h1>
            <p style="color: #aaa; margin: 0 0 32px;">Reminder — your mic is in ${timeLabel}.</p>

            <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 16px;">${micName}</h2>

            <div style="display: flex; flex-direction: column; gap: 8px; margin: 0 0 24px;">
              <p style="margin: 0; font-size: 15px;">📍 ${venue}</p>
              <p style="margin: 0; font-size: 15px;">📅 ${dateFormatted}</p>
              <p style="margin: 0; font-size: 15px;">🕐 ${timeFormatted}</p>
            </div>

            <p style="font-size: 16px; color: #f8f8f8; margin: 0 0 24px;">
              Hey ${name} — you're on the list tonight! 
            </p>

            <a href="${micUrl}" style="display: inline-block; padding: 12px 24px; background: #e879a0; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
              View Lineup →
            </a>

            <p style="margin: 24px 0 0; font-size: 13px; color: #666;">
              Can't make it? <a href="${micUrl}" style="color: #e879a0;">Visit the page</a> to remove yourself from the list.
            </p>
          </div>
        `,
      })
    )
  )
}

export async function sendTwoDayReminderEmails({
  performers,
  micName,
  micSlug,
  venue,
  date,
  startTime,
}: {
  performers: { name: string; email: string }[]
  micName: string
  micSlug: string
  venue: string
  date: string
  startTime: string
}) {
  const micUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${micSlug}`
  const dateFormatted = formatDate(date)
  const timeFormatted = formatTime(startTime)

  await Promise.allSettled(
    performers.map(({ name, email }) =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "Mic Drop <noreply@yourdomain.com>",
        to: email,
        subject: `Reminder — ${micName} is in 2 days`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #1a1a2e; color: #f8f8f8; border-radius: 12px;">
            <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 8px;">
              Mic<span style="color: #e879a0;">Drop</span>
            </h1>
            <p style="color: #aaa; margin: 0 0 32px;">Reminder — your mic is in 2 days.</p>

            <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 16px;">${micName}</h2>

            <div style="display: flex; flex-direction: column; gap: 8px; margin: 0 0 24px;">
              <p style="margin: 0; font-size: 15px;">📍 ${venue}</p>
              <p style="margin: 0; font-size: 15px;">📅 ${dateFormatted}</p>
              <p style="margin: 0; font-size: 15px;">🕐 ${timeFormatted}</p>
            </div>

            <p style="font-size: 16px; color: #f8f8f8; margin: 0 0 24px;">
              Hey ${name} — you're on the list. Two days out. Get your set together.
            </p>

            <a href="${micUrl}" style="display: inline-block; padding: 12px 24px; background: #e879a0; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
              View Lineup →
            </a>

            <p style="margin: 24px 0 0; font-size: 13px; color: #666;">
              Can't make it? <a href="${micUrl}" style="color: #e879a0;">Visit the page</a> to remove yourself from the list.
            </p>
          </div>
        `,
      })
    )
  )
}

export async function sendWeekReminderEmails({
  performers,
  micName,
  micSlug,
  venue,
  date,
  startTime,
}: {
  performers: { name: string; email: string }[]
  micName: string
  micSlug: string
  venue: string
  date: string
  startTime: string
}) {
  const micUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${micSlug}`
  const dateFormatted = formatDate(date)
  const timeFormatted = formatTime(startTime)

  await Promise.allSettled(
    performers.map(({ name, email }) =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "Mic Drop <noreply@yourdomain.com>",
        to: email,
        subject: `Reminder — ${micName} is in 1 week`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #1a1a2e; color: #f8f8f8; border-radius: 12px;">
            <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 8px;">
              Mic<span style="color: #e879a0;">Drop</span>
            </h1>
            <p style="color: #aaa; margin: 0 0 32px;">Reminder — your mic is in 1 week.</p>

            <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 16px;">${micName}</h2>

            <div style="display: flex; flex-direction: column; gap: 8px; margin: 0 0 24px;">
              <p style="margin: 0; font-size: 15px;">📍 ${venue}</p>
              <p style="margin: 0; font-size: 15px;">📅 ${dateFormatted}</p>
              <p style="margin: 0; font-size: 15px;">🕐 ${timeFormatted}</p>
            </div>

            <p style="font-size: 16px; color: #f8f8f8; margin: 0 0 24px;">
              Hey ${name} — you're on the list. Start writing.
            </p>

            <a href="${micUrl}" style="display: inline-block; padding: 12px 24px; background: #e879a0; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
              View Lineup →
            </a>

            <p style="margin: 24px 0 0; font-size: 13px; color: #666;">
              Can't make it? <a href="${micUrl}" style="color: #e879a0;">Visit the page</a> to remove yourself from the list.
            </p>
          </div>
        `,
      })
    )
  )
}

export async function sendWaitlistConfirmationEmail({
  to,
  performerName,
  micName,
  micSlug,
  venue,
  date,
  startTime,
  position,
}: {
  to: string
  performerName: string
  micName: string
  micSlug: string
  venue: string
  date: string
  startTime: string
  position: number
}) {
  const micUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${micSlug}`
  const dateFormatted = formatDate(date)
  const timeFormatted = formatTime(startTime)

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Mic Drop <noreply@yourdomain.com>",
    to,
    subject: `You're #${position} on the waitlist — ${micName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #1a1a2e; color: #f8f8f8; border-radius: 12px;">
        <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 8px;">
          Mic<span style="color: #e879a0;">Drop</span>
        </h1>
        <p style="color: #aaa; margin: 0 0 32px;">You're on the waitlist.</p>

        <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">${micName}</h2>

        <div style="display: flex; flex-direction: column; gap: 8px; margin: 0 0 24px;">
          <p style="margin: 0; font-size: 15px;">📍 ${venue}</p>
          <p style="margin: 0; font-size: 15px;">📅 ${dateFormatted}</p>
          <p style="margin: 0; font-size: 15px;">🕐 ${timeFormatted}</p>
        </div>

        <div style="margin: 0 0 24px; padding: 20px; background: #111124; border-radius: 8px; border: 1px solid #333; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa;">Your Position</p>
          <p style="margin: 0; font-size: 48px; font-weight: 800; color: #e879a0;">#${position}</p>
        </div>

        <p style="font-size: 16px; color: #f8f8f8; margin: 0 0 24px;">
          Hey ${performerName} — we'll email you if a slot opens up. Keep your fingers crossed.
        </p>

        <a href="${micUrl}" style="display: inline-block; padding: 12px 24px; background: #e879a0; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
          View Lineup →
        </a>

        <p style="margin: 24px 0 0; font-size: 13px; color: #666;">
          Changed your mind? <a href="${micUrl}" style="color: #e879a0;">Visit the page</a> to leave the waitlist.
        </p>
      </div>
    `,
  })
}

export async function sendWaitlistPromotionEmail({
  to,
  performerName,
  micName,
  micSlug,
  venue,
  date,
  startTime,
}: {
  to: string
  performerName: string
  micName: string
  micSlug: string
  venue: string
  date: string
  startTime: string
}) {
  const micUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${micSlug}`
  const dateFormatted = formatDate(date)
  const timeFormatted = formatTime(startTime)

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Mic Drop <noreply@yourdomain.com>",
    to,
    subject: `You're in! A slot opened up — ${micName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #1a1a2e; color: #f8f8f8; border-radius: 12px;">
        <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 8px;">
          Mic<span style="color: #e879a0;">Drop</span>
        </h1>
        <p style="color: #aaa; margin: 0 0 32px;">The list came through for you.</p>

        <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">${micName}</h2>

        <div style="display: flex; flex-direction: column; gap: 8px; margin: 0 0 24px;">
          <p style="margin: 0; font-size: 15px;">📍 ${venue}</p>
          <p style="margin: 0; font-size: 15px;">📅 ${dateFormatted}</p>
          <p style="margin: 0; font-size: 15px;">🕐 ${timeFormatted}</p>
        </div>

        <p style="font-size: 18px; font-weight: 700; color: #f8f8f8; margin: 0 0 8px;">
          Hey ${performerName} — you got a slot.
        </p>
        <p style="font-size: 15px; color: #aaa; margin: 0 0 24px;">
          Someone dropped out and you're next in line. You're now on the lineup.
        </p>

        <a href="${micUrl}" style="display: inline-block; padding: 12px 24px; background: #e879a0; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
          View Your Slot →
        </a>

        <p style="margin: 24px 0 0; font-size: 13px; color: #666;">
          Can't make it? <a href="${micUrl}" style="color: #e879a0;">Visit the page</a> to remove yourself from the list.
        </p>
      </div>
    `,
  })
}

export async function sendWaitlistReminderEmails({
  performers,
  micName,
  micSlug,
  venue,
  date,
  startTime,
  timeLabel = "today",
}: {
  performers: { name: string; email: string; position: number }[]
  micName: string
  micSlug: string
  venue: string
  date: string
  startTime: string
  timeLabel?: string
}) {
  const micUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${micSlug}`
  const dateFormatted = formatDate(date)
  const timeFormatted = formatTime(startTime)

  await Promise.allSettled(
    performers.map(({ name, email, position }) =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "Mic Drop <noreply@yourdomain.com>",
        to: email,
        subject: `Reminder — ${micName} is in ${timeLabel} (you're #${position} on the waitlist)`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #1a1a2e; color: #f8f8f8; border-radius: 12px;">
            <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 8px;">
              Mic<span style="color: #e879a0;">Drop</span>
            </h1>
            <p style="color: #aaa; margin: 0 0 32px;">Reminder — your mic is in ${timeLabel}. You're still on the waitlist.</p>

            <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 16px;">${micName}</h2>

            <div style="display: flex; flex-direction: column; gap: 8px; margin: 0 0 24px;">
              <p style="margin: 0; font-size: 15px;">📍 ${venue}</p>
              <p style="margin: 0; font-size: 15px;">📅 ${dateFormatted}</p>
              <p style="margin: 0; font-size: 15px;">🕐 ${timeFormatted}</p>
            </div>

            <div style="margin: 0 0 24px; padding: 16px 20px; background: #111124; border-radius: 8px; border: 1px solid #333; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa;">Waitlist Position</p>
              <p style="margin: 0; font-size: 40px; font-weight: 800; color: #e879a0;">#${position}</p>
            </div>

            <p style="font-size: 16px; color: #f8f8f8; margin: 0 0 24px;">
              Hey ${name} — spots sometimes open up last minute. Keep an eye on your inbox.
            </p>

            <a href="${micUrl}" style="display: inline-block; padding: 12px 24px; background: #e879a0; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
              View Lineup →
            </a>

            <p style="margin: 24px 0 0; font-size: 13px; color: #666;">
              Changed your mind? <a href="${micUrl}" style="color: #e879a0;">Visit the page</a> to leave the waitlist.
            </p>
          </div>
        `,
      })
    )
  )
}

export async function sendWeeklyDigestEmail({
  to,
  stats,
  upcomingMics,
}: {
  to: string
  stats: {
    totalMics: number
    micsThisWeek: number
    totalSignups: number
    signupsThisWeek: number
    totalWithEmail: number
    totalWaitlist: number
  }
  upcomingMics: {
    name: string
    venue: string
    date: string
    startTime: string
    slug: string
    slotsTaken: number
    totalSlots: number
  }[]
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""

  const upcomingRows = upcomingMics.length
    ? upcomingMics
        .map((mic) => {
          const fillPct = mic.totalSlots > 0 ? Math.round((mic.slotsTaken / mic.totalSlots) * 100) : 0
          const bar = "█".repeat(Math.round(fillPct / 10)) + "░".repeat(10 - Math.round(fillPct / 10))
          return `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #222;">
                <a href="${siteUrl}/${mic.slug}" style="color: #e879a0; font-weight: 700; text-decoration: none; font-size: 15px;">${mic.name}</a>
                <div style="color: #aaa; font-size: 13px; margin-top: 2px;">${mic.venue} &middot; ${formatDate(mic.date)} &middot; ${formatTime(mic.startTime)}</div>
                <div style="font-family: monospace; font-size: 12px; margin-top: 6px; color: #e879a0;">${bar} ${mic.slotsTaken}/${mic.totalSlots} slots (${fillPct}%)</div>
              </td>
            </tr>`
        })
        .join("")
    : `<tr><td style="padding: 12px 0; color: #666; font-size: 14px;">No upcoming mics in the next 7 days.</td></tr>`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Mic Drop <noreply@yourdomain.com>",
    to,
    subject: `Mic Drop weekly digest — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #1a1a2e; color: #f8f8f8; border-radius: 12px;">
        <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 4px;">
          Mic<span style="color: #e879a0;">Drop</span>
        </h1>
        <p style="color: #aaa; margin: 0 0 32px; font-size: 14px;">Weekly digest</p>

        <h2 style="font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #aaa; margin: 0 0 16px;">This week</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 32px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #222; font-size: 15px;">New mics created</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #222; font-size: 20px; font-weight: 800; text-align: right; color: #e879a0;">${stats.micsThisWeek}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #222; font-size: 15px;">New sign-ups</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #222; font-size: 20px; font-weight: 800; text-align: right; color: #e879a0;">${stats.signupsThisWeek}</td>
          </tr>
        </table>

        <h2 style="font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #aaa; margin: 0 0 16px;">All time</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 32px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #222; font-size: 15px;">Total mics</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #222; font-size: 20px; font-weight: 800; text-align: right; color: #f8f8f8;">${stats.totalMics}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #222; font-size: 15px;">Total sign-ups</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #222; font-size: 20px; font-weight: 800; text-align: right; color: #f8f8f8;">${stats.totalSignups}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #222; font-size: 15px;">Performers with email</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #222; font-size: 20px; font-weight: 800; text-align: right; color: #f8f8f8;">${stats.totalWithEmail}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-size: 15px;">Waitlist entries</td>
            <td style="padding: 10px 0; font-size: 20px; font-weight: 800; text-align: right; color: #f8f8f8;">${stats.totalWaitlist}</td>
          </tr>
        </table>

        <h2 style="font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #aaa; margin: 0 0 16px;">Upcoming (next 7 days)</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 32px;">
          ${upcomingRows}
        </table>

        <p style="margin: 0; font-size: 12px; color: #444;">
          Sent every Monday morning by Mic Drop.
        </p>
      </div>
    `,
  })
}

export async function sendHostPinEmail({
  to,
  micName,
  micSlug,
  hostPin,
}: {
  to: string
  micName: string
  micSlug: string
  hostPin: string
}) {
  const micUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${micSlug}`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Mic Drop <noreply@yourdomain.com>",
    to,
    subject: `Your host PIN for "${micName}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #1a1a2e; color: #f8f8f8; border-radius: 12px;">
        <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 8px;">
          Mic<span style="color: #e879a0;">Drop</span>
        </h1>
        <p style="color: #aaa; margin: 0 0 32px;">Your mic is live. Here's everything you need.</p>

        <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 4px;">${micName}</h2>
        <a href="${micUrl}" style="color: #e879a0; font-size: 14px;">${micUrl}</a>

        <div style="margin: 32px 0; padding: 24px; background: #111124; border-radius: 8px; border: 1px solid #333; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #aaa;">Your Host PIN</p>
          <p style="margin: 0; font-size: 40px; font-family: monospace; font-weight: 700; letter-spacing: 0.3em; color: #e879a0;">${hostPin}</p>
        </div>

        <p style="font-size: 14px; color: #aaa; margin: 0;">
          Keep this PIN safe — it's the only way to edit your mic or manage the lineup.
          Don't share it with anyone you don't trust with the keys to the kingdom.
        </p>
      </div>
    `,
  })
}
