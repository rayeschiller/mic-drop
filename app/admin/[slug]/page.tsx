import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Mic2, ArrowLeft, MapPin, CalendarDays, Clock, Mail, Instagram, Trash2 } from "lucide-react"
import { getAdminMicDetail, checkAdminAuth, deleteMic } from "../actions"

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":")
  const hour = Number.parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  return `${hour % 12 || 12}:${minutes} ${ampm}`
}

export default async function AdminMicPage({ params }: { params: Promise<{ slug: string }> }) {
  const authed = await checkAdminAuth()
  if (!authed) redirect("/admin/login")

  const { slug } = await params
  const mic = await getAdminMicDetail(slug)
  if (!mic) notFound()

  const filledSlots = mic.slots.filter((s) => s.taken)

  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Mic2 className="h-7 w-7 text-neon-pink" />
            <span className="text-xl font-bold tracking-tight">
              Mic<span className="text-neon-pink">Drop</span>
              <span className="ml-2 text-sm font-normal text-muted-foreground">admin</span>
            </span>
          </div>
          <Link href="/admin" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            All mics
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        {/* Mic details */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{mic.name}</h1>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">/{mic.slug}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/${mic.slug}`}
                target="_blank"
                className="text-xs text-neon-pink hover:underline"
              >
                View public page →
              </Link>
              <form
                action={async () => {
                  "use server"
                  await deleteMic(mic.slug)
                  redirect("/admin")
                }}
              >
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg border border-destructive/50 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={(e) => {
                    if (!confirm(`Delete "${mic.name}"? This cannot be undone.`)) e.preventDefault()
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete mic
                </button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              {mic.venue}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4 flex-shrink-0" />
              {formatDate(mic.date)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 flex-shrink-0" />
              {formatTime(mic.startTime)}{mic.endTime ? ` – ${formatTime(mic.endTime)}` : ""}
            </div>
            {mic.hostEmail && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                {mic.hostEmail}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Signed up</p>
              <p className="text-2xl font-bold text-neon-green">{filledSlots.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total slots</p>
              <p className="text-2xl font-bold">{mic.totalSlots}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open slots</p>
              <p className="text-2xl font-bold text-muted-foreground">{mic.totalSlots - filledSlots.length}</p>
            </div>
          </div>
        </div>

        {/* Signup list */}
        <div>
          <h2 className="text-lg font-bold mb-4">Lineup ({filledSlots.length})</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12">Slot</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Instagram</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                </tr>
              </thead>
              <tbody>
                {mic.slots.filter((s) => s.taken).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No signups yet.
                    </td>
                  </tr>
                )}
                {mic.slots.filter((s) => s.taken).map((slot) => (
                  <tr key={slot.number} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neon-pink/20 font-mono text-xs font-bold text-neon-pink">
                        {slot.number}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{slot.performerName}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {slot.performerInstagram
                        ? <span className="flex items-center gap-1"><Instagram className="h-3 w-3" />@{slot.performerInstagram.replace(/^@/, "")}</span>
                        : <span className="italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {slot.performerEmail ?? <span className="italic">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
