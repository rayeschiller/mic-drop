# Mic Drop

> Open mic sign-ups, minus the chaos.

**Mic Drop** is a dead-simple web app for hosting open mic sign-ups. No accounts. No apps to download. No spreadsheets passed around in a group chat. Just create a mic, share a link, and watch the slots fill up.

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

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
```

Fill in your Supabase credentials in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

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