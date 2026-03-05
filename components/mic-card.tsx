import { CalendarDays, Clock, MapPin, Users } from "lucide-react"
import Link from "next/link"

export interface MicData {
  id: string
  slug: string
  name: string
  venue: string
  date: string
  startTime: string
  endTime: string
  totalSlots: number
  filledSlots: number
  notes?: string
}

interface MicCardProps {
  mic: MicData
}

export function MicCard({ mic }: MicCardProps) {
  const availableSlots = mic.totalSlots - mic.filledSlots
  const isFull = availableSlots === 0

  return (
    <Link href={`/${mic.slug}`} className="block group">
      <article className="relative overflow-hidden rounded-lg border-2 border-border bg-card p-6 transition-all duration-300 hover:border-neon-pink hover:shadow-[0_0_30px_rgba(236,72,153,0.3)]">
        {/* Show flyer style corner accent */}
        <div className="absolute -right-8 -top-8 h-16 w-16 rotate-45 bg-neon-pink opacity-80" />
        
        <div className="relative">
          <h3 className="text-2xl font-bold tracking-tight text-foreground group-hover:text-neon-pink transition-colors">
            {mic.name}
          </h3>
          
          <div className="mt-4 flex flex-col gap-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-neon-amber" />
              <span className="font-mono text-sm">{mic.venue}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-neon-amber" />
              <span className="font-mono text-sm">{mic.date}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-neon-amber" />
              <span className="font-mono text-sm">{mic.startTime} – {mic.endTime}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className={`font-mono text-sm font-bold ${isFull ? 'text-destructive' : 'text-neon-green'}`}>
                {isFull ? 'FULL' : `${availableSlots} of ${mic.totalSlots} slots left`}
              </span>
            </div>
          </div>

          {mic.notes && (
            <p className="mt-4 text-xs text-muted-foreground italic border-l-2 border-neon-pink/50 pl-3">
              {mic.notes}
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}
