"use client"

import { useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ImageIcon, Loader2, X, Upload } from "lucide-react"

interface ImageUploadProps {
  value: string | null
  onChange: (url: string | null) => void
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.")
      return
    }

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("mic_image")
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setError("Upload failed. Try again.")
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from("mic_image").getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleRemove = () => {
    onChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  if (value) {
    return (
      <div className="relative group rounded-xl overflow-hidden border-2 border-border">
        <img
          src={value}
          alt="Mic flyer"
          className="w-full h-48 object-cover"
        />
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
        >
          <X className="h-3 w-3" />
          Remove
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/30 p-8 cursor-pointer hover:border-neon-pink hover:bg-secondary/50 transition-all"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 text-neon-pink animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-pink/10">
              <ImageIcon className="h-6 w-6 text-neon-pink" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drop your flyer here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse · PNG, JPG, GIF up to 5MB
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <Upload className="h-3 w-3" />
              Choose file
            </div>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}
