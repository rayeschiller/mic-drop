# Mic Drop

> Open mic sign-ups, minus the chaos.

**Mic Drop** is a dead-simple web app for hosting open mic sign-ups. Optional user accounts. No apps to download. No spreadsheets passed around in a group chat. Just create a mic, share a link, and watch the slots fill up.

Built for comedy hosts who have enough to worry about and comedians who just want to do their time.

---

## How It Works

1. **Create a mic** — Give it a name, pick a date, set the number of slots. Done in under a minute.
2. **Share the link** — Every mic gets its own unique page. Drop it wherever your comedians live.
3. **Comedians sign up** — They click the link, type their name, and they're on the list. Revolutionary.

---

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Database:** [Supabase](https://supabase.com)
- **UI:** [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS](https://tailwindcss.com)
- **Deployment:** [Vercel](https://vercel.com)

---

## Getting Started

### Prerequisites

- Node.js 20.9+
- A [Supabase](https://supabase.com) project

### Installation

```bash
# Install dependencies
npm ci --ignore-scripts

# Copy environment variables
cp .env.example .env.local
```

Fill in your Supabase credentials in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your_google_maps_map_id
```

Enable billing, Maps JavaScript API, and Places API in the Google Cloud project
for the key, and allow your development and production origins in its website
restrictions. Create a JavaScript Map ID for production advanced markers.
If no Map ID is supplied, the map uses Google's `DEMO_MAP_ID` for development.
Public environment variables must be set before building; rebuild after changing them.
Without a working key the mic list remains available and the map shows a fallback.

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see it running.

### Build

```bash
pnpm build
pnpm start
```

---

## License

MIT

## User authentication and staging

Email/password accounts, confirmation, password reset, and sign-out are available at `/login` and `/account`. See [STAGING.md](STAGING.md) for isolated staging configuration and verification.
