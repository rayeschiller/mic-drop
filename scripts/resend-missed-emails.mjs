/**
 * resend-missed-emails.mjs
 *
 * Resends lineup + waitlist confirmation emails for all FUTURE shows
 * where performers/waitlisters may have missed their original email
 * due to the Resend domain being unverified.
 *
 * Run with: node scripts/resend-missed-emails.mjs
 * Add --dry-run to preview without sending.
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ─── Load .env.local ────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim().replace(/^"|"$/g, "")))
    .filter(([k]) => k)
);

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_EMAIL = process.argv.find((a) => a.startsWith("--to="))?.split("=")[1] ?? null;
const PREVIEW_EMAIL = "rayeschiller@gmail.com"; // receives sample emails in dry-run
const SITE_URL = env.NEXT_PUBLIC_SITE_URL ?? "https://mics.rayeschiller.com";
const FROM_EMAIL = env.RESEND_FROM_EMAIL ?? "Mic Drop <noreply@rayeschiller.com>";
const TODAY = new Date().toISOString().split("T")[0];

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(env.RESEND_API_KEY);

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatTime(t) {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function log(msg) { console.log(msg); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Email senders ──────────────────────────────────────────────────────────
async function sendLineupEmail({ name, email, micName, micSlug, venue, date, startTime }) {
  const label = `Lineup confirmation → ${email} (${micName} on ${date})`;

  const micUrl = `${SITE_URL}/${micSlug}`;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `You're on the lineup — ${micName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#1a1a2e;color:#f8f8f8;border-radius:12px;">
        <h1 style="font-size:28px;font-weight:800;margin:0 0 8px;">Mic<span style="color:#e879a0;">Drop</span></h1>
        <p style="color:#aaa;margin:0 0 32px;">You're confirmed on the lineup.</p>
        <h2 style="font-size:22px;font-weight:700;margin:0 0 16px;">${micName}</h2>
        <p style="margin:0 0 8px;font-size:15px;">📍 ${venue}</p>
        <p style="margin:0 0 8px;font-size:15px;">📅 ${formatDate(date)}</p>
        <p style="margin:0 0 24px;font-size:15px;">🕐 ${formatTime(startTime)}</p>
        <p style="font-size:16px;margin:0 0 24px;">Hey ${name} — you're on the list. Go be funny.</p>
        <a href="${micUrl}" style="display:inline-block;padding:12px 24px;background:#e879a0;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">View Lineup →</a>
        <p style="margin:24px 0 0;font-size:13px;color:#666;">Can't make it? <a href="${micUrl}" style="color:#e879a0;">Visit the page</a> to remove yourself.</p>
      </div>
    `,
  });
  if (error) log(`  ❌ Failed: ${label} — ${error.message}`);
  else log(`  ✅ Sent: ${label}`);
  await sleep(250);
}

async function sendWaitlistEmail({ name, email, micName, micSlug, venue, date, startTime, position }) {
  const label = `Waitlist #${position} → ${email} (${micName} on ${date})`;

  const micUrl = `${SITE_URL}/${micSlug}`;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `You're #${position} on the waitlist — ${micName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#1a1a2e;color:#f8f8f8;border-radius:12px;">
        <h1 style="font-size:28px;font-weight:800;margin:0 0 8px;">Mic<span style="color:#e879a0;">Drop</span></h1>
        <p style="color:#aaa;margin:0 0 32px;">You're on the waitlist.</p>
        <h2 style="font-size:20px;font-weight:700;margin:0 0 16px;">${micName}</h2>
        <p style="margin:0 0 8px;font-size:15px;">📍 ${venue}</p>
        <p style="margin:0 0 8px;font-size:15px;">📅 ${formatDate(date)}</p>
        <p style="margin:0 0 24px;font-size:15px;">🕐 ${formatTime(startTime)}</p>
        <div style="margin:0 0 24px;padding:20px;background:#111124;border-radius:8px;border:1px solid #333;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#aaa;">Your Position</p>
          <p style="margin:0;font-size:48px;font-weight:800;color:#e879a0;">#${position}</p>
        </div>
        <p style="font-size:16px;margin:0 0 24px;">Hey ${name} — we'll email you if a slot opens up.</p>
        <a href="${micUrl}" style="display:inline-block;padding:12px 24px;background:#e879a0;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">View Lineup →</a>
        <p style="margin:24px 0 0;font-size:13px;color:#666;">Changed your mind? <a href="${micUrl}" style="color:#e879a0;">Visit the page</a> to leave the waitlist.</p>
      </div>
    `,
  });
  if (error) log(`  ❌ Failed: ${label} — ${error.message}`);
  else log(`  ✅ Sent: ${label}`);
  await sleep(250);
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  log(`\n🎤 Mic Drop — Missed Email Resender`);
  log(`Mode: ${DRY_RUN ? "DRY RUN (no emails sent)" : "LIVE"}`);
  log(`Only sending for shows on or after: ${TODAY}\n`);

  // 1. Fetch all future mics
  const { data: mics, error: micsError } = await supabase
    .from("mics")
    .select("id, name, slug, venue, date, start_time")
    .gte("date", TODAY)
    .order("date", { ascending: true });

  if (micsError) { console.error("Error fetching mics:", micsError); process.exit(1); }
  log(`Found ${mics.length} upcoming mic(s)\n`);

  let lineupCount = 0, waitlistCount = 0;
  let previewLineupSent = false, previewWaitlistSent = false;

  for (const mic of mics) {
    log(`📅 ${mic.name} — ${mic.date} @ ${mic.venue}`);

    // 2. Fetch performers with emails in this mic's slots
    const { data: slots } = await supabase
      .from("slots")
      .select("performer_name, performer_email")
      .eq("mic_id", mic.id)
      .eq("taken", true)
      .not("performer_email", "is", null);

    if (slots?.length) {
      log(`  ${slots.length} performer(s) on lineup:`);
      for (const slot of slots) {
        if (ONLY_EMAIL && slot.performer_email !== ONLY_EMAIL) continue;
        if (!DRY_RUN) {
          // Live mode: send to the real performer
          await sendLineupEmail({
            name: slot.performer_name,
            email: slot.performer_email,
            micName: mic.name,
            micSlug: mic.slug,
            venue: mic.venue,
            date: mic.date,
            startTime: mic.start_time,
          });
        } else if (!previewLineupSent) {
          // Dry-run: send one sample to you
          log(`  [DRY RUN] Sending YOU a sample lineup email (representing ${slot.performer_email})…`);
          await sendLineupEmail({
            name: slot.performer_name,
            email: PREVIEW_EMAIL,
            micName: mic.name,
            micSlug: mic.slug,
            venue: mic.venue,
            date: mic.date,
            startTime: mic.start_time,
          });
          previewLineupSent = true;
        } else {
          log(`  [DRY RUN] Would send lineup email → ${slot.performer_email} (${slot.performer_name})`);
        }
        lineupCount++;
      }
    } else {
      log(`  No performers with emails on lineup`);
    }

    // 3. Fetch waitlist entries
    const { data: waitlist } = await supabase
      .from("waitlist_entries")
      .select("performer_name, performer_email, created_at")
      .eq("mic_id", mic.id)
      .not("performer_email", "is", null)
      .order("created_at", { ascending: true });

    if (waitlist?.length) {
      log(`  ${waitlist.length} performer(s) on waitlist:`);
      for (let i = 0; i < waitlist.length; i++) {
        const entry = waitlist[i];
        const position = i + 1;
        if (ONLY_EMAIL && entry.performer_email !== ONLY_EMAIL) continue;
        if (!DRY_RUN) {
          // Live mode: send to the real performer
          await sendWaitlistEmail({
            name: entry.performer_name,
            email: entry.performer_email,
            micName: mic.name,
            micSlug: mic.slug,
            venue: mic.venue,
            date: mic.date,
            startTime: mic.start_time,
            position,
          });
        } else if (!previewWaitlistSent) {
          // Dry-run: send one sample to you
          log(`  [DRY RUN] Sending YOU a sample waitlist email (representing ${entry.performer_email})…`);
          await sendWaitlistEmail({
            name: entry.performer_name,
            email: PREVIEW_EMAIL,
            micName: mic.name,
            micSlug: mic.slug,
            venue: mic.venue,
            date: mic.date,
            startTime: mic.start_time,
            position,
          });
          previewWaitlistSent = true;
        } else {
          log(`  [DRY RUN] Would send waitlist email → ${entry.performer_email} (${entry.performer_name}, #${position})`);
        }
        waitlistCount++;
      }
    } else {
      log(`  No waitlist entries with emails`);
    }

    log("");
  }

  log(`\n✅ Done!`);
  log(`   Lineup emails: ${lineupCount}`);
  log(`   Waitlist emails: ${waitlistCount}`);
  log(`   Total: ${lineupCount + waitlistCount}`);
  if (DRY_RUN) {
    log(`\n   Sample emails sent to: ${PREVIEW_EMAIL}`);
    log(`   Run without --dry-run to send to everyone.\n`);
  }
}

main().catch(console.error);
