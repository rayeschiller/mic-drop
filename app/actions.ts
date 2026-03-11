"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { sendHostPinEmail } from "@/lib/email"
import crypto from "crypto"

// --- Helpers ---

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex")
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
  // Short 4-char random suffix to avoid collisions, keeps the URL clean
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// --- Types ---

export interface SlotData {
  id: string
  number: number
  taken: boolean
  performerName: string | null
  performerInstagram: string | null
  performerEmail?: string | null // Only included for host
}

export interface SectionData {
  id: string
  name: string | null
  startTime: string
  endTime: string | null
  totalSlots: number
  orderIndex: number
  slots: SlotData[]
}

export interface MicData {
  id: string
  slug: string
  name: string
  venue: string
  date: string
  startTime: string       // first section's start, or legacy
  endTime: string | null  // first section's end, or legacy
  totalSlots: number      // sum of sections, or legacy
  notes: string | null
  imageUrl: string | null
  slots: SlotData[]       // empty for sectioned mics
  sections: SectionData[] // empty for legacy mics
  seriesSlug: string | null
  seriesName: string | null
}

export interface SectionInput {
  id?: string  // provided when editing existing section
  name?: string
  startTime: string
  endTime?: string
  slots: number
}

// --- Actions ---

export async function uploadMicImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const admin = createAdminClient()
  const file = formData.get("file") as File
  if (!file) return { error: "No file provided" }

  const ext = file.name.split(".").pop()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = new Uint8Array(await file.arrayBuffer())

  const { error } = await admin.storage
    .from("mic_image")
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) return { error: error.message }

  const { data } = admin.storage.from("mic_image").getPublicUrl(path)
  return { url: data.publicUrl }
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  const admin = createAdminClient()
  const { data } = await admin.from("mics").select("id").eq("slug", slug).maybeSingle()
  return { available: !data }
}

export async function createMic(formData: {
  name: string
  venue: string
  date: string
  sections: SectionInput[]
  notes: string
  slug?: string
  hostEmail?: string
  imageUrl?: string
  seriesSlug?: string
  seriesName?: string
  hostPin?: string  // pass to share a PIN across recurring instances
}): Promise<{ success: boolean; slug?: string; hostPin?: string; error?: string }> {
  const admin = createAdminClient()
  const slug = formData.slug?.trim() || generateSlug(formData.name)
  const hostPin = formData.hostPin || generatePin()
  const hostPinHash = hashPin(hostPin)

  const firstSection = formData.sections[0]
  const totalSlots = formData.sections.reduce((sum, s) => sum + s.slots, 0)

  // Insert the mic
  const { data: mic, error: micError } = await admin
    .from("mics")
    .insert({
      slug,
      host_pin_hash: hostPinHash,
      host_email: formData.hostEmail || null,
      image_url: formData.imageUrl || null,
      name: formData.name,
      venue: formData.venue,
      date: formData.date,
      start_time: firstSection.startTime,
      end_time: firstSection.endTime || null,
      total_slots: totalSlots,
      notes: formData.notes || null,
      series_slug: formData.seriesSlug || null,
      series_name: formData.seriesName || null,
    })
    .select("id")
    .single()

  if (micError || !mic) {
    console.error("Failed to create mic:", micError)
    if (micError?.code === "23505") {
      return { success: false, error: "That URL is already taken. Try a different one." }
    }
    return { success: false, error: "Failed to create mic" }
  }

  // Insert sections and their slots
  let globalSlotNumber = 1
  for (let i = 0; i < formData.sections.length; i++) {
    const sec = formData.sections[i]

    const { data: section, error: secError } = await admin
      .from("sections")
      .insert({
        mic_id: mic.id,
        name: sec.name || null,
        start_time: sec.startTime,
        end_time: sec.endTime || null,
        total_slots: sec.slots,
        order_index: i,
      })
      .select("id")
      .single()

    if (secError || !section) {
      console.error("Failed to create section:", secError)
      return { success: false, error: "Failed to create sections" }
    }

    const slotsToInsert = Array.from({ length: sec.slots }, (_, j) => ({
      mic_id: mic.id,
      section_id: section.id,
      slot_number: globalSlotNumber + j,
      taken: false,
    }))
    globalSlotNumber += sec.slots

    const { error: slotsError } = await admin.from("slots").insert(slotsToInsert)
    if (slotsError) {
      console.error("Failed to create slots for section:", slotsError)
      return { success: false, error: "Failed to create slots" }
    }
  }

  // Send host PIN email if provided (non-blocking)
  if (formData.hostEmail) {
    sendHostPinEmail({
      to: formData.hostEmail,
      micName: formData.name,
      micSlug: slug,
      hostPin,
    }).catch((err) => console.error("Failed to send host PIN email:", err))
  }

  return { success: true, slug, hostPin }
}

function buildMicData(
  mic: Record<string, unknown>,
  slots: Record<string, unknown>[] | null,
  sections: Record<string, unknown>[] | null,
  includeEmails: boolean
): MicData {
  const slotsArr = slots || []
  const sectionsArr = sections || []

  const mapSlot = (s: Record<string, unknown>): SlotData => ({
    id: s.id as string,
    number: s.slot_number as number,
    taken: s.taken as boolean,
    performerName: s.performer_name as string | null,
    performerInstagram: s.performer_instagram as string | null,
    ...(includeEmails ? { performerEmail: s.performer_email as string | null } : {}),
  })

  const sectionData: SectionData[] = sectionsArr.map((sec) => ({
    id: sec.id as string,
    name: sec.name as string | null,
    startTime: sec.start_time as string,
    endTime: sec.end_time as string | null,
    totalSlots: sec.total_slots as number,
    orderIndex: sec.order_index as number,
    slots: slotsArr
      .filter((sl) => sl.section_id === sec.id)
      .map(mapSlot),
  }))

  // Legacy flat slots (no section_id)
  const legacySlots = slotsArr
    .filter((sl) => !sl.section_id)
    .map(mapSlot)

  const totalSlots =
    sectionData.length > 0
      ? sectionData.reduce((sum, s) => sum + s.totalSlots, 0)
      : (mic.total_slots as number)

  return {
    id: mic.id as string,
    slug: mic.slug as string,
    name: mic.name as string,
    venue: mic.venue as string,
    date: mic.date as string,
    startTime: mic.start_time as string,
    endTime: mic.end_time as string | null,
    totalSlots,
    notes: mic.notes as string | null,
    imageUrl: mic.image_url as string | null,
    slots: legacySlots,
    sections: sectionData,
    seriesSlug: mic.series_slug as string | null,
    seriesName: mic.series_name as string | null,
  }
}

export async function getMic(slug: string): Promise<{ mic: MicData | null; error?: string }> {
  const supabase = await createClient()

  const { data: mic, error: micError } = await supabase
    .from("mics")
    .select("*")
    .eq("slug", slug)
    .single()

  if (micError || !mic) {
    return { mic: null }
  }

  const [{ data: slots, error: slotsError }, { data: sections }] = await Promise.all([
    supabase
      .from("slots")
      .select("id, slot_number, taken, performer_name, performer_instagram, section_id")
      .eq("mic_id", mic.id)
      .order("slot_number", { ascending: true }),
    supabase
      .from("sections")
      .select("*")
      .eq("mic_id", mic.id)
      .order("order_index", { ascending: true }),
  ])

  if (slotsError) {
    return { mic: null, error: "Failed to load slots" }
  }

  return {
    mic: buildMicData(mic, slots, sections, false),
  }
}

export async function signupForSlot(
  micSlug: string,
  slotNumber: number,
  name: string,
  instagram: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("id")
    .eq("slug", micSlug)
    .single()

  if (!mic) return { success: false, error: "Mic not found" }

  const { data: updated, error } = await admin
    .from("slots")
    .update({
      taken: true,
      performer_name: name,
      performer_instagram: instagram || null,
      performer_email: email || null,
    })
    .eq("mic_id", mic.id)
    .eq("slot_number", slotNumber)
    .eq("taken", false)
    .select("id")

  if (error) {
    console.error("Failed to sign up:", error)
    return { success: false, error: "Failed to sign up" }
  }

  if (!updated || updated.length === 0) {
    return { success: false, error: "Slot already taken" }
  }

  return { success: true }
}

export async function removeFromSlot(
  micSlug: string,
  slotNumber: number,
  email: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("id")
    .eq("slug", micSlug)
    .single()

  if (!mic) return { success: false, error: "Mic not found" }

  const { data: slot } = await admin
    .from("slots")
    .select("id, performer_email")
    .eq("mic_id", mic.id)
    .eq("slot_number", slotNumber)
    .eq("taken", true)
    .single()

  if (!slot) return { success: false, error: "Slot not found" }

  if (slot.performer_email?.toLowerCase() !== email.toLowerCase()) {
    return { success: false, error: "Email does not match" }
  }

  const { error } = await admin
    .from("slots")
    .update({
      taken: false,
      performer_name: null,
      performer_instagram: null,
      performer_email: null,
    })
    .eq("id", slot.id)

  if (error) {
    console.error("Failed to remove:", error)
    return { success: false, error: "Failed to remove" }
  }

  return { success: true }
}

// --- Host-only actions ---

export async function verifyHostPin(
  micSlug: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("host_pin_hash")
    .eq("slug", micSlug)
    .single()

  if (!mic) return { success: false, error: "Mic not found" }

  const pinHash = hashPin(pin)
  if (pinHash !== mic.host_pin_hash) {
    return { success: false, error: "Invalid PIN" }
  }

  return { success: true }
}

export async function getMicWithEmails(
  micSlug: string,
  pin: string
): Promise<{ mic: MicData | null; error?: string }> {
  const verified = await verifyHostPin(micSlug, pin)
  if (!verified.success) return { mic: null, error: "Unauthorized" }

  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("*")
    .eq("slug", micSlug)
    .single()

  if (!mic) return { mic: null, error: "Mic not found" }

  const [{ data: slots }, { data: sections }] = await Promise.all([
    admin
      .from("slots")
      .select("*")
      .eq("mic_id", mic.id)
      .order("slot_number", { ascending: true }),
    admin
      .from("sections")
      .select("*")
      .eq("mic_id", mic.id)
      .order("order_index", { ascending: true }),
  ])

  return {
    mic: buildMicData(mic, slots, sections, true),
  }
}

export async function hostRemoveSlot(
  micSlug: string,
  pin: string,
  slotNumber: number
): Promise<{ success: boolean; error?: string }> {
  const verified = await verifyHostPin(micSlug, pin)
  if (!verified.success) return { success: false, error: "Unauthorized" }

  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("id")
    .eq("slug", micSlug)
    .single()

  if (!mic) return { success: false, error: "Mic not found" }

  const { error } = await admin
    .from("slots")
    .update({
      taken: false,
      performer_name: null,
      performer_instagram: null,
      performer_email: null,
    })
    .eq("mic_id", mic.id)
    .eq("slot_number", slotNumber)

  if (error) {
    console.error("Failed to remove slot:", error)
    return { success: false, error: "Failed to remove" }
  }

  return { success: true }
}

export async function hostUpdateMic(
  micSlug: string,
  pin: string,
  data: {
    name: string
    venue: string
    date: string
    notes?: string
    slug?: string
    imageUrl?: string | null
    seriesSlug?: string | null
    seriesName?: string | null
    // Legacy (single-section) mics:
    startTime?: string
    endTime?: string
    totalSlots?: number
    // Multi-section mics:
    sections?: SectionInput[]
  }
): Promise<{ success: boolean; newSlug?: string; error?: string }> {
  const verified = await verifyHostPin(micSlug, pin)
  if (!verified.success) return { success: false, error: "Unauthorized" }

  const admin = createAdminClient()

  const { data: mic } = await admin
    .from("mics")
    .select("id, total_slots")
    .eq("slug", micSlug)
    .single()

  if (!mic) return { success: false, error: "Mic not found" }

  const newSlug = data.slug?.trim() || micSlug

  // Derive start_time / end_time / total_slots for the mic row
  let startTime = data.startTime || ""
  let endTime = data.endTime || null
  let totalSlots = data.totalSlots ?? mic.total_slots

  if (data.sections && data.sections.length > 0) {
    startTime = data.sections[0].startTime
    endTime = data.sections[0].endTime || null
    totalSlots = data.sections.reduce((sum, s) => sum + s.slots, 0)
  }

  const { error: updateError } = await admin
    .from("mics")
    .update({
      slug: newSlug,
      name: data.name,
      venue: data.venue,
      date: data.date,
      start_time: startTime,
      end_time: endTime || null,
      notes: data.notes || null,
      total_slots: totalSlots,
      image_url: data.imageUrl !== undefined ? data.imageUrl : undefined,
      series_slug: data.seriesSlug !== undefined ? data.seriesSlug : undefined,
      series_name: data.seriesName !== undefined ? data.seriesName : undefined,
    })
    .eq("id", mic.id)

  if (updateError) {
    console.error("Failed to update mic:", updateError)
    if (updateError.code === "23505") {
      return { success: false, error: "That URL is already taken. Try a different one." }
    }
    return { success: false, error: "Failed to update" }
  }

  if (data.sections && data.sections.length > 0) {
    // Handle multi-section update
    const result = await updateSections(admin, mic.id, data.sections)
    if (!result.success) return result
  } else if (data.totalSlots !== undefined) {
    // Legacy: handle slot count change
    const oldTotal = mic.total_slots
    if (data.totalSlots > oldTotal) {
      const newSlots = Array.from(
        { length: data.totalSlots - oldTotal },
        (_, i) => ({
          mic_id: mic.id,
          slot_number: oldTotal + i + 1,
          taken: false,
        })
      )
      await admin.from("slots").insert(newSlots)
    } else if (data.totalSlots < oldTotal) {
      await admin
        .from("slots")
        .delete()
        .eq("mic_id", mic.id)
        .gt("slot_number", data.totalSlots)
        .eq("taken", false)
    }
  }

  return { success: true, newSlug: newSlug !== micSlug ? newSlug : undefined }
}

async function updateSections(
  admin: ReturnType<typeof createAdminClient>,
  micId: string,
  sections: SectionInput[]
): Promise<{ success: boolean; error?: string }> {
  // Get existing sections
  const { data: existingSections } = await admin
    .from("sections")
    .select("id")
    .eq("mic_id", micId)

  const existingIds = new Set((existingSections || []).map((s) => s.id as string))
  const submittedIds = new Set(sections.filter((s) => s.id).map((s) => s.id as string))

  // Delete removed sections (only if no taken slots)
  const removedIds = [...existingIds].filter((id) => !submittedIds.has(id))
  for (const sectionId of removedIds) {
    const { data: takenSlots } = await admin
      .from("slots")
      .select("id")
      .eq("section_id", sectionId)
      .eq("taken", true)
    if (takenSlots && takenSlots.length > 0) continue // skip — has performers
    await admin.from("slots").delete().eq("section_id", sectionId)
    await admin.from("sections").delete().eq("id", sectionId)
  }

  // Get max slot_number for this mic (to append new slots)
  const { data: maxSlotRow } = await admin
    .from("slots")
    .select("slot_number")
    .eq("mic_id", micId)
    .order("slot_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextSlotNumber = ((maxSlotRow?.slot_number as number) || 0) + 1

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i]

    if (sec.id && existingIds.has(sec.id)) {
      // Update existing section
      await admin
        .from("sections")
        .update({
          name: sec.name || null,
          start_time: sec.startTime,
          end_time: sec.endTime || null,
          total_slots: sec.slots,
          order_index: i,
        })
        .eq("id", sec.id)

      // Handle slot count change for this section
      const { data: sectionSlots } = await admin
        .from("slots")
        .select("id, slot_number, taken")
        .eq("section_id", sec.id)
        .order("slot_number", { ascending: true })

      const currentCount = (sectionSlots || []).length
      if (sec.slots > currentCount) {
        const newSlots = Array.from({ length: sec.slots - currentCount }, (_, j) => ({
          mic_id: micId,
          section_id: sec.id,
          slot_number: nextSlotNumber + j,
          taken: false,
        }))
        nextSlotNumber += sec.slots - currentCount
        await admin.from("slots").insert(newSlots)
      } else if (sec.slots < currentCount) {
        // Remove from the end (only untaken)
        const toRemove = (sectionSlots || [])
          .filter((s) => !s.taken)
          .slice(-(currentCount - sec.slots))
          .map((s) => s.id)
        if (toRemove.length > 0) {
          await admin.from("slots").delete().in("id", toRemove)
        }
      }
    } else {
      // New section
      const { data: newSection } = await admin
        .from("sections")
        .insert({
          mic_id: micId,
          name: sec.name || null,
          start_time: sec.startTime,
          end_time: sec.endTime || null,
          total_slots: sec.slots,
          order_index: i,
        })
        .select("id")
        .single()

      if (newSection) {
        const slotsToInsert = Array.from({ length: sec.slots }, (_, j) => ({
          mic_id: micId,
          section_id: newSection.id,
          slot_number: nextSlotNumber + j,
          taken: false,
        }))
        nextSlotNumber += sec.slots
        await admin.from("slots").insert(slotsToInsert)
      }
    }
  }

  return { success: true }
}

export async function getMicsBySeries(
  seriesSlug: string,
  currentMicId: string
): Promise<{ id: string; slug: string; name: string; date: string; startTime: string }[]> {
  const admin = createAdminClient()

  const { data } = await admin
    .from("mics")
    .select("id, slug, name, date, start_time")
    .eq("series_slug", seriesSlug)
    .neq("id", currentMicId)
    .order("date", { ascending: true })

  return (data || []).map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    date: m.date,
    startTime: m.start_time,
  }))
}
