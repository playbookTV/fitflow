# Project rules — FitFlow Social Calendar

You (Claude Code) are operating inside a Buffer-fed social calendar for **FitFlow**.

## Single source of truth
- `calendar.csv` is the source of truth for **Twitter** posts.
- `linkedin-calendar.csv` is the source of truth for **LinkedIn** posts (long-form, separate cadence, separate schema).
- Never bypass the CSVs. Don't post directly to Buffer without writing to the relevant CSV first.

## Timezone
- All `time` values in both CSVs are **Europe/London** (BST or GMT depending on date).
- Convert to UTC before passing to the Buffer MCP if it requires it.

## Buffer channels
- `twitter` → my Twitter/X profile in Buffer (`fitflow_fit`). Used in `calendar.csv`.
- `instagram` → my Instagram profile in Buffer. Used in `calendar.csv` (currently no active rows).
- `linkedin` → Leslie's personal LinkedIn profile in Buffer (`leslieisaninja`). Used in `linkedin-calendar.csv`. Long-form, no thread convention, no 280 char limit (LinkedIn caps at ~3000).
- If multiple Buffer profiles exist for any channel, list them and ask before scheduling.

## Brands
- `FitFlow` — only brand actively scheduled via these calendars.
- Brixa is a separate brand and is intentionally **out of scope** for this calendar — do not import Brixa posts here.

## Status workflow
```
draft     → in progress, do not schedule
ready     → reviewed, ok to schedule
scheduled → Claude has pushed it to Buffer
posted    → Buffer published it (mark manually after the fact)
failed    → Claude tried to schedule but Buffer rejected it (see notes)
```

## What to do on these prompts

### "Schedule the ready posts"
1. Read `calendar.csv`.
2. Filter for `status == ready`.
3. For each row:
   - Validate: required fields present, copy within channel limit, media file exists if referenced, time is in the future.
   - Call the Buffer MCP `schedule` tool with: profile (mapped from `channel`), text (`copy`), media path or URL, scheduled_at (combined `date` + `time` in correct TZ), first_comment if set.
   - On success: set `status = scheduled`, write the Buffer post ID into `buffer_id`, write the CSV back atomically (write to `.tmp`, fsync, rename).
   - On failure: set `status = failed`, append the error to `notes`. Continue with the next row.
4. After processing, summarise: how many scheduled, how many failed, and for which dates.

### "Preview next week"
- Read the CSV, group by `date` then `channel`, render a markdown table.
- Flag any rows where: copy exceeds the channel limit, Instagram row missing media or alt_text, two posts within 30 min of each other on the same channel, more than 3 posts/day on either channel.

### "Move/spread posts"
- When asked to reflow scheduling (e.g. "spread these across Tue/Thu mornings"), only operate on rows in `draft` or `ready`. Never move `scheduled` rows without explicit confirmation — moving them in the CSV does not move them in Buffer.

### Editing copy
- Stay in Leslie's voice. Reference past posts in the CSV for tone matching.
- Twitter: 280 char hard limit. Count chars including links (Buffer expands t.co automatically; assume 23 chars per URL when counting).
- Instagram: keep first paragraph hooky — IG truncates after ~125 chars in feed.

## LinkedIn specifics (`linkedin-calendar.csv`)
- Schema: `id, date, time, channel, brand, pillar, status, copy, artifact, media, alt_text, buffer_id, notes`. No `link` or `first_comment` columns; `artifact` describes the suggested visual the post should ship with.
- Post id convention: `YYYY-MM-DD-li-NNN`.
- No threads — LinkedIn posts are long-form (up to ~3000 chars).
- Editorial rules (per FitFlow Multi-Channel Strategy doc):
  - Replace invented or estimated numbers before flipping to `ready`. If a soft number must stay, hedge it.
  - Use real screenshots / artefacts where possible.
  - Keep WhatsApp as the centre of FitFlow's promise. Telegram is part of architecture and learning, **not** the hero channel. Reject any draft that frames Telegram as launching first or as the primary product.
  - Scar-then-principle. No founder staccato unless the line genuinely needs the emphasis.
- Same status workflow as Twitter calendar.

## Threads (Twitter)
- Threads are multiple rows with `id` ending in `a`, `b`, `c` etc. (e.g. `2026-05-06-tw-001a`, `2026-05-06-tw-001b`, `2026-05-06-tw-001c`).
- Same `date`, ascending `time` in 1-minute increments.
- When scheduling, pass them to the Buffer MCP as a thread if the MCP supports it; otherwise schedule as separate replies pointing at the previous post's `buffer_id`.

## What NOT to do
- Do not invent media paths. If `media` references a file that doesn't exist in `assets/`, set status to `failed` with a clear note.
- Do not auto-promote `draft` to `ready`. That's a human decision.
- Do not delete rows. To kill a post, set `status = draft` and add a note explaining why.
- Do not edit `posted` rows except to correct typos in `notes`.

## FitFlow content pillars
Use these consistently in the `pillar` column so weekly previews show a balanced mix:

- `build-in-public` — architecture, pricing logic, BSP choices (Twilio vs 360dialog), the WhatsApp/Telegram story
- `problem-framing` — what's broken about existing fitness SaaS for solo & small-studio coaches
- `pricing` — flat-fee positioning, COGS transparency, Mindbody comparisons
- `product-tease` — feature glimpses, mockups, the "what it looks like" posts
- `coach-pain` — persona-driven posts about what coaches actually struggle with
- `behind-the-scenes` — building from Cornwall + Lagos, founder journey, process
- `early-access` — direct CTAs for the beta cohort
- `thought-leadership` — broader takes on B2B messaging, fitness tech, indie SaaS

A healthy week leans 50/50 between build-in-public + problem-framing/coach-pain (those compound), with one early-access CTA and one product-tease.
