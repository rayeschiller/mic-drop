"use client"

import { useState } from "react"
import { Mail, X, Send, FlaskConical } from "lucide-react"
import { getMicReminderPreview, sendMicReminders, sendTestReminderEmail } from "../actions"

type Preview = NonNullable<Awaited<ReturnType<typeof getMicReminderPreview>>>

export function SendRemindersButton({ slug }: { slug: string }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState<"lineup" | "waitlist" | null>(null)
  const [sentResults, setSentResults] = useState<{ lineup?: number; waitlist?: number }>({})
  const [testEmail, setTestEmail] = useState("")
  const [testTarget, setTestTarget] = useState<"lineup" | "waitlist">("lineup")
  const [testSending, setTestSending] = useState(false)
  const [testStatus, setTestStatus] = useState<"idle" | "sent" | "error">("idle")

  const openPreview = async () => {
    setLoading(true)
    setSentResults({})
    setTestStatus("idle")
    const data = await getMicReminderPreview(slug)
    setPreview(data)
    setLoading(false)
  }

  const handleSend = async (target: "lineup" | "waitlist") => {
    setSending(target)
    const res = await sendMicReminders(slug, target)
    setSending(null)
    if (res.success) {
      setSentResults((prev) => ({ ...prev, [target]: res.sent }))
    }
  }

  const handleTest = async () => {
    if (!testEmail) return
    setTestSending(true)
    setTestStatus("idle")
    const res = await sendTestReminderEmail(slug, testEmail, testTarget)
    setTestSending(false)
    setTestStatus(res.success ? "sent" : "error")
  }

  const totalSent = (sentResults.lineup ?? 0) + (sentResults.waitlist ?? 0)

  return (
    <>
      <button
        onClick={openPreview}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border border-neon-pink/50 px-3 py-1.5 text-xs text-neon-pink hover:bg-neon-pink/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Mail className="h-3.5 w-3.5" />
        {loading ? "Loading..." : totalSent > 0 ? `Sent to ${totalSent}` : "Send reminder emails"}
      </button>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setPreview(null)}>
          <div
            className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Send reminder emails</h2>
              <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {!preview.success ? (
              <p className="text-sm text-destructive">{preview.error}</p>
            ) : (
              <>
                {/* Lineup section */}
                <Section
                  label="Lineup"
                  subject={preview.lineupSubject}
                  performers={preview.performers}
                  sending={sending === "lineup"}
                  sent={sentResults.lineup}
                  onSend={() => handleSend("lineup")}
                />

                {/* Waitlist section */}
                <Section
                  label="Waitlist"
                  subject={preview.waitlistSubject}
                  performers={preview.waitlist}
                  sending={sending === "waitlist"}
                  sent={sentResults.waitlist}
                  onSend={() => handleSend("waitlist")}
                />

                {/* Test email */}
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <FlaskConical className="h-3.5 w-3.5" />
                    Send test email
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={testTarget}
                      onChange={(e) => { setTestTarget(e.target.value as "lineup" | "waitlist"); setTestStatus("idle") }}
                      className="rounded-lg border border-border bg-secondary/40 px-2 py-1.5 text-xs"
                    >
                      <option value="lineup">Lineup</option>
                      <option value="waitlist">Waitlist</option>
                    </select>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={testEmail}
                      onChange={(e) => { setTestEmail(e.target.value); setTestStatus("idle") }}
                      className="flex-1 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs outline-none focus:border-neon-pink"
                    />
                    <button
                      onClick={handleTest}
                      disabled={testSending || !testEmail}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary/40 transition-colors disabled:opacity-50"
                    >
                      {testSending ? "Sending..." : testStatus === "sent" ? "Sent!" : "Send"}
                    </button>
                  </div>
                  {testStatus === "error" && <p className="text-xs text-destructive">Failed to send test email.</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Section({
  label,
  subject,
  performers,
  sending,
  sent,
  onSend,
}: {
  label: string
  subject: string
  performers: { name: string; email: string }[]
  sending: boolean
  sent?: number
  onSend: () => void
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide">{label} ({performers.length})</p>
        <button
          onClick={onSend}
          disabled={sending || performers.length === 0 || sent !== undefined}
          className="flex items-center gap-1.5 rounded-lg bg-neon-pink px-3 py-1.5 text-xs font-bold text-white hover:bg-neon-pink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-3 w-3" />
          {sending ? "Sending..." : sent !== undefined ? `Sent to ${sent}` : "Send"}
        </button>
      </div>
      <p className="text-xs rounded bg-secondary/40 px-2 py-1.5 font-mono text-muted-foreground">{subject}</p>
      {performers.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No recipients with email addresses.</p>
      ) : (
        <ul className="space-y-1 max-h-32 overflow-y-auto">
          {performers.map((p, i) => (
            <li key={i} className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">{p.name}</span>
              <span className="text-muted-foreground truncate">{p.email}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
