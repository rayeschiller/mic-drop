import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mic2, Plus, Sparkles } from "lucide-react"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <Mic2 className="h-8 w-8 text-neon-pink" />
            <span className="text-2xl font-bold tracking-tight">
              Mic<span className="text-neon-pink">Drop</span>
            </span>
          </Link>
          <Link href="/create">
            <Button className="bg-neon-pink text-primary-foreground hover:bg-neon-pink/90 font-bold">
              <Plus className="mr-2 h-4 w-4" />
              Host a Mic
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-20 h-40 w-40 rounded-full bg-neon-pink/10 blur-3xl" />
          <div className="absolute -right-20 top-40 h-60 w-60 rounded-full bg-neon-green/10 blur-3xl" />
          <div className="absolute bottom-20 left-1/3 h-40 w-40 rounded-full bg-neon-amber/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 py-24 md:py-32">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neon-pink/30 bg-neon-pink/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-neon-pink" />
              <span className="text-sm font-medium text-neon-pink">
                No apps. No drama. Just slots.
              </span>
            </div>

            <h1 className="text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl text-balance">
              Open Mic
              <br />
              <span className="text-neon-pink">Sign</span>
              <span className="text-neon-green">ups</span>
              <br />
              <span className="text-muted-foreground">Made Simple</span>
            </h1>

            <p className="mt-8 max-w-xl text-lg text-muted-foreground md:text-xl leading-relaxed">
              Create a mic. Share the link. Let comedians sign up. 
              No accounts, no fees, no existential dread.
            </p>

            <div className="mt-12 flex flex-col gap-4 sm:flex-row">
              <Link href="/create">
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg font-bold bg-neon-pink text-primary-foreground hover:bg-neon-pink/90 transition-all duration-200 hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create a Mic
                </Button>
              </Link>
              <Link href="/create">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-lg font-bold border-2 border-border hover:border-neon-green hover:text-neon-green bg-transparent"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="text-center text-3xl font-bold md:text-4xl">
            How it <span className="text-neon-amber">works</span>
          </h2>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="group relative rounded-xl border-2 border-dashed border-border p-6 transition-all hover:border-neon-pink">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neon-pink/20 font-mono text-2xl font-bold text-neon-pink">
                1
              </div>
              <h3 className="text-xl font-bold">Create Your Mic</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                Pick a name, set the date, choose how many slots. Takes about 30 seconds.
              </p>
            </div>

            <div className="group relative rounded-xl border-2 border-dashed border-border p-6 transition-all hover:border-neon-green">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neon-green/20 font-mono text-2xl font-bold text-neon-green">
                2
              </div>
              <h3 className="text-xl font-bold">Share the Link</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                {"Every mic gets a unique page. Drop it in your group chat. Text it. Tattoo it."}
              </p>
            </div>

            <div className="group relative rounded-xl border-2 border-dashed border-border p-6 transition-all hover:border-neon-amber">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neon-amber/20 font-mono text-2xl font-bold text-neon-amber">
                3
              </div>
              <h3 className="text-xl font-bold">Comedians Sign Up</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                {"They click, they type their name, they're on the list. Revolutionary."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Mic2 className="h-5 w-5 text-neon-pink" />
              <span className="font-bold">Mic Drop</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for comedians who just want to do their time.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
