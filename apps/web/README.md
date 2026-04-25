# @fitflow/web

Next.js 14 coach dashboard for the FitFlow platform. Mobile-first PWA designed for coaches who operate 80% on their phone.

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| Next.js 14 (App Router) | Framework, SSR, routing |
| Tailwind CSS 3.4 | Utility-first styling |
| Radix UI | Accessible unstyled primitives (Dialog, Tabs, Select, Toast, etc.) |
| Framer Motion | Page transitions, staggered animations, micro-interactions |
| Recharts | Client progress and compliance dashboards |
| Supabase SSR | Authentication (email/password) |
| Lucide React | Icon library |
| @dnd-kit | Drag-and-drop for plan builders |

## Directory Structure

```
src/
├── app/                        Next.js App Router pages
│   ├── (auth)/
│   │   ├── login/              Email/password login
│   │   └── register/           Coach signup
│   ├── auth/callback/          Supabase OAuth callback handler
│   ├── dashboard/              Protected coach dashboard
│   │   ├── page.tsx            Overview (stats, at-risk clients, roster)
│   │   ├── clients/            Client roster and detail views
│   │   │   ├─��� new/            Add client form
│   │   │   └── [id]/           Client detail (assignments, check-ins, messages)
│   │   ├── plans/              Workout plan library
│   │   │   ├── new/            Plan builder (exercises, sets, reps, drag-and-drop)
│   │   │   └── [id]/           Plan editor
│   │   ├── meal-plans/         Meal plan library
│   │   │   ├── new/            Meal plan builder
│   │   │   └── [id]/           Meal plan editor
│   │   ├── messages/           Message threads (WhatsApp/Telegram conversations)
│   │   ├── offers/             Sales offers management
│   │   ├── leads/              Lead pipeline (NEW → CONVERTED)
│   │   ├── activity/           Event log viewer (70+ event types)
│   │   ├── billing/            Payment history (Stripe + bank transfer)
│   │   ├── subscription/       Tier selection, invoices, Stripe portal
│   │   └── settings/           Coach profile, channel config, avatar upload
│   ├── admin/                  Platform admin (role-gated)
│   ├── onboarding/             Post-signup coach setup flow
│   ├── setup/                  Initial onboarding wizard
│   ├── t/[slug]/               Coach profile landing pages (ftfw.fit)
│   │   └── [offerSlug]/        Offer-specific signup funnels
│   ├── [coachSlug]/            Public offer landing pages
│   ├── go/                     Short link redirect
│   ├── layout.tsx              Root layout (fonts, metadata, providers)
│   └── middleware.ts           Route protection, domain routing
├── components/
│   ├── DashboardLayout.tsx     Main layout with collapsible sidebar + notifications
│   ├── DashboardStats.tsx      Animated KPI cards (4-column grid)
│   ├── ClientGrid.tsx          Client roster cards with status badges
│   ├── PlanBuilder.tsx         Workout plan editor (36 KB)
│   ├── MealPlanBuilder.tsx     Meal plan editor (32 KB)
│   ├── TemplatePicker.tsx      Workout template browser
│   ├── MealTemplatePicker.tsx  Meal template browser
│   ├── PricingTiers.tsx        Subscription tier selector
│   ├── RiskScoreCard.tsx       At-risk client alerts
│   ├── UpgradePrompt.tsx       Feature-gated upsell component
│   ├── WhatsAppRulesSection.tsx Messaging rules info
│   ├── WhatsAppWindowBanner.tsx 24-hour window status
│   ├── admin/                  Admin-specific components
│   ├── setup/                  Onboarding wizard steps
│   └── ui/                     Design system primitives
│       ├── Modal.tsx           Dialog/modal (Radix-based)
│       ├── Toast.tsx           Notification system with ToastProvider
│       ├── FormField.tsx       Form input wrapper
│       ├── StatusBadge.tsx     Client status indicator
│       ├── Spinner.tsx         Loading indicator
│       ├── IconButton.tsx      Icon-only button
│       ├── AvatarUpload.tsx    Image upload component
│       ��── SkipNav.tsx         Accessibility skip link
├── hooks/
│   └── useSubscription.ts     Subscription status hook (tier, limits, usage, trial)
├── lib/
│   ├── auth.ts                getAuthHeaders() — Supabase token for API calls
│   ├── admin-api.ts           Typed admin data fetchers
│   ├── tokens.ts              Design tokens (transitions, focus, z-index, formatters)
│   ├── supabase/
│   │   ├── client.ts          Browser Supabase client
│   │   ├── server.ts          Server-side Supabase client (cookie management)
│   │   └── middleware.ts       Token refresh and session sync
│   └── utils.ts               Utility functions
└── middleware.ts              Route protection, authenticated redirect logic
```

## Running Locally

```bash
# From repo root
pnpm --filter @fitflow/web dev    # next dev on :3000
```

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Authentication Flow

1. User submits email/password on `/login`
2. Supabase returns JWT access token + refresh token
3. Tokens stored in cookies (managed by `@supabase/ssr`)
4. `middleware.ts` intercepts requests to protected routes:
   - Unauthenticated ��� redirect to `/login`
   - Authenticated on `/login` or `/register` → redirect to `/dashboard`
   - Handles ftfw.fit vanity domain routing
5. API calls include token via `getAuthHeaders()`:
   ```typescript
   const headers = await getAuthHeaders();
   fetch(`${API_URL}/clients`, { headers });
   ```

## Key Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | Overview | Stats grid, at-risk clients, channel breakdown, client roster |
| `/dashboard/clients` | Client List | Searchable table with status tabs |
| `/dashboard/clients/[id]` | Client Detail | Assignments, check-ins, workout logs, messages |
| `/dashboard/plans` | Plan Library | Card grid with duplicate/delete, search |
| `/dashboard/plans/new` | Plan Builder | Day-by-day exercise entry with drag-and-drop |
| `/dashboard/meal-plans` | Meal Library | Same pattern as workout plans |
| `/dashboard/messages` | Messages | Conversation list with WhatsApp window status |
| `/dashboard/leads` | Lead Pipeline | Status-filtered lead cards with conversion actions |
| `/dashboard/offers` | Offers | CRUD for marketing funnels |
| `/dashboard/activity` | Activity Feed | Event log with colored icons and relative timestamps |
| `/dashboard/billing` | Billing | Payment history (Stripe + bank transfer) |
| `/dashboard/subscription` | Subscription | Tier selector, trial countdown, invoices |
| `/dashboard/settings` | Settings | Profile, channels, avatar, currency |
| `/admin` | Admin Dashboard | Platform KPIs, coach management, revenue |

## Design System

### Fonts
- **Display**: Newsreader (serif) — headings and hero text
- **Body**: DM Sans — all body text and UI labels
- **Mono**: IBM Plex Mono — code and data

### Colors (Dark Mode Only)

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#0a0a0b` | Page background |
| `bg-card` | `#151518` | Card surfaces |
| `bg-secondary` | `#111113` | Sidebar, secondary surfaces |
| `text-primary` | `#f0f0f0` | Primary text |
| `text-secondary` | `#a0a0a5` | Secondary/muted text |
| `brand-green` | `#25D366` | WhatsApp, success states |
| `brand-blue` | `#4E97F8` | Links, active states |
| `brand-orange` | `#F0853A` | Warnings, attention |
| `brand-violet` | `#9D7CF4` | Premium features |
| `brand-red` | `#EF5350` | Errors, destructive |

Each brand color has `-glow`, `-dim`, and `-border` variants for semantic styling.

### Design Tokens (`lib/tokens.ts`)

- `TRANSITIONS` — Predefined transition classes
- `FOCUS` — Accessible focus ring patterns
- `Z_INDEX` — Fixed z-index scale (dropdown: 40, modal: 50, toast: 60)
- `formatCurrency()`, `formatNumber()`, `formatTime()` — Locale-aware formatters

### CSS Utility Classes

| Class | Purpose |
|-------|---------|
| `.btn-primary`, `.btn-secondary`, `.btn-icon` | Button variants |
| `.card` | Card surface with border |
| `.stat-card` | Statistics display card |
| `.badge`, `.badge-green`, `.badge-blue`, etc. | Status badges |
| `.input`, `.input-with-icon` | Form inputs |
| `.label-mono` | Form labels (monospace) |
| `.tabs`, `.tab`, `.tab-active` | Tab navigation |
| `.skeleton` | Loading placeholders |
| `.empty-state` | Empty state UI |
| `.bg-mesh-gradient` | Mesh gradient backgrounds |

## State Management

No external state library (Redux, Zustand). Uses React's built-in patterns:

- **Local state**: `useState` for component state
- **Side effects**: `useEffect` for data fetching
- **Context**: `ToastProvider` (notifications), `useToast()` hook
- **Custom hooks**: `useSubscription()` for tier/limits/usage
- **Data fetching**: Fetch API with `async/await`, loading states managed locally
