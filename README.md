# Canvas Study Planner

Responsive planner for students to import Canvas and Google Calendar iCal feeds, then drag assignments into weekly study blocks.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (Auth, Postgres, Edge Functions)
- dnd-kit for drag/drop

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Add frontend env vars in `.env`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Start dev server:

```bash
npm run dev
```

## Supabase Setup

1. Create a Supabase project.
2. Run SQL migration from `supabase/migrations/202604220001_init.sql`.
3. Deploy edge function:

```bash
supabase functions deploy sync-ical
```

4. In Supabase project settings for Edge Functions, set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Build Verification

```bash
npm run build
```

## Deploy (Vercel)

1. Import this repository into Vercel.
2. Set frontend env vars in Vercel project settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3. Deploy.
