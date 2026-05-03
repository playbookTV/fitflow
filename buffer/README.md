# FitFlow Social Calendar — Buffer + Claude Code

A simple, file-based content calendar that Claude Code feeds to Buffer via the Buffer MCP.

## How it works

1. You edit `calendar.csv` (any spreadsheet app, or a text editor).
2. You set rows you want to ship to `status: ready`.
3. From inside this folder, in Claude Code, you say something like
   *"Schedule the ready posts in calendar.csv to Buffer."*
4. Claude reads the CSV, calls the Buffer MCP for each `ready` row, writes back the Buffer post ID, and flips the status to `scheduled`.

That's it. The CSV is the single source of truth. `CLAUDE.md` tells Claude Code the rules of the system so you don't have to re-explain.

## Folder

```
social-calendar/
├── calendar.csv      ← The calendar. Edit this.
├── CLAUDE.md         ← Project rules Claude Code reads automatically.
├── README.md         ← This file.
└── assets/           ← Images and video for posts (referenced by `media` column).
```

## CSV schema

| Column | Required | Notes |
|--------|----------|-------|
| `id` | yes | Unique. Convention: `YYYY-MM-DD-{tw\|ig}-NNN`. Threads use suffix `a`, `b`, `c`. |
| `date` | yes | `YYYY-MM-DD` |
| `time` | yes | `HH:MM` 24h, Europe/London |
| `channel` | yes | `twitter` or `instagram` |
| `brand` | yes | `FitFlow` (kept for future-proofing if you add other brands) |
| `pillar` | recommended | Content theme — see `CLAUDE.md` for the working set |
| `status` | yes | `draft` → `ready` → `scheduled` → `posted` (or `failed`) |
| `copy` | yes | Post text. Use proper CSV escaping for commas/quotes. |
| `media` | IG-required | Path relative to this folder, or full URL |
| `alt_text` | recommended | Accessibility text for image (Instagram) |
| `link` | optional | URL to attach |
| `first_comment` | optional | First comment text — typically Instagram hashtags |
| `buffer_id` | auto | Filled by Claude after scheduling |
| `notes` | optional | Private; never sent to Buffer |

## Common Claude Code prompts

- *"Schedule the ready posts in calendar.csv to Buffer."*
- *"Show me a draft preview of next week's calendar grouped by channel."*
- *"For each Instagram row missing alt_text, draft alt text and put it in the column."*
- *"Add 4 build-in-public draft rows for next week — Tue/Thu mornings, alternating Twitter and IG."*
- *"Anything in scheduled state for tomorrow — give me a final review before it goes out."*
- *"Audit this week's draft posts: copy length, missing media, pillar balance."*

## Channel notes

**Twitter (X)**
- 280 char hard limit on `copy`.
- Threads: use multiple rows with the same `id` prefix and `a`/`b`/`c` suffixes (see `CLAUDE.md`).
- Hashtags inline in `copy`; keep to 1–2.

**Instagram**
- `media` is required (image or video).
- `alt_text` strongly recommended.
- Hashtags: prefer `first_comment` over `copy` for cleaner posts.
- Caption (`copy`) up to 2,200 chars; first ~125 chars are what shows in feed before truncation.

## Two reminders

1. The 12 example rows are **examples** — all `status: draft` and flagged in `notes`. Replace before flipping anything to `ready`.
2. Drop your media into `assets/` and reference it relatively (e.g. `assets/whatsapp-mockup.png`). Claude will refuse to schedule a post pointing at a file that doesn't exist.
