"use client"

import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { deleteMic } from "../actions"

export function DeleteMicButton({ slug, name }: { slug: string; name: string }) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await deleteMic(slug)
    router.push("/admin")
  }

  return (
    <button
      onClick={handleDelete}
      className="flex items-center gap-1.5 rounded-lg border border-destructive/50 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Delete mic
    </button>
  )
}
