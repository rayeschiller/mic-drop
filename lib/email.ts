import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

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
