# FitFlow × YMove: Exercise Integration Plan

**Scope:** End-to-end implementation of the exercise video feature — from coach slash command to video delivered in client's WhatsApp/Telegram chat.

**Stack assumptions:** Node.js backend, existing FitFlow channel abstraction layer (WhatsApp Cloud API + Telegram Bot API), PostgreSQL, Redis.

---

## Phase 1 — YMove API Layer

> Goal: A clean, safe service that wraps YMove. Nothing else in the app touches the API directly.

### 1.1 — Environment setup

Add to `.env`:

```
YMOVE_API_KEY=ym_your_key_here
YMOVE_BASE_URL=https://exercise-api.ymove.app/api/v2
```

Add to secret manager (Railway / Doppler / wherever you keep secrets). Never commit the key.

### 1.2 — YMove service module

Create `src/services/ymove.ts`.

Responsibilities:
- All HTTP calls to YMove (search, fetch by ID)
- Rate limit handling (429 → retry with backoff)
- **Never return video URLs from cache** — always fetch fresh on demand
- Strip video properties if YMove omits them (monthly cap behaviour)

```ts
// src/services/ymove.ts

const BASE = process.env.YMOVE_BASE_URL
const KEY  = process.env.YMOVE_API_KEY

export type Exercise = {
  id: string
  slug: string
  title: string
  muscleGroup: string
  equipment: string
  thumbnailUrl?: string       // present on search results, 48hr expiry
  videoUrl?: string           // NEVER cache — always refetch
  videoHlsUrl?: string        // NEVER cache
  videoDurationSecs?: number
  instructions?: string[]
}

async function ymoveGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-API-Key': KEY! }
  })
  if (res.status === 429) {
    const { retryAfterMs } = await res.json()
    await new Promise(r => setTimeout(r, retryAfterMs ?? 2000))
    return ymoveGet(path)
  }
  if (!res.ok) throw new Error(`YMove ${res.status}: ${path}`)
  return res.json()
}

// Search — returns list without video URLs (safe to brief-cache for picker)
export async function searchExercises(params: {
  muscleGroup?: string
  equipment?: string
  search?: string
  exerciseType?: string
  limit?: number
}): Promise<Exercise[]> {
  const q = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)])
  )
  const data = await ymoveGet<{ exercises: Exercise[] }>(`/exercises?${q}`)
  return data.exercises
}

// Fetch single exercise — includes fresh pre-signed video URLs
// Call this immediately before sending to client, never before
export async function fetchExercise(idOrSlug: string): Promise<Exercise> {
  return ymoveGet<Exercise>(`/exercises/${idOrSlug}`)
}
```

### 1.3 — Redis cache for exercise metadata

Video URLs are NOT cached. Exercise metadata (name, muscle group, instructions, thumbnail) can be cached for up to 23 hours — leaving a safe buffer under the 48hr URL window is irrelevant here since we only cache metadata not URLs.

```ts
// src/services/exerciseCache.ts
import { redis } from './redis'
import { searchExercises, fetchExercise, Exercise } from './ymove'

const TTL_SECONDS = 82800 // 23 hours

export async function getCachedSearch(key: string, fetcher: () => Promise<Exercise[]>) {
  const cached = await redis.get(`ex:search:${key}`)
  if (cached) return JSON.parse(cached) as Exercise[]
  const results = await fetcher()
  // Strip video URLs before caching
  const safe = results.map(({ videoUrl, videoHlsUrl, ...rest }) => rest)
  await redis.setex(`ex:search:${key}`, TTL_SECONDS, JSON.stringify(safe))
  return safe
}

export async function getCachedMeta(id: string) {
  const cached = await redis.get(`ex:meta:${id}`)
  if (cached) return JSON.parse(cached) as Omit<Exercise, 'videoUrl' | 'videoHlsUrl'>
  const ex = await fetchExercise(id)
  const { videoUrl, videoHlsUrl, ...meta } = ex
  await redis.setex(`ex:meta:${id}`, TTL_SECONDS, JSON.stringify(meta))
  return meta
}

// Called immediately before sending — never cached
export async function getFreshVideoUrl(id: string): Promise<{ videoUrl: string; thumbnailUrl: string }> {
  const ex = await fetchExercise(id)
  if (!ex.videoUrl) throw new Error(`No video URL for exercise ${id}`)
  return { videoUrl: ex.videoUrl, thumbnailUrl: ex.thumbnailUrl! }
}
```

---

## Phase 2 — Command Parser

> Goal: Accept messy coach input, return structured data reliably.

### 2.1 — Alias normalisation table

```ts
// src/parser/aliases.ts

export const EXERCISE_ALIASES: Record<string, string> = {
  bench: 'bench press',
  bp: 'bench press',
  ohp: 'overhead press',
  rdl: 'romanian deadlift',
  dl: 'deadlift',
  cgbp: 'close grip bench press',
  pullups: 'pull up',
  chins: 'chin up',
  pushups: 'push up',
  dips: 'dip',
  curls: 'bicep curl',
  skullcrushers: 'skull crusher',
  lunge: 'lunges',
  squat: 'squat',
  press: 'bench press',
}

export const MUSCLE_ALIASES: Record<string, string> = {
  chest: 'chest',
  pecs: 'chest',
  back: 'back',
  lats: 'back',
  traps: 'back',
  legs: 'quads',
  quads: 'quads',
  hams: 'hamstrings',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  bum: 'glutes',
  shoulders: 'shoulders',
  delts: 'shoulders',
  bis: 'biceps',
  biceps: 'biceps',
  tris: 'triceps',
  triceps: 'triceps',
  abs: 'core',
  core: 'core',
  calves: 'calves',
}

export const EQUIPMENT_ALIASES: Record<string, string> = {
  bb: 'barbell',
  db: 'dumbbell',
  dbs: 'dumbbell',
  bw: 'bodyweight',
  bodyweight: 'bodyweight',
  cable: 'cable',
  machine: 'machine',
  kb: 'kettlebell',
  kettlebell: 'kettlebell',
  band: 'band',
}
```

### 2.2 — Layer 1: Regex parser (fast path)

```ts
// src/parser/regexParser.ts
import { EXERCISE_ALIASES, MUSCLE_ALIASES, EQUIPMENT_ALIASES } from './aliases'

const COMMAND_RE = /^\/(?:exercise|ex|send|workout)\s+(.+)$/i
const SETS_REPS_RE = /(\d+)\s*[x×]\s*(\d+)/i      // 3x10, 4×8
const SETS_ONLY_RE = /(\d+)\s*sets?\s+of\s+(\d+)/i // 4 sets of 8
const INTENSITY_RE = /\b(heavy|light|moderate|easy|hard)\b/i
const EQUIPMENT_RE = /\b(barbell|dumbbell|bb|db|bw|bodyweight|cable|machine|kb|kettlebell|band)\b/i

export type ParsedCommand = {
  raw: string
  exerciseName: string | null
  muscleGroup: string | null
  equipment: string | null
  sets: number | null
  reps: number | null
  intensity: string | null
  confidence: 'high' | 'low'
}

function normalise(word: string, map: Record<string, string>) {
  return map[word.toLowerCase()] ?? word.toLowerCase()
}

export function regexParse(input: string): ParsedCommand | null {
  const match = input.match(COMMAND_RE)
  if (!match) return null

  const body = match[1]
  let working = body

  // Extract sets/reps
  let sets: number | null = null
  let reps: number | null = null
  const setsReps = working.match(SETS_REPS_RE) ?? working.match(SETS_ONLY_RE)
  if (setsReps) {
    sets = parseInt(setsReps[1])
    reps = parseInt(setsReps[2])
    working = working.replace(setsReps[0], '').trim()
  }

  // Extract intensity
  let intensity: string | null = null
  const intensityMatch = working.match(INTENSITY_RE)
  if (intensityMatch) {
    intensity = intensityMatch[1].toLowerCase()
    working = working.replace(intensityMatch[0], '').trim()
  }

  // Extract equipment
  let equipment: string | null = null
  const equipMatch = working.match(EQUIPMENT_RE)
  if (equipMatch) {
    equipment = normalise(equipMatch[1], EQUIPMENT_ALIASES)
    working = working.replace(equipMatch[0], '').trim()
  }

  // What's left is the exercise name
  const rawName = working.trim()
  if (!rawName) return null

  // Normalise exercise name
  const exerciseName = EXERCISE_ALIASES[rawName.toLowerCase()] ?? rawName.toLowerCase()

  // Infer muscle group from exercise name
  const muscleGroup = inferMuscleGroup(exerciseName)

  return {
    raw: input,
    exerciseName,
    muscleGroup,
    equipment,
    sets,
    reps,
    intensity,
    confidence: sets && reps ? 'high' : 'low'
  }
}

function inferMuscleGroup(name: string): string | null {
  const map: Array<[RegExp, string]> = [
    [/bench|chest|fly|pec/i,              'chest'],
    [/squat|quad|lunge|leg press/i,       'quads'],
    [/deadlift|row|pull|lat|back/i,       'back'],
    [/curl|bicep/i,                       'biceps'],
    [/tricep|skull|pushdown|dip/i,        'triceps'],
    [/press|delt|shoulder|lateral/i,      'shoulders'],
    [/rdl|hamstring|curl/i,               'hamstrings'],
    [/glute|hip thrust|bridge/i,          'glutes'],
    [/calf|calves/i,                      'calves'],
    [/ab|core|plank|crunch/i,             'core'],
  ]
  for (const [re, group] of map) {
    if (re.test(name)) return group
  }
  return null
}
```

### 2.3 — Layer 2: Claude fallback (Haiku, cheap)

Only called when regex returns null or confidence is low.

```ts
// src/parser/claudeParser.ts

export async function claudeParse(raw: string): Promise<ParsedCommand> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `You are a parser for a fitness coaching app. Extract exercise info from this coach message.
Return ONLY valid JSON. No markdown, no explanation.

Message: "${raw}"

{
  "exerciseName": string | null,
  "muscleGroup": "chest"|"back"|"shoulders"|"biceps"|"triceps"|"quads"|"hamstrings"|"glutes"|"calves"|"core"|"full_body" | null,
  "equipment": "barbell"|"dumbbell"|"cable"|"machine"|"bodyweight"|"kettlebell"|"band" | null,
  "sets": number | null,
  "reps": number | null,
  "intensity": "heavy"|"moderate"|"light" | null
}`
      }]
    })
  })
  const data = await res.json()
  const parsed = JSON.parse(data.content[0].text)
  return { ...parsed, raw, confidence: 'low' }
}
```

### 2.4 — Unified parser entry point

```ts
// src/parser/index.ts
import { regexParse, ParsedCommand } from './regexParser'
import { claudeParse } from './claudeParser'

export async function parseExerciseCommand(input: string): Promise<ParsedCommand | null> {
  // Layer 1
  const fast = regexParse(input)
  if (fast && fast.confidence === 'high') return fast

  // Layer 2 — Claude fallback
  try {
    return await claudeParse(input)
  } catch {
    return fast ?? null  // Return low-confidence regex result rather than nothing
  }
}
```

---

## Phase 3 — Exercise Picker Flow

> Goal: Coach picks the right exercise before it sends. No silent wrong sends.

### 3.1 — Search and present

```ts
// src/handlers/exerciseCommandHandler.ts
import { parseExerciseCommand } from '../parser'
import { getCachedSearch } from '../services/exerciseCache'
import { searchExercises } from '../services/ymove'

export async function handleExerciseCommand(coachId: string, rawInput: string) {
  const parsed = await parseExerciseCommand(rawInput)

  if (!parsed || !parsed.exerciseName) {
    return {
      type: 'error',
      message: `Couldn't parse that. Try: /exercise bench press 3x10`
    }
  }

  const cacheKey = [parsed.exerciseName, parsed.muscleGroup, parsed.equipment]
    .filter(Boolean).join('_')

  const results = await getCachedSearch(cacheKey, () =>
    searchExercises({
      search: parsed.exerciseName!,
      muscleGroup: parsed.muscleGroup ?? undefined,
      equipment: parsed.equipment ?? undefined,
      limit: 8,
    })
  )

  if (results.length === 0) {
    // Fallback: search by muscle group only
    const fallback = await searchExercises({
      muscleGroup: parsed.muscleGroup ?? undefined,
      limit: 8,
    })
    return {
      type: 'picker',
      parsed,
      exercises: fallback,
      fallback: true,
    }
  }

  if (results.length === 1) {
    // Auto-select if only one result
    return { type: 'confirm', parsed, exercise: results[0] }
  }

  return { type: 'picker', parsed, exercises: results, fallback: false }
}
```

### 3.2 — Picker UI state

Store pending exercise selection in Redis keyed to coach session. TTL 10 minutes — if they don't confirm, it expires.

```ts
// src/services/pendingExercise.ts
import { redis } from './redis'

type PendingExercise = {
  exerciseId: string
  clientIds: string[]     // who to send to
  sets: number | null
  reps: number | null
  intensity: string | null
  expiresAt: number
}

export async function setPending(coachId: string, data: PendingExercise) {
  await redis.setex(`pending:ex:${coachId}`, 600, JSON.stringify(data))
}

export async function getPending(coachId: string): Promise<PendingExercise | null> {
  const raw = await redis.get(`pending:ex:${coachId}`)
  return raw ? JSON.parse(raw) : null
}

export async function clearPending(coachId: string) {
  await redis.del(`pending:ex:${coachId}`)
}
```

---

## Phase 4 — Message Builder

> Goal: Format the exercise consistently for WhatsApp and Telegram.

### 4.1 — Format helpers

```ts
// src/services/messageBuilder.ts
import { getFreshVideoUrl } from './exerciseCache'
import { getCachedMeta } from './exerciseCache'

type ExerciseMessageParams = {
  exerciseId: string
  sets: number | null
  reps: number | null
  intensity: string | null
  channel: 'whatsapp' | 'telegram'
}

export async function buildExerciseMessage(params: ExerciseMessageParams) {
  const { exerciseId, sets, reps, intensity, channel } = params

  // Meta from cache (no video URLs)
  const meta = await getCachedMeta(exerciseId)

  // Fresh video URLs — fetched now, used immediately
  const { videoUrl, thumbnailUrl } = await getFreshVideoUrl(exerciseId)

  const caption = formatCaption({ meta, sets, reps, intensity })

  return { videoUrl, thumbnailUrl, caption, meta }
}

function formatCaption({ meta, sets, reps, intensity }: {
  meta: any
  sets: number | null
  reps: number | null
  intensity: string | null
}) {
  const lines = [`*${meta.title}*`]
  if (meta.muscleGroup) lines.push(`💪 ${capitalise(meta.muscleGroup)}`)
  if (sets && reps) lines.push(`📋 ${sets} × ${reps} reps`)
  else if (sets) lines.push(`📋 ${sets} sets`)
  if (intensity) lines.push(`⚡ ${capitalise(intensity)}`)
  if (meta.instructions?.[0]) lines.push(`\n${meta.instructions[0]}`)
  return lines.join('\n')
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
```

### 4.2 — Channel delivery

```ts
// src/services/delivery.ts
import { buildExerciseMessage } from './messageBuilder'

export async function sendExerciseToClient(params: {
  exerciseId: string
  sets: number | null
  reps: number | null
  intensity: string | null
  clientId: string
  channel: 'whatsapp' | 'telegram'
  channelClientId: string   // WhatsApp number or Telegram chat ID
}) {
  const { videoUrl, caption } = await buildExerciseMessage({
    exerciseId: params.exerciseId,
    sets: params.sets,
    reps: params.reps,
    intensity: params.intensity,
    channel: params.channel,
  })

  if (params.channel === 'whatsapp') {
    await sendWhatsAppVideo({
      to: params.channelClientId,
      videoUrl,
      caption,
    })
  } else {
    await sendTelegramVideo({
      chatId: params.channelClientId,
      videoUrl,
      caption,
    })
  }
}

async function sendWhatsAppVideo({ to, videoUrl, caption }: {
  to: string
  videoUrl: string
  caption: string
}) {
  await fetch(`https://graph.facebook.com/v18.0/${process.env.WA_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'video',
      video: { link: videoUrl, caption },
    }),
  })
}

async function sendTelegramVideo({ chatId, videoUrl, caption }: {
  chatId: string
  videoUrl: string
  caption: string
}) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendVideo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      video: videoUrl,
      caption,
      parse_mode: 'Markdown',
    }),
  })
}
```

---

## Phase 5 — End-to-End Handler

Wire everything together into the command router.

```ts
// src/handlers/coachCommandRouter.ts
import { handleExerciseCommand } from './exerciseCommandHandler'
import { setPending, getPending, clearPending } from '../services/pendingExercise'
import { sendExerciseToClient } from '../services/delivery'

export async function routeCoachCommand(coachId: string, input: string, context: {
  clientIds: string[]
  channel: 'whatsapp' | 'telegram'
  channelClientIds: Record<string, string>
}) {
  const trimmed = input.trim()

  // Handle picker confirmation
  if (/^(yes|send|confirm|ok|go)$/i.test(trimmed)) {
    const pending = await getPending(coachId)
    if (!pending) return { message: 'Nothing pending to send.' }

    for (const clientId of pending.clientIds) {
      await sendExerciseToClient({
        exerciseId: pending.exerciseId,
        sets: pending.sets,
        reps: pending.reps,
        intensity: pending.intensity,
        clientId,
        channel: context.channel,
        channelClientId: context.channelClientIds[clientId],
      })
    }
    await clearPending(coachId)
    return { message: `Sent to ${pending.clientIds.length} client(s) ✓` }
  }

  // Handle exercise commands
  if (/^\/(?:exercise|ex|send|workout)\b/i.test(trimmed)) {
    const result = await handleExerciseCommand(coachId, trimmed)

    if (result.type === 'error') {
      return { message: result.message }
    }

    if (result.type === 'confirm') {
      // Single result — store pending, ask coach to confirm
      await setPending(coachId, {
        exerciseId: result.exercise.id,
        clientIds: context.clientIds,
        sets: result.parsed.sets,
        reps: result.parsed.reps,
        intensity: result.parsed.intensity,
        expiresAt: Date.now() + 600_000,
      })
      return {
        type: 'confirm',
        exercise: result.exercise,
        parsed: result.parsed,
        message: `Found: *${result.exercise.title}*. Send ${result.parsed.sets}×${result.parsed.reps}? Reply "yes" to send.`
      }
    }

    if (result.type === 'picker') {
      return {
        type: 'picker',
        exercises: result.exercises,
        parsed: result.parsed,
        fallback: result.fallback,
      }
    }
  }

  return null  // Not a recognised command — pass through to normal message handling
}
```

---

## Phase 6 — Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| YMove returns 429 | Auto-retry with `retryAfterMs` backoff in `ymoveGet` |
| Monthly exercise cap hit | Video properties absent from response — `getFreshVideoUrl` throws, surface error to coach |
| Video URL expired at send time | WhatsApp/Telegram returns 4xx on the URL → catch, refetch from YMove, retry once |
| Regex parse fails, Claude fallback also fails | Return last known low-confidence regex result or polite error |
| Coach doesn't confirm within 10 min | Redis TTL expires pending state silently |
| YMove search returns 0 results | Fallback to muscle group search, show picker with label "Closest matches for [muscle group]" |
| Coach sends to multiple clients | Loop `sendExerciseToClient` — if one fails, log and continue, report partial success |

### Retry on expired video URL

```ts
export async function sendWithRetry(params: Parameters<typeof sendExerciseToClient>[0]) {
  try {
    await sendExerciseToClient(params)
  } catch (err: any) {
    if (err?.message?.includes('expired') || err?.status === 403) {
      // Force fresh fetch by clearing any cached meta that might have stale URL
      await sendExerciseToClient(params)  // getFreshVideoUrl always re-fetches
    } else {
      throw err
    }
  }
}
```

---

## Phase 7 — YMove Plan Selection

| Clients | Exercises/day | Estimated plays/month | Recommended plan |
|---|---|---|---|
| < 20 | ~5 | < 3,000 | Starter ($19/mo) — watermarked ok for MVP |
| 20–100 | ~10 | 3,000–30,000 | Pro ($29/mo) — unwatermarked |
| 100–500 | ~15 | 30,000–150,000 | Scale ($79/mo) |
| 500+ | — | — | Enterprise ($299/mo) |

**Upgrade trigger:** Monitor `/usage` endpoint. When `monthlyVideoMinutes` hits 80% of plan limit, alert and prompt upgrade. Build this check into a daily cron.

```ts
// src/cron/checkYMoveUsage.ts
export async function checkYMoveUsage() {
  const res = await fetch(`${process.env.YMOVE_BASE_URL}/usage`, {
    headers: { 'X-API-Key': process.env.YMOVE_API_KEY! }
  })
  const { monthlyVideoMinutesUsed, monthlyVideoMinuteLimit } = await res.json()
  const pct = monthlyVideoMinutesUsed / monthlyVideoMinuteLimit

  if (pct >= 0.8) {
    // Notify via your internal alerting (Slack, email, etc.)
    console.warn(`YMove usage at ${Math.round(pct * 100)}% — consider upgrading`)
  }
}
```

---

## Execution Order

1. **Phase 1** — YMove service + cache layer. Get the API working in isolation before touching any UI or parsing.
2. **Phase 2** — Parser module with test suite. Test 20+ real coach inputs against the regex + Claude fallback.
3. **Phase 4** — Message builder. Test WhatsApp and Telegram sends with hardcoded exercise IDs.
4. **Phase 3** — Picker flow. Wire search → picker UI → pending state.
5. **Phase 5** — End-to-end handler. Connect the full command router into the existing FitFlow message pipeline.
6. **Phase 6** — Error handling pass. Go through every edge case in the table.
7. **Phase 7** — Usage monitoring cron. Add before any real coach onboarding.

---

## Open Questions Before Starting

- **Picker UI surface:** Where does the coach pick an exercise — FitFlow web dashboard, their own WhatsApp thread with a bot, or both? The picker logic is the same but the UI rendering differs significantly.
- **Multi-client sends:** Does `/exercise` always send to all of a coach's active clients, or should coaches be able to target specific clients?
- **Watermark tolerance:** On Starter ($19/mo), videos are watermarked. Is that acceptable for internal MVP testing, or go straight to Pro?
- **Instruction text:** YMove returns step-by-step instructions per exercise. Include in the message caption, or keep caption minimal and rely on the video?
