import Link from "next/link"
import { Mic2, ArrowLeft } from "lucide-react"
import { CreateMicForm } from "@/components/create-mic-form"

export const metadata = {
  title: "Create a Mic | Mic Drop",
  description: "Host your own open mic. Set the date, pick the slots, share the link.",
}

export default function CreateMicPage() {
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
        </div>
      </header>

      <div className="mx-auto max-w-xl px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to home</span>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Create a <span className="text-neon-pink">Mic</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            {"Set up your open mic in under a minute. You'll get a shareable page where comedians can sign up for slots."}
          </p>
        </div>

        <div className="rounded-xl border-2 border-border bg-card p-6 md:p-8">
          <CreateMicForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {"No account needed. No payment required. Just vibes."}
        </p>
      </div>
    </main>
  )
}
