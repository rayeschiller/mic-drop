import Link from "next/link"
import { Mic2, LogOut } from "lucide-react"
import { getAllMics, adminLogout, checkAdminAuth } from "./actions"
import { redirect } from "next/navigation"

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function AdminPage() {
  const authed = await checkAdminAuth()
  if (!authed) redirect("/admin/login")

  const mics = await getAllMics()
  const totalSignups = mics.reduce((sum, m) => sum + m.filledSlots, 0)

  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Mic2 className="h-7 w-7 text-neon-pink" />
            <span className="text-xl font-bold tracking-tight">
              Mic<span className="text-neon-pink">Drop</span>
              <span className="ml-2 text-sm font-normal text-muted-foreground">admin</span>
            </span>
          </div>
          <form
            action={async () => {
              "use server"
              await adminLogout()
              redirect("/admin/login")
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-10 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Mics</p>
            <p className="text-3xl font-bold mt-1">{mics.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Signups</p>
            <p className="text-3xl font-bold mt-1">{totalSignups}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Avg Fill Rate</p>
            <p className="text-3xl font-bold mt-1">
              {mics.length === 0
                ? "—"
                : Math.round((totalSignups / mics.reduce((s, m) => s + m.totalSlots, 0)) * 100) + "%"}
            </p>
          </div>
        </div>

        {/* Mic table */}
        <h2 className="text-lg font-bold mb-4">All Mics</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Venue</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slots</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Host Email</th>
              </tr>
            </thead>
            <tbody>
              {mics.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No mics yet.
                  </td>
                </tr>
              )}
              {mics.map((mic) => (
                <tr key={mic.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/${mic.slug}`} className="font-medium text-foreground hover:text-neon-pink transition-colors">
                      {mic.name}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">/{mic.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{mic.venue}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatDate(mic.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-neon-green rounded-full"
                          style={{ width: `${(mic.filledSlots / mic.totalSlots) * 100}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {mic.filledSlots}/{mic.totalSlots}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                    {mic.hostEmail ?? <span className="italic">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
