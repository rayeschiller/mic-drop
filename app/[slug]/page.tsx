import type { Metadata } from "next"
import { getMic } from "@/app/actions"
import { MicPageClient } from "./mic-page-client"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { mic } = await getMic(slug)

  if (!mic) {
    return { title: "Mic Not Found | Mic Drop" }
  }

  const title = `${mic.name} | Mic Drop`
  const description = mic.notes
    ? mic.notes.slice(0, 160)
    : `Open mic at ${mic.venue}. Sign up for a slot.`

  return {
    title,
    openGraph: {
      title,
      description,
      ...(mic.imageUrl ? { images: [{ url: mic.imageUrl }] } : {}),
    },
    twitter: {
      card: mic.imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(mic.imageUrl ? { images: [mic.imageUrl] } : {}),
    },
  }
}

export default async function MicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <MicPageClient slug={slug} />
}
