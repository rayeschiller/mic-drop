"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mic2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { adminLogin } from "../actions"

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await adminLogin(password)
    if (result.success) {
      router.push("/admin")
    } else {
      setError(result.error ?? "Something went wrong.")
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <Mic2 className="h-10 w-10 text-neon-pink" />
          <h1 className="text-2xl font-bold tracking-tight">
            Mic<span className="text-neon-pink">Drop</span> Admin
          </h1>
          <p className="text-sm text-muted-foreground">Enter your admin password to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12 border-border bg-secondary/50 focus:border-neon-pink"
              required
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 font-bold bg-neon-pink text-primary-foreground hover:bg-neon-pink/90"
          >
            {loading ? "Checking..." : "Enter"}
          </Button>
        </form>
      </div>
    </main>
  )
}
