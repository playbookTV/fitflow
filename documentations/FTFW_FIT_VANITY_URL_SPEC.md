# ftfw.fit — Vanity URL & Public Profile Spec
**Version:** 1.0  
**Author:** Ovalay Studios  
**Status:** Draft

---

## Overview

`ftfw.fit` is a lightweight routing app, separate from the main FitFlow application, that serves two purposes:

1. Resolves a trainer's vanity slug to their public profile page
2. Instantly redirects channel-specific links to WhatsApp or Telegram

Every trainer gets a unique URL at `ftfw.fit/[slug]`. Channel deep links append a `?c=` parameter that triggers an instant redirect. No URL shortening infrastructure is required.

---

## Routing Logic

### Request resolution order

```
Incoming request → check slug_redirect table → check trainer record → resolve
```

1. Check `slug_redirect` table first (handles changed slugs within 90-day window)
2. Look up trainer by slug
3. If trainer found and `profileVisible: true` → render or redirect
4. If trainer not found or `profileVisible: false` → soft 404

### Route table

| URL pattern | Condition | Behaviour |
|-------------|-----------|-----------|
| `ftfw.fit/[slug]` | Trainer found, profile visible, no `?c=` | Render profile page |
| `ftfw.fit/[slug]?c=wb` | Trainer found, profile visible | 301 → `wa.me/[provisioned_number]` |
| `ftfw.fit/[slug]?c=tg` | Trainer found, profile visible | 301 → `t.me/[bot_username]` |
| `ftfw.fit/[slug]` | Trainer not found | Branded 404 |
| `ftfw.fit/[slug]` | `profileVisible: false` | Soft 404 — same as not found from visitor perspective |
| `ftfw.fit/[old-slug]` | Found in `slug_redirect` table | 301 → `ftfw.fit/[new-slug]` |

### `?c=` channel parameter reference

| Value | Destination |
|-------|-------------|
| `wb` | `wa.me/[provisioned_number]` |
| `tg` | `t.me/[bot_username]` |

- Unknown `?c=` values fall through to profile page render — not an error
- Extensible: `ig`, `em` etc. can be added later without breaking existing links
- All `?c=` redirects fire a `profile.redirect` analytics event before redirecting

### Vercel configuration

```json
// vercel.json — ftfw.fit
{
  "rewrites": [
    { "source": "/:slug", "destination": "/profile?slug=:slug" }
  ]
}
```

```typescript
// app/[slug]/page.tsx
// 1. Read slug + ?c= param from request
// 2. Check slug_redirect table
// 3. If ?c= present → log profile.redirect event → redirect()
// 4. If no ?c= → fetch trainer data → render profile page
// 5. If no trainer found → return 404
```

Profile page must be server-rendered (SSR or ISR) — not client-rendered — so that OG meta tags are correctly injected for WhatsApp and Telegram link previews.

---

## Slug Rules

- Alphanumeric and hyphens only. No spaces, no special characters.
- 3–30 characters.
- Case-insensitive at resolution (`ftfw.fit/CoachMarcus` resolves identically to `ftfw.fit/coachmarcus`).
- Auto-suggested from display name on first profile setup (e.g. "Coach Marcus" → `coach-marcus`).
- Conflict resolution: if `coach-marcus` is taken, suggest `coach-marcus-2`. Trainer can override suggestion.
- Slug changes are allowed but show a warning modal and trigger a 90-day redirect from the old slug.
- First change has no warning. Subsequent changes show: *"Your old link `ftfw.fit/[old-slug]` will redirect for 90 days then stop working."*

### Reserved slugs

The following slugs cannot be claimed by trainers:

`app`, `api`, `admin`, `login`, `register`, `settings`, `help`, `404`, `health`, `status`

---

## Public Profile Page

### Sections

**Avatar**
Circular. Uses uploaded photo if available. Falls back to initials from display name.

**Display name**
From `trainer.displayName`. E.g. "Coach Marcus".

**Specialities**
Comma-separated from Step 1 of onboarding. Maximum 3 shown publicly.

**Slug URL**
Displayed as a copyable label below specialities. Tapping copies `ftfw.fit/[slug]` to clipboard.

**Bio**
Trainer-authored. Plain text only. Max 200 characters.

**Rates**
Pulled live from `trainer.defaultPaymentModel` and pricing config at render time. Hidden entirely if `showRatesPublicly: false`. No "DM for rates" fallback — section is simply omitted.

| Payment model | Display format |
|---------------|---------------|
| Session blocks | "Per session £X · Block of N: £Y" |
| Per session | "Per session £X" |
| Monthly retainer | "Monthly £X" |
| Not configured / hidden | Section omitted |

**Channel buttons**
Rendered only for connected and enabled channels. If only WhatsApp is connected, a single full-width button renders. Both channels render as stacked buttons.

- WhatsApp button → navigates directly to `wa.me/[provisioned_number]`
- Telegram button → navigates directly to `t.me/[bot_username]`
- Both fire `profile.channel_click` event before navigating

**Powered by FitFlow**
Shown on all tiers in V1. Removed when custom domain support ships (post-V1).

### SEO & meta tags

```html
<title>[Display name] — Personal Trainer</title>
<meta name="description" content="[bio, truncated to 155 chars]" />
<meta property="og:title" content="[Display name] — Personal Trainer" />
<meta property="og:description" content="[bio]" />
<meta property="og:image" content="[avatarUrl or FitFlow default card]" />
<meta property="og:url" content="https://ftfw.fit/[slug]" />
```

---

## Settings Panel

Location: FitFlow app → Settings → Public profile

### Slug field

- Live availability check as trainer types — debounced 400ms
- States: **Available** (green) / **Taken** (red) / **That's yours** (neutral, if unchanged)
- On save with changed slug: confirmation modal before committing

### Bio field

- Plain text textarea
- Character counter shown: `N / 200 characters`
- No markdown, no links

### Visibility toggles

| Toggle | Default | Behaviour when off |
|--------|---------|-------------------|
| Profile page live | On | All routes return soft 404, including `?c=` redirects |
| Show rates publicly | On | Rates section hidden on profile page. Pricing config in FitFlow unaffected. |
| Show WhatsApp button | On | WhatsApp button hidden on profile page |
| Show Telegram button | On | Telegram button hidden. Automatically disabled if channel not connected. |

### Share links section

Below the settings card, a Share your profile section displays copyable links:

| Label | URL |
|-------|-----|
| Profile page | `ftfw.fit/[slug]` |
| WhatsApp deep link | `ftfw.fit/[slug]?c=wb` |
| Telegram deep link | `ftfw.fit/[slug]?c=tg` |

Each link has a one-tap copy button. Copying fires a `profile.link_copied` event with `channel` property.

### Status indicator

A persistent status pill at the bottom of the settings card:

- 🟢 `Profile live at ftfw.fit/[slug]` — when `profileVisible: true`
- 🔴 `Profile hidden` — when `profileVisible: false`

---

## Analytics

### Events tracked

| Event | Fired when | Properties |
|-------|-----------|------------|
| `profile.viewed` | Profile page loaded | `slug`, `source` |
| `profile.channel_click` | Channel button tapped on profile page | `slug`, `channel` |
| `profile.redirect` | `?c=` param redirect processed | `slug`, `channel` |
| `profile.link_copied` | Trainer copies a share link in Settings | `slug`, `channel` |

**Deduplication:** `profile.viewed` is deduplicated by hashed IP + slug within a 1-hour window to reduce bot inflation. Raw IPs are never stored.

### Metrics surfaced to trainer

| Metric | Definition |
|--------|-----------|
| Profile views | Unique visits to `ftfw.fit/[slug]` (no `?c=`) in selected period |
| Channel clicks | Total taps on WhatsApp or Telegram buttons on the profile page |
| Click-through rate | Channel clicks ÷ profile views |
| WhatsApp clicks | `profile.channel_click` events where `channel = "wb"` |
| Telegram clicks | `profile.channel_click` events where `channel = "tg"` |
| Clicks by channel | Bar breakdown of WhatsApp vs Telegram |
| Traffic source | Direct vs `?c=wb` inbound vs `?c=tg` inbound |

### Time range

- Default: last 7 days
- Selector: 7d / 30d / all time
- Data retained for 12 months
- V1: stat cards and bar breakdowns only. Time-series chart is a V2 addition.

---

## Data Model

### `trainer.profile` fields

Extends the existing trainer record — no separate profile table.

```typescript
trainer {
  // Identity
  slug:               string       // "coach-marcus" — unique, indexed, lowercase
  slugHistory:        string[]     // previous slugs for 90-day redirect lookup
  displayName:        string       // "Coach Marcus"
  bio:                string       // max 200 chars, plain text
  avatarUrl:          string|null  // null triggers initials fallback

  // Visibility
  profileVisible:     boolean      // master publish switch
  showRatesPublicly:  boolean      // show/hide rates section on public page
  showWhatsapp:       boolean      // show/hide WhatsApp button
  showTelegram:       boolean      // show/hide Telegram button

  // Channels (read from messaging config — not duplicated here)
  whatsappNumber:     string|null  // provisioned number
  telegramBotHandle:  string|null  // bot username

  // Rates (read at render time from pricing config — not stored on profile)
  // defaultPaymentModel, pricePerSession, sessionsPerBlock, monthlyRate
  // are already on the trainer record from FitFlow pricing config
}
```

### `profile_event` schema

```typescript
profile_event {
  id:          uuid
  trainerSlug: string
  trainerId:   uuid
  event:       enum        // viewed | channel_click | redirect | link_copied
  channel:     string|null // "wb" | "tg" | null
  source:      string|null // "direct" | "wb_link" | "tg_link"
  ipHash:      string      // hashed — raw IP never stored
  userAgent:   string|null
  createdAt:   timestamp
}
```

### `slug_redirect` schema

```typescript
slug_redirect {
  oldSlug:   string
  newSlug:   string
  trainerId: uuid
  expiresAt: timestamp    // createdAt + 90 days
  createdAt: timestamp
}
```

Expired redirects are cleaned up via a nightly cron. The `slug_redirect` table is checked on every inbound request before the main trainer lookup.

---

## Implementation Notes

**Rates are never stored on the profile.** They are read at render time from the trainer's existing pricing config. This means the public profile always reflects current pricing with no sync step required.

**The `slug_redirect` table is not optional.** Without it, any trainer who changes their slug immediately breaks every link they've shared in a WhatsApp bio, Instagram story, or business card. The 90-day window gives those links time to naturally expire.

**IP hashing is required.** Raw IPs must not be stored. Hash before write using a server-side salt. The hash is used only for `profile.viewed` deduplication and discarded after the dedup check window closes.

**`profileVisible: false` must behave identically to slug not found.** Visitors should not be able to determine whether a profile exists but is hidden, or has never existed. Both return the same 404 page.

---

## Out of Scope for V1

- Custom domain support (e.g. `coach.marcusfitness.com` → same profile page)
- Removing "Powered by FitFlow" branding
- Time-series analytics chart
- Social links (Instagram, YouTube) on profile page
- Client testimonials or transformation photos
- Profile page themes or customisation beyond bio and avatar

---

*FitFlow · Ovalay Studios · v1.0*
