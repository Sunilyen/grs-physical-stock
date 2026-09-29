# GRS Physical Stock — Purchase & Store Management

End-of-Day Physical Stock Counting Module built with Next.js (App Router), TypeScript, Tailwind CSS, and Supabase.

## Features

- **Items Master** — Manage inventory items with codes, names, MOU, and categories (F&B, Retail, Merchandise)
- **Counters Master** — Manage counters with type classification and item mapping
- **Stock Count Sessions** — Create end-of-day count sessions per counter per business date
- **Physical Count Entry** — Enter counted quantities with real-time progress tracking
- **Draft & Submit Workflow** — Save counts as draft, then submit when complete
- **Responsive Design** — Works on desktop and mobile browsers

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor
3. Copy your project URL and anon key

### 3. Environment Variables

Update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `items` | Items master with code, name, MOU, category |
| `counters` | Counters master with code, name, type |
| `counter_items` | Many-to-many mapping between counters and items |
| `stock_count_sessions` | Parent record for each count session |
| `physical_stock_counts` | Child records with counted quantities per item |

### Key Constraints

- One session per business date per counter (`UNIQUE(business_date, counter_id)`)
- One count entry per item per session (`UNIQUE(session_id, item_id)`)
- Counted quantity must be non-negative (`CHECK (counted_qty >= 0)`)

## Project Structure

```
├── app/
│   ├── (layout.tsx              # Root layout
│   ├── page.tsx                 # Dashboard
│   ├── globals.css              # Tailwind + custom styles
│   ├── login/page.tsx           # Login page
│   ├── auth/callback/route.ts   # Auth callback
│   ├── items/page.tsx           # Items master
│   ├── counters/page.tsx        # Counters master
│   └── stock-count/
│       ├── page.tsx             # Session list
│       ├── new/page.tsx         # Create new session
│       └── [id]/page.tsx        # Count entry detail
├── components/
│   └── app-shell.tsx            # App navigation shell
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser Supabase client
│   │   ├── server.ts            # Server Supabase client
│   │   └── middleware.ts        # Auth session middleware
│   └── types.ts                 # TypeScript interfaces
├── middleware.ts                # Next.js middleware
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
