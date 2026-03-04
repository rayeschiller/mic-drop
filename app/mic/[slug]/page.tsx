import { MicPageClient } from "./mic-page-client"

export default async function MicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <MicPageClient slug={slug} />
}
