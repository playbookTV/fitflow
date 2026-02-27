import { useState, useEffect } from "react";

const C = {
  bg: "#08090a",
  surface: "#111214",
  card: "#161819",
  border: "#222426",
  borderHover: "#333537",
  text: "#e4e2df",
  textDim: "#93918e",
  textFaint: "#5c5a58",
  green: "#25D366",
  greenDim: "rgba(37,211,102,0.10)",
  greenBorder: "rgba(37,211,102,0.25)",
  blue: "#4E97F8",
  blueDim: "rgba(78,151,248,0.10)",
  blueBorder: "rgba(78,151,248,0.25)",
  orange: "#F0853A",
  orangeDim: "rgba(240,133,58,0.10)",
  orangeBorder: "rgba(240,133,58,0.25)",
  violet: "#9D7CF4",
  violetDim: "rgba(157,124,244,0.10)",
  violetBorder: "rgba(157,124,244,0.25)",
  red: "#EF5350",
  redDim: "rgba(239,83,80,0.10)",
  cyan: "#26C6DA",
  cyanDim: "rgba(38,198,218,0.10)",
  cyanBorder: "rgba(38,198,218,0.25)",
};

const fonts = {
  display: "'Playfair Display', Georgia, serif",
  mono: "'IBM Plex Mono', 'Menlo', monospace",
  body: "'DM Sans', 'Helvetica Neue', sans-serif",
};

// ── Section Components ──

function SectionHeader({ number, title, subtitle, color }) {
  return (
    <div style={{ marginBottom: "24px", paddingTop: "12px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "6px" }}>
        <span style={{ fontFamily: fonts.mono, fontSize: "12px", fontWeight: 600, color: color || C.textFaint, letterSpacing: "1px" }}>
          {number}
        </span>
        <h2 style={{ fontFamily: fonts.display, fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 600, color: C.text, margin: 0, lineHeight: 1.2 }}>
          {title}
        </h2>
      </div>
      {subtitle && (
        <p style={{ fontFamily: fonts.body, fontSize: "13.5px", color: C.textDim, margin: 0, lineHeight: 1.6, maxWidth: "560px", marginLeft: "40px" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function InfoCard({ title, children, color = C.green, accent = C.greenDim, borderColor = C.greenBorder, style: extraStyle }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px",
      padding: "18px 20px", marginBottom: "12px", borderLeft: `3px solid ${color}`, ...extraStyle,
    }}>
      {title && (
        <div style={{ fontFamily: fonts.mono, fontSize: "12px", fontWeight: 600, color, letterSpacing: "0.5px", marginBottom: "10px" }}>
          {title}
        </div>
      )}
      <div style={{ fontFamily: fonts.body, fontSize: "13px", color: C.textDim, lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
  );
}

function Tag({ children, color = C.green, bg = C.greenDim }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: "4px", fontSize: "11px",
      fontFamily: fonts.mono, fontWeight: 600, color, background: bg, marginRight: "6px", marginBottom: "4px",
    }}>
      {children}
    </span>
  );
}

function Stat({ value, label, color = C.text }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontFamily: fonts.mono, fontSize: "22px", fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: fonts.body, fontSize: "11px", color: C.textDim, marginTop: "4px" }}>{label}</div>
    </div>
  );
}

function PersonaCard({ persona, isActive, onClick }) {
  const fitColors = {
    "🔥": C.green,
    "🚀": C.blue,
    "⚠️": C.orange,
    "❌": C.red,
  };
  const fitColor = fitColors[persona.fitIcon] || C.textDim;

  return (
    <div onClick={onClick} style={{
      background: isActive ? C.card : C.surface, border: `1px solid ${isActive ? C.borderHover : C.border}`,
      borderRadius: "10px", padding: "16px 18px", cursor: "pointer", transition: "all 0.2s", marginBottom: "8px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: fonts.mono, fontSize: "13px", fontWeight: 700, color: C.text, marginBottom: "3px" }}>
            {persona.name}
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: "12px", color: C.textDim }}>{persona.tagline}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <Tag color={fitColor} bg={fitColor + "18"}>{persona.fit}</Tag>
          <span style={{ fontFamily: fonts.mono, fontSize: "11px", color: C.orange }}>{persona.wtp}</span>
        </div>
      </div>

      {isActive && (
        <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
            <div>
              <div style={{ fontFamily: fonts.mono, fontSize: "10px", color: C.textFaint, letterSpacing: "1px", marginBottom: "4px" }}>CLIENTS</div>
              <div style={{ fontFamily: fonts.mono, fontSize: "13px", color: C.text }}>{persona.clients}</div>
            </div>
            <div>
              <div style={{ fontFamily: fonts.mono, fontSize: "10px", color: C.textFaint, letterSpacing: "1px", marginBottom: "4px" }}>REVENUE</div>
              <div style={{ fontFamily: fonts.mono, fontSize: "13px", color: C.text }}>{persona.revenue}</div>
            </div>
          </div>
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontFamily: fonts.mono, fontSize: "10px", color: C.textFaint, letterSpacing: "1px", marginBottom: "6px" }}>CURRENT STACK</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {persona.stack.map((s, i) => <Tag key={i} color={C.textDim} bg={C.surface}>{s}</Tag>)}
            </div>
          </div>
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontFamily: fonts.mono, fontSize: "10px", color: C.textFaint, letterSpacing: "1px", marginBottom: "6px" }}>TOP PAINS</div>
            {persona.pains.map((p, i) => (
              <div key={i} style={{ fontFamily: fonts.body, fontSize: "12px", color: C.textDim, lineHeight: 1.5, paddingLeft: "10px", borderLeft: `2px solid ${C.border}`, marginBottom: "6px" }}>{p}</div>
            ))}
          </div>
          <div style={{ background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: "6px", padding: "10px 12px" }}>
            <div style={{ fontFamily: fonts.mono, fontSize: "10px", color: C.green, letterSpacing: "1px", marginBottom: "4px" }}>CORE JTBD</div>
            <div style={{ fontFamily: fonts.display, fontSize: "14px", color: C.text, fontStyle: "italic", lineHeight: 1.4 }}>
              "{persona.jtbd}"
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Data ──

const personas = [
  {
    name: "Online Influencer Coach", tagline: "High visibility, chaotic backend", fitIcon: "🔥", fit: "PRIMARY TARGET",
    wtp: "£20–80/mo", clients: "20–200+", revenue: "£3k–30k/mo",
    stack: ["Instagram DMs", "WhatsApp", "Google Forms", "Sheets", "Canva PDFs", "Stripe"],
    pains: ["Losing track of client conversations at scale", "Manual onboarding for every new client", "Progress photos scattered across chats", "Admin overhead killing coaching time"],
    jtbd: "Help me scale coaching without losing the personal touch my brand is built on.",
  },
  {
    name: "High-Ticket Transformation Coach", tagline: "Premium service, white-glove delivery", fitIcon: "🚀", fit: "HIGH VALUE",
    wtp: "£30–100/mo", clients: "10–25", revenue: "£3k–15k/mo",
    stack: ["WhatsApp voice notes", "Loom videos", "Google Drive", "Notion", "Stripe"],
    pains: ["Client experience consistency across high-paying roster", "Time spent on manual video/voice feedback", "Brand perception needs premium tooling", "Reporting lacks professionalism"],
    jtbd: "Help me deliver a premium, structured coaching experience that matches my pricing.",
  },
  {
    name: "Hybrid Gym PT", tagline: "In-person + online, split attention", fitIcon: "⚠️", fit: "GOOD FIT",
    wtp: "£15–40/mo", clients: "10–40", revenue: "£2k–6k/mo",
    stack: ["In-person sessions", "WhatsApp", "Excel/Sheets", "Trainerize (partial)", "Paper notes"],
    pains: ["Managing in-person and remote clients in different systems", "Scheduling + tracking in separate places", "No unified client profile", "Admin eats into coaching hours"],
    jtbd: "Help me manage all clients — online and offline — in one place.",
  },
  {
    name: "Solo Online Coach", tagline: "Reddit archetype, scrappy operator", fitIcon: "⚠️", fit: "VOLUME PLAY",
    wtp: "£8–25/mo", clients: "5–30", revenue: "£500–4k/mo",
    stack: ["WhatsApp", "Sheets", "Notes app", "PayPal", "Bank transfer"],
    pains: ["Disorganized client data everywhere", "Manual weekly reminders", "Spreadsheet fatigue past 15 clients", "Feeling unprofessional vs bigger coaches"],
    jtbd: "Help me run coaching like a proper business without complexity.",
  },
  {
    name: "Beginner Side-Hustle Coach", tagline: "Experimental, pre-revenue", fitIcon: "❌", fit: "AVOID",
    wtp: "£0–10/mo", clients: "<10", revenue: "<£500/mo",
    stack: ["WhatsApp only", "Free tools", "Manual everything"],
    pains: ["Disorganization", "But not enough pain to pay for software"],
    jtbd: "Help me start coaching without investment.",
  },
];

const architectureLayers = [
  {
    id: "client", title: "Client Layer", subtitle: "Zero friction — clients stay in WhatsApp + Instagram",
    color: C.green, dimColor: C.greenDim, borderColor: C.greenBorder,
    components: [
      { name: "WhatsApp Chat Interface", desc: "The primary coaching experience. Workout plans, check-ins, payments, progress logs — all inside the chat they already use daily. The core delivery channel.", tech: "WhatsApp Cloud API" },
      { name: "WhatsApp Flows", desc: "Interactive multi-screen forms for structured data collection: weekly check-ins (weight, energy, sleep, photos), workout logging (weights, RPE, notes), and feedback surveys. Feels like a mini-app, native to WhatsApp.", tech: "JSON-defined screens → buttons, dropdowns, date pickers, text inputs" },
      { name: "Instagram DM Interface", desc: "Lead capture + early-stage coaching. Keyword-triggered auto-replies on Reels/Stories comments ('DM me SHRED for my free plan'). Automated onboarding sequences. Story reply engagement. Converts IG followers → WhatsApp clients.", tech: "Instagram Messaging API (Graph API) → webhooks + quick replies" },
      { name: "Rich Media Delivery", desc: "Workout demo videos, branded PDF plans, progress photo requests, interactive reply buttons ('Done ✓' / 'Skipped' / 'Modified'). Works across both WhatsApp and IG DMs with channel-appropriate formatting.", tech: "WhatsApp media messages + IG media attachments + interactive templates" },
    ],
  },
  {
    id: "messaging", title: "Messaging & Automation Layer", subtitle: "Unified Meta API (WhatsApp + IG) + scheduling engine",
    color: C.cyan, dimColor: C.cyanDim, borderColor: C.cyanBorder,
    components: [
      { name: "Meta Cloud API Direct (WhatsApp)", desc: "Direct integration with Meta's WhatsApp Cloud API — zero BSP middleman, zero per-message markup. Handles template submission, message sending, media uploads, and Flow delivery through Meta's Graph API.", tech: "Meta Graph API v21+ → REST + webhooks" },
      { name: "Instagram Messaging API", desc: "Same Meta Graph API infrastructure. Receives DMs, Story replies, and comment triggers via webhooks. Sends automated replies, quick reply buttons, and media. Shares the same app credentials and webhook endpoint as WhatsApp — unified Meta integration.", tech: "Instagram Graph API → Messenger Platform + webhooks" },
      { name: "Channel Router", desc: "Unified inbound message handler. Determines source channel (WhatsApp vs IG), maps to correct client record, routes to appropriate response logic. Maintains single conversation thread per client across channels in the CRM.", tech: "Event bus + channel detection middleware" },
      { name: "Automation Engine", desc: "Scheduled triggers: morning workout delivery (7AM client timezone), weekly check-in reminders, payment due notices, re-engagement for inactive clients. IG-specific: comment-to-DM triggers, Story reply sequences, keyword-based lead funnels. Respects per-channel rate limits and 24-hour window constraints.", tech: "Node.js + BullMQ job queue + timezone-aware cron + rate limiter" },
      { name: "Webhook Processor", desc: "Single webhook endpoint receives events from both WhatsApp and IG. Handles inbound messages, Flow completions, delivery statuses, read receipts, IG comment triggers, Story mentions, and payment confirmations. Idempotent processing for reliability.", tech: "Express.js webhook endpoints + event bus + dead letter queue" },
    ],
  },
  {
    id: "core", title: "Core Application Layer", subtitle: "The brain — trainer dashboard + business logic",
    color: C.orange, dimColor: C.orangeDim, borderColor: C.orangeBorder,
    components: [
      { name: "Workout Plan Builder", desc: "Trainer creates plans in dashboard → system auto-converts to WhatsApp Flow JSON + rich message sequences. Exercise library with demo videos. Template system for reusable programs.", tech: "React dashboard + REST API + Flow JSON generator" },
      { name: "Progress Tracker", desc: "Aggregates all check-in data from WhatsApp Flows into visual dashboards: weight trends, lift progressions, compliance rates, photo timelines. The 'Google Sheets killer' module.", tech: "PostgreSQL time-series + Chart.js/Recharts" },
      { name: "Client CRM", desc: "Client profiles with unified conversation history across WhatsApp + IG DMs. Trainer notes, goals, program assignments, adherence scores. Source channel tracking (where did this lead come from — IG Story? WhatsApp referral?). Designed to feel like a 'coach's notebook' not Salesforce.", tech: "PostgreSQL + Redis cache + full-text search" },
      { name: "Payment Engine", desc: "Generates Stripe payment links sent in-chat. Handles recurring billing, package management, failed payment retries, and auto-renewal reminders. Trainer gets their own Stripe Connect account.", tech: "Stripe Connect + webhooks + invoice generation" },
      { name: "Onboarding Automator", desc: "Payment received → client record created → intake Flow sent via WhatsApp → responses populate CRM → workout plan assigned → first session scheduled. Eliminates 20-min manual process per client.", tech: "State machine + event-driven pipeline" },
    ],
  },
  {
    id: "infra", title: "Infrastructure Layer", subtitle: "Reliable, scalable, cost-effective for indie dev",
    color: C.violet, dimColor: C.violetDim, borderColor: C.violetBorder,
    components: [
      { name: "Database (Supabase)", desc: "Client data, workout logs, check-in history, payment records, conversation metadata. Row-level security ensures trainer A never sees trainer B's clients. Why Supabase: auth + RLS + realtime + storage in one platform.", tech: "PostgreSQL + Row Level Security + Prisma ORM" },
      { name: "File Storage", desc: "Progress photos, workout PDFs, exercise demo videos. Served via CDN with signed URLs for privacy. Auto-cleanup of expired media.", tech: "Supabase Storage / Cloudflare R2 + CDN" },
      { name: "Hosting", desc: "Dashboard on Vercel (SSR + edge). API + webhook workers on Railway/Fly.io (needs persistent connections for job queues). Auto-scaling for Monday morning message bursts.", tech: "Vercel (frontend) + Railway (API + BullMQ workers)" },
    ],
  },
];

const jtbdJobs = [
  { num: "01", title: "Manage multiple clients without mental overload", subjobs: ["See all client statuses at a glance", "Track adherence quickly", "Auto-remember check-in schedules", "Surface struggling clients automatically"], driver: "Anxiety reduction + professionalism", color: C.green },
  { num: "02", title: "Deliver coaching that feels personal but scalable", subjobs: ["Send workouts fast", "Give feedback asynchronously", "Maintain human connection", "Avoid robotic app experience"], driver: "Coaches fear losing intimacy if things get 'appified'", color: C.blue },
  { num: "03", title: "Look professional without becoming admin-heavy", subjobs: ["Clean client dashboards", "Structured progress reports", "Branded experience", "Organized data vs messy chat threads"], driver: "Critical for coaches selling premium packages (£200+/mo)", color: C.orange },
  { num: "04", title: "Get paid and retain clients with less friction", subjobs: ["Subscription management", "Renewal reminders", "Client lifecycle tracking", "Automated offboarding"], driver: "Currently 100% manual labour", color: C.violet },
  { num: "05", title: "Replace the 6-tool stack with ONE system", subjobs: ["WhatsApp → coaching delivery", "Instagram → lead gen + onboarding", "Sheets → tracking", "Stripe → payments", "Notion/PDF → programs", "Drive → media"], driver: "This fragmentation IS the market gap", color: C.cyan },
];

const costRows = [
  { item: "Meta Cloud API (20 clients)", cost: "$5–15", note: "Direct to Meta — zero BSP markup, most messages free" },
  { item: "Supabase Pro", cost: "$25", note: "Database + storage + auth + realtime" },
  { item: "Vercel + Railway", cost: "$25", note: "Dashboard + API + workers" },
  { item: "Stripe fees", cost: "2.9%+30¢", note: "Per payment — passed through" },
  { item: "Total platform cost", cost: "~$55–65/mo", note: "Breakeven at just 2 trainers" },
];

const revenueScenarios = [
  { trainers: 10, mrr: "$450", status: "Ramen profitable", color: C.textDim },
  { trainers: 50, mrr: "$2,250", status: "Solid side income", color: C.orange },
  { trainers: 200, mrr: "$9,000", status: "Full-time indie SaaS", color: C.blue },
  { trainers: 500, mrr: "$22,500", status: "$270K ARR", color: C.green },
];

const mvpTimeline = [
  { week: "Week 1–2", tasks: "Trainer auth + client management + basic workout plan builder", priority: "P0", color: C.green },
  { week: "Week 2–3", tasks: "Meta Cloud API direct integration (WhatsApp) + template approval + workout delivery", priority: "P0", color: C.green },
  { week: "Week 3–4", tasks: "WhatsApp Flows: weekly check-in + workout logging", priority: "P0", color: C.green },
  { week: "Week 4–5", tasks: "Stripe Connect + in-chat payment links + invoice tracking", priority: "P1", color: C.orange },
  { week: "Week 5–6", tasks: "Progress dashboard + charts + automated reminders", priority: "P1", color: C.orange },
  { week: "Phase 2", tasks: "Instagram Messaging API: keyword DM triggers, comment-to-DM automation, lead qualification sequences, WhatsApp handoff flow", priority: "P1.5", color: C.blue },
  { week: "Phase 3", tasks: "Unified cross-channel inbox, nutrition plans, video library, multi-trainer orgs, trainer mobile app", priority: "P2", color: C.textDim },
];

const competitorGaps = [
  { name: "Trainerize", gap: "Forces clients into a separate app. Coaches still use WhatsApp for real check-ins.", angle: "We keep clients in WhatsApp + IG" },
  { name: "TrueCoach", gap: "Good workout delivery, but no native messaging integration. Clients must log into portal.", angle: "Zero client onboarding friction" },
  { name: "My PT Hub", gap: "Bloated feature set. Coaches use 20% of features, pay for 100%.", angle: "Three things done exceptionally well" },
  { name: "ManyChat / CreatorFlow", gap: "IG DM automation only. No workout delivery, no progress tracking, no client CRM, no WhatsApp coaching layer. Marketing tool, not coaching tool.", angle: "Full coaching CRM, not just lead gen" },
  { name: "Google Sheets", gap: "Free and flexible but no automation, no visuals, breaks past 20 clients.", angle: "Automated Sheets replacement with WhatsApp + IG input" },
  { name: "WhatsApp + IG (raw)", gap: "Where coaching actually happens — but two separate inboxes, zero structure, no tracking, no payments, leads lost between channels.", angle: "Unified inbox with structure behind it" },
];

// ── Navigation ──

const sections = [
  { id: "overview", label: "Overview" },
  { id: "insight", label: "Market Insight" },
  { id: "personas", label: "Personas" },
  { id: "jtbd", label: "JTBD Map" },
  { id: "architecture", label: "Architecture" },
  { id: "competitive", label: "Competitive" },
  { id: "economics", label: "Economics" },
  { id: "roadmap", label: "Roadmap" },
  { id: "risks", label: "Risks" },
  { id: "decision", label: "Go/No-Go" },
];

// ── Main App ──

export default function FitFlowBrief() {
  const [activeSection, setActiveSection] = useState("overview");
  const [activePersona, setActivePersona] = useState(0);
  const [activeLayer, setActiveLayer] = useState("client");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", color: C.text, fontFamily: fonts.body,
      opacity: mounted ? 1 : 0, transition: "opacity 0.4s ease",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── Header ── */}
      <div style={{ padding: "32px 20px 24px", maxWidth: "700px", margin: "0 auto", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: `linear-gradient(135deg, ${C.green}, #1a9e4a)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 800, color: "#000", fontFamily: fonts.mono }}>F</div>
          <div>
            <span style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: "13px", color: C.textDim, letterSpacing: "2px" }}>FITFLOW</span>
            <span style={{ fontFamily: fonts.mono, fontSize: "11px", color: C.textFaint, marginLeft: "10px" }}>PRODUCT BRIEF v1.0</span>
          </div>
        </div>
        <h1 style={{ fontFamily: fonts.display, fontSize: "clamp(26px, 5vw, 36px)", fontWeight: 600, lineHeight: 1.15, margin: "0 0 10px 0" }}>
          WhatsApp + Instagram<br />
          <span style={{ color: C.green }}>Trainer CRM</span>
        </h1>
        <p style={{ fontFamily: fonts.body, fontSize: "14px", color: C.textDim, lineHeight: 1.6, margin: 0, maxWidth: "520px" }}>
          Complete product research brief — market insights, persona matrix, technical architecture, competitive analysis, cost model, and strategic recommendations. WhatsApp for coaching delivery, Instagram for lead gen. Built to be reopened in Q3 without losing context.
        </p>
        <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
          <Tag color={C.textDim} bg={C.surface}>Research Phase</Tag>
          <Tag color={C.green} bg={C.greenDim}>Feb 2026</Tag>
          <Tag color={C.textDim} bg={C.surface}>Leslie / Ovalay Studios</Tag>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: C.bg, borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 20px", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "flex", gap: "0px", minWidth: "max-content" }}>
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                padding: "12px 14px", border: "none", background: "none", cursor: "pointer",
                fontFamily: fonts.mono, fontSize: "11px", fontWeight: 600, letterSpacing: "0.3px",
                color: activeSection === s.id ? C.green : C.textFaint,
                borderBottom: activeSection === s.id ? `2px solid ${C.green}` : "2px solid transparent",
                transition: "all 0.15s", whiteSpace: "nowrap",
              }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "28px 20px 60px" }}>

        {/* OVERVIEW */}
        {activeSection === "overview" && (
          <div>
            <SectionHeader number="00" title="Executive Summary" subtitle="The 30-second version for future-you opening this doc in 6 months." color={C.green} />

            <InfoCard title="THE PROBLEM" color={C.orange} accent={C.orangeDim} borderColor={C.orangeBorder}>
              <span style={{ color: C.text }}>Personal trainers run their entire business across 5–6 disconnected tools</span> — WhatsApp + Instagram DMs for communication, Google Sheets for tracking, Stripe/Venmo for payments, Canva for program delivery, Drive for media. Every "fitness app" (Trainerize, TrueCoach) is built for the end user, not the trainer running a business. And critically: coaches who pay for these apps <span style={{ color: C.text }}>still default to WhatsApp and IG DMs for real coaching interactions.</span>
            </InfoCard>

            <InfoCard title="THE INSIGHT" color={C.green} accent={C.greenDim} borderColor={C.greenBorder}>
              <span style={{ color: C.text }}>Messaging is not a feature for coaches. Messaging IS the product experience.</span> Coaches won't leave WhatsApp or Instagram DMs. The winning product doesn't replace these channels — it unifies them. A thin structural layer that makes messaging-based coaching scalable and professional across both channels, while the client never knows a "platform" exists.
            </InfoCard>

            <InfoCard title="THE PRODUCT" color={C.blue} accent={C.blueDim} borderColor={C.blueBorder}>
              <span style={{ color: C.text }}>FitFlow: a WhatsApp + Instagram native trainer CRM.</span> Trainer gets a unified dashboard (plan builder, progress tracker, billing, cross-channel inbox). Existing clients get WhatsApp — workout delivery via interactive Flows, check-in forms, payment links. New leads from IG get automated DM sequences, keyword-triggered onboarding, and seamless handoff to WhatsApp. Zero app downloads. Zero onboarding friction for clients.
            </InfoCard>

            <InfoCard title="THE TARGET" color={C.violet} accent={C.violetDim} borderColor={C.violetBorder}>
              <span style={{ color: C.text }}>Online coaches managing 15–100+ clients.</span> Two primary personas: (1) Influencer coaches with high visibility but chaotic backends, (2) High-ticket transformation coaches who need premium delivery. Both have strong willingness to pay (£20–100/mo) and acute scaling pain.
            </InfoCard>

            <div style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
              {[
                { value: "$45", label: "Target price/mo" },
                { value: "2", label: "Trainers to breakeven" },
                { value: "4–6wk", label: "MVP timeline" },
                { value: "$270K", label: "ARR at 500 trainers" },
              ].map((s, i) => (
                <div key={i} style={{ flex: "1 1 140px", background: C.card, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ fontFamily: fonts.mono, fontSize: "20px", fontWeight: 700, color: C.green }}>{s.value}</div>
                  <div style={{ fontFamily: fonts.body, fontSize: "11px", color: C.textDim, marginTop: "3px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MARKET INSIGHT */}
        {activeSection === "insight" && (
          <div>
            <SectionHeader number="01" title="Market Insight" subtitle="What coaches actually do vs. what SaaS founders assume they do." color={C.blue} />

            {[
              { title: "COMMUNICATION — Where coaching actually happens", color: C.green, content: (
                <>
                  <p style={{ color: C.text, marginBottom: "8px" }}>Most independent coaches run their entire communication layer through WhatsApp, Instagram DMs, and email.</p>
                  <p>Repeatedly observed patterns: "weekly check-ins via WhatsApp," "clients send progress pics in DMs," "voice notes instead of formal reports," "quick accountability messages instead of app notifications." And critically: <span style={{ color: C.text }}>Instagram is where coaches find clients, WhatsApp is where they coach them.</span> The two channels serve different stages of the same funnel but are completely disconnected.</p>
                  <p>This isn't accidental. Clients already live on WhatsApp/IG. Zero onboarding friction. Faster than logging into an app. And critically — it <span style={{ color: C.text }}>feels more personal</span>, which is a direct retention driver. This mirrors how NHS clinicians default to informal comms when systems are clunky — behaviour beats software design.</p>
                </>
              )},
              { title: "PROGRAM DELIVERY — The three-tier reality", color: C.blue, content: (
                <>
                  <p><span style={{ color: C.text }}>Tier 1 (Beginner):</span> PDFs from Canva, Notes app screenshots, Google Docs links, WhatsApp text lists.</p>
                  <p><span style={{ color: C.text }}>Tier 2 (Mid-level):</span> Google Sheets trackers, Notion templates, Trainerize (partially used), Loom videos.</p>
                  <p><span style={{ color: C.text }}>Tier 3 (Advanced):</span> Hybrid stack — app for workouts, WhatsApp for check-ins, Drive for resources.</p>
                  <p>Key finding: even coaches who PAY for coaching apps still send <span style={{ color: C.text }}>"supplemental guidance via WhatsApp."</span> Existing apps fail to centralize real interaction.</p>
                </>
              )},
              { title: "PROGRESS TRACKING — The Google Sheets empire", color: C.orange, content: (
                <>
                  <p><span style={{ color: C.text }}>This is the most validated pain point.</span> Coaches track weight logs, measurements, PRs, compliance %, check-in responses, and progress photos — almost universally in Google Sheets.</p>
                  <p>Sheets dominates because it's free, fully customizable, easily duplicated per client, and acts as a lightweight CRM. But coaches consistently complain about: <span style={{ color: C.text }}>manual updates, messy scaling past 20+ clients, no automation, no visual insights, and context-switching fatigue.</span></p>
                  <p>This is spreadsheet as "shadow infrastructure" — the exact same pattern seen in fragmented clinical documentation systems.</p>
                </>
              )},
              { title: "PAYMENTS — Completely fragmented", color: C.violet, content: (
                <>
                  <p>Common payment stack: Stripe links, PayPal subscriptions, Venmo (US), bank transfer (UK), Gumroad (program sales).</p>
                  <p><span style={{ color: C.text }}>Payments are almost NEVER integrated with coaching delivery.</span> So coaches: check Stripe manually → onboard client manually → add to WhatsApp manually → duplicate a Sheet manually. That's operational inefficiency disguised as "flexibility."</p>
                </>
              )},
              { title: "CLIENT MANAGEMENT — The hidden chaos layer", color: C.cyan, content: (
                <>
                  <p>Most coaches have: no CRM, no lifecycle tracking, no churn alerts, no automated renewals, no adherence analytics. Instead they rely on memory, Notes app, spreadsheet tabs, and chat history.</p>
                  <p><span style={{ color: C.text }}>Breaking point: ~15–30 active clients.</span> After that, cognitive load spikes and balls start dropping.</p>
                </>
              )},
              { title: "WHY EXISTING APPS ARE REJECTED", color: C.red, content: (
                <>
                  <p>From aggregated coach sentiment: <span style={{ color: C.text }}>"Feels like enterprise software"</span> (too bloated). Poor mobile UX (coaches operate 80% on phone). Overkill features — they don't need AI biomechanics or social feeds. They need fast check-ins, client overview, simple tracking.</p>
                  <p><span style={{ color: C.text }}>Pricing sensitivity:</span> many solo coaches earn £1k–5k/month. £50–100/mo SaaS feels expensive unless ROI is immediately obvious.</p>
                </>
              )},
            ].map((section, i) => (
              <InfoCard key={i} title={section.title} color={section.color}
                accent={section.color + "18"} borderColor={section.color + "40"}>
                {section.content}
              </InfoCard>
            ))}
          </div>
        )}

        {/* PERSONAS */}
        {activeSection === "personas" && (
          <div>
            <SectionHeader number="02" title="Coach Persona Matrix" subtitle="'Fitness coach' is NOT one segment. It's 4–5 completely different business models pretending to be one." color={C.orange} />

            <InfoCard title="TARGETING STRATEGY" color={C.green}>
              <p style={{ margin: "0 0 6px 0" }}><span style={{ color: C.text, fontWeight: 600 }}>Build for: "Online coaches managing 15–100 clients."</span> This is the clear, painful, monetizable niche.</p>
              <p style={{ margin: 0 }}>Primary: Influencer Coaches (best growth + distribution) and High-Ticket Coaches (best revenue + retention). Avoid Beginner Coaches as primary target — high churn, low LTV.</p>
            </InfoCard>

            <div style={{ marginTop: "8px" }}>
              {personas.map((p, i) => (
                <PersonaCard key={i} persona={p} isActive={activePersona === i}
                  onClick={() => setActivePersona(activePersona === i ? -1 : i)} />
              ))}
            </div>
          </div>
        )}

        {/* JTBD */}
        {activeSection === "jtbd" && (
          <div>
            <SectionHeader number="03" title="Jobs-To-Be-Done Map" subtitle="Not 'I want a fitness app.' These are the actual job statements derived from coach behaviour." color={C.violet} />

            {jtbdJobs.map((job, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "18px 20px", marginBottom: "12px", borderLeft: `3px solid ${job.color}` }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ fontFamily: fonts.mono, fontSize: "11px", fontWeight: 700, color: job.color }}>{job.num}</span>
                  <div style={{ fontFamily: fonts.display, fontSize: "16px", fontWeight: 600, color: C.text, fontStyle: "italic", lineHeight: 1.3 }}>
                    "{job.title}"
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "10px" }}>
                  {job.subjobs.map((s, j) => <Tag key={j} color={C.textDim} bg={C.surface}>{s}</Tag>)}
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: "12px", color: job.color, fontStyle: "italic" }}>
                  ↳ {job.driver}
                </div>
              </div>
            ))}

            <InfoCard title="STRATEGIC SYNTHESIS" color={C.green}>
              <p style={{ color: C.text, fontWeight: 600, margin: "0 0 8px 0" }}>This is NOT a "fitness niche product." This is a Vertical Operating System problem.</p>
              <p style={{ margin: "0 0 6px 0" }}>Structurally identical to: clinic management systems (healthcare), design system governance tools, creator CRM tools. The same pattern as Brixa (brand workflow OS), Meva (financial behaviour OS), and Cognito (knowledge OS).</p>
              <p style={{ margin: 0, color: C.text }}>The consistent founder pattern: fragmented workflows → unified platform opportunity.</p>
            </InfoCard>
          </div>
        )}

        {/* ARCHITECTURE */}
        {activeSection === "architecture" && (
          <div>
            <SectionHeader number="04" title="System Architecture" subtitle="Four-layer stack. Click each layer to explore components, purpose, and technology choices." color={C.cyan} />

            {architectureLayers.map((layer) => {
              const isActive = activeLayer === layer.id;
              return (
                <div key={layer.id} onClick={() => setActiveLayer(isActive ? null : layer.id)} style={{
                  background: isActive ? layer.dimColor : C.surface, border: `1px solid ${isActive ? layer.borderColor : C.border}`,
                  borderRadius: "10px", padding: "16px 18px", marginBottom: "10px", cursor: "pointer", transition: "all 0.2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: layer.color, boxShadow: isActive ? `0 0 10px ${layer.color}` : "none" }} />
                      <div>
                        <div style={{ fontFamily: fonts.mono, fontSize: "13px", fontWeight: 700, color: C.text }}>{layer.title}</div>
                        <div style={{ fontFamily: fonts.body, fontSize: "11px", color: C.textDim }}>{layer.subtitle}</div>
                      </div>
                    </div>
                    <span style={{ color: C.textFaint, fontSize: "16px", transform: isActive ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>›</span>
                  </div>

                  {isActive && (
                    <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }} onClick={e => e.stopPropagation()}>
                      {layer.components.map((comp, i) => (
                        <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "14px 16px" }}>
                          <div style={{ fontFamily: fonts.mono, fontSize: "12px", fontWeight: 700, color: layer.color, marginBottom: "5px" }}>{comp.name}</div>
                          <div style={{ fontFamily: fonts.body, fontSize: "12.5px", color: C.textDim, lineHeight: 1.55, marginBottom: "8px" }}>{comp.desc}</div>
                          <div style={{ display: "inline-block", padding: "3px 8px", borderRadius: "4px", fontSize: "10px", fontFamily: fonts.mono, fontWeight: 600, color: layer.color, background: layer.dimColor, border: `1px solid ${layer.color}22` }}>
                            {comp.tech}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Key integrations */}
            <div style={{ marginTop: "16px", background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "16px 18px" }}>
              <div style={{ fontFamily: fonts.mono, fontSize: "11px", fontWeight: 600, color: C.textFaint, letterSpacing: "1px", marginBottom: "10px" }}>KEY INTEGRATION PATHS</div>
              {[
                { from: "WhatsApp Flows", to: "Webhook Processor", via: "HTTPS webhook", c: C.green },
                { from: "IG DM / Comments", to: "Webhook Processor", via: "HTTPS webhook (shared endpoint)", c: C.green },
                { from: "Channel Router", to: "Meta Cloud API", via: "Graph API REST (WA + IG)", c: C.cyan },
                { from: "Payment Engine", to: "Stripe Connect", via: "Stripe API + webhooks", c: C.violet },
                { from: "Trainer Dashboard", to: "Core API", via: "Next.js API routes + Prisma", c: C.orange },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", marginBottom: "6px", fontFamily: fonts.mono }}>
                  <span style={{ color: r.c, fontWeight: 600, minWidth: "130px" }}>{r.from}</span>
                  <span style={{ color: C.textFaint }}>→</span>
                  <span style={{ color: C.text }}>{r.to}</span>
                  <span style={{ color: C.textFaint, fontSize: "10px", marginLeft: "auto" }}>{r.via}</span>
                </div>
              ))}
            </div>

            {/* Architectural decisions */}
            <div style={{ marginTop: "12px" }}>
              <InfoCard title="KEY ARCHITECTURAL DECISIONS" color={C.orange} accent={C.orangeDim} borderColor={C.orangeBorder}>
                <p style={{ margin: "0 0 10px 0" }}><span style={{ color: C.text, fontWeight: 600 }}>Meta Cloud API Direct over BSPs (Twilio, 360dialog):</span> Zero monthly platform fee, zero per-message markup. You only pay Meta's native rates. More upfront dev work (webhook handling, retry logic, template management) but since FitFlow already needs a custom backend, the BSP abstraction layer is redundant cost. Saves $30–50/mo that compounds as you scale.</p>
                <p style={{ margin: "0 0 10px 0" }}><span style={{ color: C.text, fontWeight: 600 }}>Unified Meta Graph API for WhatsApp + Instagram:</span> Both APIs share the same Meta app credentials, the same webhook endpoint, and the same Graph API infrastructure. One integration gives you two channels. IG Messaging API is free (no per-message fees) but has stricter limits: 200 automated DMs/hour, 24-hour window (same as WhatsApp), and clients must initiate contact first. No Flows equivalent on IG — use quick replies + structured text instead.</p>
                <p style={{ margin: "0 0 10px 0" }}><span style={{ color: C.text, fontWeight: 600 }}>Supabase over raw Postgres:</span> Auth + RLS + Realtime + Storage in one platform. Perfect for solo dev shipping fast. Migrate later if needed.</p>
                <p style={{ margin: "0 0 10px 0" }}><span style={{ color: C.text, fontWeight: 600 }}>Stripe Connect (not direct Stripe):</span> Each trainer is the merchant, not you. They get their own connected account. You take a 5–10% platform fee per payment.</p>
                <p style={{ margin: "0 0 10px 0" }}><span style={{ color: C.text, fontWeight: 600 }}>BullMQ for scheduling:</span> Workout delivery needs precise timing (7AM client timezone). BullMQ handles delayed jobs, retries, and rate limiting against Meta Cloud API throughput limits (80 msg/sec for new accounts, scaling with quality rating).</p>
                <p style={{ margin: 0 }}><span style={{ color: C.text, fontWeight: 600 }}>Mobile-first PWA dashboard:</span> Coaches operate 80% on mobile. Not "responsive as afterthought" — mobile-first as core constraint from day one.</p>
              </InfoCard>
            </div>
          </div>
        )}

        {/* COMPETITIVE */}
        {activeSection === "competitive" && (
          <div>
            <SectionHeader number="05" title="Competitive Landscape" subtitle="Existing tools and why coaches still default to WhatsApp + Sheets despite them." color={C.orange} />

            <InfoCard title="THE POSITIONING INSIGHT" color={C.green}>
              <p style={{ color: C.text, fontWeight: 600, margin: "0 0 6px 0" }}>"Replace your WhatsApp + IG DMs + Sheets + Stripe + Notion + Drive stack with one system that lives inside the channels your clients already use."</p>
              <p style={{ margin: 0 }}>Not "fitness app." Not "trainer CRM." The pitch is tool consolidation through the channels they already use — with IG as the lead gen engine and WhatsApp as the coaching delivery layer.</p>
            </InfoCard>

            {competitorGaps.map((comp, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "16px 18px", marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <span style={{ fontFamily: fonts.mono, fontSize: "14px", fontWeight: 700, color: C.text }}>{comp.name}</span>
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: "12.5px", color: C.textDim, lineHeight: 1.5, marginBottom: "8px" }}>
                  <span style={{ color: C.orange }}>Gap:</span> {comp.gap}
                </div>
                <div style={{ fontFamily: fonts.mono, fontSize: "11px", color: C.green, background: C.greenDim, display: "inline-block", padding: "4px 10px", borderRadius: "4px" }}>
                  Our angle: {comp.angle}
                </div>
              </div>
            ))}

            <InfoCard title="WHY DUAL-CHANNEL NATIVE IS THE MOAT" color={C.cyan} accent={C.cyanDim} borderColor={C.cyanBorder}>
              <p style={{ margin: "0 0 8px 0" }}><span style={{ color: C.text }}>Instagram = lead gen engine.</span> Coaches already use IG to attract clients (Reels, Stories, DMs). FitFlow automates the top of funnel: comment triggers → DM sequences → intake forms → WhatsApp handoff. ManyChat does this but stops at lead capture — no coaching delivery layer.</p>
              <p style={{ margin: "0 0 8px 0" }}><span style={{ color: C.text }}>WhatsApp = coaching delivery engine.</span> WhatsApp Flows enable interactive forms (buttons, dropdowns, date pickers) that open directly inside chat. Clients complete workouts, check-ins, and payments across multiple screens without ever leaving the app. IG DMs don't have an equivalent to Flows — so WhatsApp remains the structured delivery channel.</p>
              <p style={{ margin: "0 0 8px 0" }}><span style={{ color: C.text }}>The unified funnel:</span> IG follower → comment trigger → automated DM → intake qualification → WhatsApp onboarding Flow → active client. One platform manages the entire pipeline from discovery to delivery. No tool currently does this for fitness coaches.</p>
              <p style={{ margin: "0 0 8px 0" }}><span style={{ color: C.text }}>IG API constraints:</span> 200 automated DMs/hour (firm limit, no exceptions). 24-hour messaging window (same as WhatsApp). Clients must initiate contact first — no cold outreach. 1 automated DM per user per trigger per 24 hours. Business/Creator account required.</p>
              <p style={{ margin: "0 0 8px 0" }}><span style={{ color: C.text }}>The critical constraint:</span> WhatsApp Pay only available in India, Brazil, and Singapore. Payments in US/UK/EU markets require Stripe payment links sent in-chat — functional but one extra tap vs native checkout.</p>
              <p style={{ margin: 0 }}><span style={{ color: C.text }}>Platform risk:</span> Both channels are Meta infrastructure. They can change API pricing, restrict features, or tighten policies. Concentration risk is higher with dual Meta dependency, but the shared API infrastructure means less code to maintain and consistent policy framework.</p>
            </InfoCard>
          </div>
        )}

        {/* ECONOMICS */}
        {activeSection === "economics" && (
          <div>
            <SectionHeader number="06" title="Unit Economics" subtitle="Real numbers on platform costs, pricing strategy, and revenue projections." color={C.green} />

            <div style={{ fontFamily: fonts.mono, fontSize: "11px", color: C.textFaint, letterSpacing: "1px", marginBottom: "10px" }}>MONTHLY PLATFORM COSTS</div>
            {costRows.map((row, i) => {
              const isTotal = i === costRows.length - 1;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px",
                  background: isTotal ? C.greenDim : C.card, border: `1px solid ${isTotal ? C.greenBorder : C.border}`,
                  borderRadius: "8px", marginBottom: "6px",
                }}>
                  <div>
                    <div style={{ fontFamily: fonts.mono, fontSize: "12px", fontWeight: isTotal ? 700 : 600, color: isTotal ? C.green : C.text }}>{row.item}</div>
                    <div style={{ fontFamily: fonts.body, fontSize: "11px", color: C.textDim }}>{row.note}</div>
                  </div>
                  <div style={{ fontFamily: fonts.mono, fontSize: "14px", fontWeight: 700, color: isTotal ? C.green : C.text }}>{row.cost}</div>
                </div>
              );
            })}

            <div style={{ fontFamily: fonts.mono, fontSize: "11px", color: C.textFaint, letterSpacing: "1px", marginTop: "24px", marginBottom: "10px" }}>REVENUE PROJECTIONS @ $45/MO PER TRAINER</div>
            {revenueScenarios.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px",
                background: C.card, border: `1px solid ${C.border}`, borderRadius: "8px", marginBottom: "6px",
              }}>
                <div style={{ fontFamily: fonts.mono, fontSize: "13px" }}>
                  <span style={{ color: s.color, fontWeight: 700 }}>{s.trainers}</span>
                  <span style={{ color: C.textDim }}> trainers</span>
                </div>
                <div style={{ fontFamily: fonts.mono, fontSize: "13px", color: C.text, fontWeight: 600 }}>{s.mrr} MRR</div>
                <div style={{ fontFamily: fonts.body, fontSize: "11px", color: C.textDim }}>{s.status}</div>
              </div>
            ))}

            <InfoCard title="META CLOUD API DIRECT — COST MECHANICS" color={C.cyan} accent={C.cyanDim} borderColor={C.cyanBorder} style={{ marginTop: "16px" }}>
              <p style={{ margin: "0 0 8px 0" }}><span style={{ color: C.text }}>Zero platform fee:</span> Meta Cloud API access is free. No monthly subscription, no BSP license. You pay only for delivered template messages at Meta's published rates — no middleman markup.</p>
              <p style={{ margin: "0 0 8px 0" }}><span style={{ color: C.text }}>Service messages (client-initiated):</span> Free. This covers most trainer-client conversations since they're naturally back-and-forth.</p>
              <p style={{ margin: "0 0 8px 0" }}><span style={{ color: C.text }}>Utility templates (within 24hr window):</span> Free. Workout confirmations, reminders sent within an active conversation cost nothing.</p>
              <p style={{ margin: "0 0 8px 0" }}><span style={{ color: C.text }}>Business-initiated templates:</span> $0.005–$0.025/msg depending on category and region. Payment reminders, re-engagement messages for inactive clients.</p>
              <p style={{ margin: "0 0 8px 0" }}><span style={{ color: C.text }}>What you build yourself:</span> Webhook endpoint, message queue, retry logic, template management UI. This is dev work you'd do anyway for a custom SaaS — the BSP layer was redundant.</p>
              <p style={{ margin: 0 }}><span style={{ color: C.text }}>Strategy:</span> Design flows that keep the 24-hour service window open. If clients reply daily (via workout logs), most messaging stays free. This is a product design decision, not just a cost optimization.</p>
            </InfoCard>

            <InfoCard title="PRICING STRATEGY" color={C.orange} accent={C.orangeDim} borderColor={C.orangeBorder}>
              <p style={{ margin: "0 0 8px 0" }}><span style={{ color: C.text }}>Tier 1 — Starter ($25/mo):</span> Up to 15 clients, basic workout delivery, check-in flows, manual payments. Targets Solo Coaches.</p>
              <p style={{ margin: "0 0 8px 0" }}><span style={{ color: C.text }}>Tier 2 — Growth ($45/mo):</span> Up to 50 clients, automated reminders, Stripe payment links, progress dashboards. Targets Influencer Coaches.</p>
              <p style={{ margin: 0 }}><span style={{ color: C.text }}>Tier 3 — Pro ($75/mo):</span> Unlimited clients, onboarding automation, branded experience, priority support. Targets High-Ticket Coaches.</p>
            </InfoCard>
          </div>
        )}

        {/* ROADMAP */}
        {activeSection === "roadmap" && (
          <div>
            <SectionHeader number="07" title="MVP Roadmap" subtitle="4–6 week build. Optimized for solo/small-team development. Every choice prioritizes speed-to-ship." color={C.blue} />

            <div style={{ fontFamily: fonts.mono, fontSize: "11px", color: C.textFaint, letterSpacing: "1px", marginBottom: "10px" }}>BUILD SEQUENCE</div>
            {mvpTimeline.map((row, i) => (
              <div key={i} style={{
                display: "flex", gap: "12px", padding: "14px 16px", background: C.card,
                border: `1px solid ${C.border}`, borderRadius: "8px", marginBottom: "6px", alignItems: "flex-start",
              }}>
                <div style={{
                  fontFamily: fonts.mono, fontSize: "10px", fontWeight: 700, color: row.color,
                  background: row.color + "18", padding: "3px 8px", borderRadius: "3px", flexShrink: 0, marginTop: "2px",
                }}>
                  {row.priority}
                </div>
                <div>
                  <div style={{ fontFamily: fonts.mono, fontSize: "12px", fontWeight: 700, color: C.text }}>{row.week}</div>
                  <div style={{ fontFamily: fonts.body, fontSize: "12px", color: C.textDim, lineHeight: 1.5, marginTop: "2px" }}>{row.tasks}</div>
                </div>
              </div>
            ))}

            <InfoCard title="TECH STACK" color={C.violet} accent={C.violetDim} borderColor={C.violetBorder} style={{ marginTop: "16px" }}>
              {Object.entries({
                "Frontend": "Next.js 14 · Tailwind CSS · Shadcn/ui · Chart.js",
                "Backend": "Node.js · Express.js · BullMQ · Prisma ORM",
                "Database": "PostgreSQL (Supabase) · Redis · Supabase Storage",
                "Integrations": "Meta WhatsApp Cloud API (direct) · Instagram Messaging API (Graph API) · Stripe Connect · WhatsApp Flows API · Cloudflare CDN",
              }).map(([cat, tools]) => (
                <p key={cat} style={{ margin: "0 0 6px 0" }}>
                  <span style={{ color: C.violet, fontFamily: fonts.mono, fontSize: "11px", fontWeight: 700 }}>{cat}:</span>{" "}
                  <span style={{ color: C.text, fontSize: "12px" }}>{tools}</span>
                </p>
              ))}
            </InfoCard>

            <InfoCard title="WHATSAPP FLOW EXAMPLES (MVP)" color={C.green}>
              <p style={{ color: C.text, fontWeight: 600, margin: "0 0 8px 0" }}>Weekly Check-In Flow (5 screens):</p>
              <p style={{ margin: "0 0 4px 0" }}>Screen 1: Current weight → number input + kg/lb toggle</p>
              <p style={{ margin: "0 0 4px 0" }}>Screen 2: Energy level → 1–5 rating buttons</p>
              <p style={{ margin: "0 0 4px 0" }}>Screen 3: Sleep quality → dropdown (great/good/ok/poor)</p>
              <p style={{ margin: "0 0 4px 0" }}>Screen 4: Any pain or issues? → text input (optional)</p>
              <p style={{ margin: "0 0 10px 0" }}>Screen 5: Progress photo → camera prompt (optional)</p>
              <p style={{ color: C.text, fontWeight: 600, margin: "0 0 8px 0" }}>Workout Log Flow (3 screens):</p>
              <p style={{ margin: "0 0 4px 0" }}>Screen 1: Exercise checklist → done/skipped/modified per exercise</p>
              <p style={{ margin: "0 0 4px 0" }}>Screen 2: Key lifts → weight + reps inputs for tracked exercises</p>
              <p style={{ margin: 0 }}>Screen 3: Session RPE + optional notes → submit</p>
            </InfoCard>
          </div>
        )}

        {/* RISKS */}
        {activeSection === "risks" && (
          <div>
            <SectionHeader number="08" title="Risks & Mitigations" subtitle="What could kill this — and what to do about it." color={C.red} />

            {[
              { risk: "Dual platform dependency on Meta", severity: "HIGH", detail: "Both WhatsApp and Instagram APIs are Meta infrastructure. A single policy change could affect both channels simultaneously. Higher concentration risk than single-channel approach.", mitigation: "Architect for portability. Core data lives in your database. Trainer dashboard + Stripe survive independently. Add SMS/email as fallback delivery channels in V2. The upside: shared API infrastructure means one integration, one webhook, consistent policy framework.", color: C.red },
              { risk: "Instagram API rate limits (200 DMs/hr)", severity: "MED", detail: "IG caps automated DMs at 200/hour — firm limit, no exceptions. For coaches with viral Reels (500+ comments), the automation queue backs up. Also: 1 automated DM per user per trigger per 24 hours.", mitigation: "BullMQ rate limiter with per-channel pacing. Queue IG DMs and deliver in order. Most coaches won't hit 200/hr — only viral moments. Design graceful degradation: if queue full, show trainer a dashboard alert, not a silent failure.", color: C.orange },
              { risk: "IG 24-hour window + no Flows equivalent", severity: "MED", detail: "Instagram enforces 24-hour messaging windows (same as WhatsApp). But IG has no Flows equivalent — no interactive multi-screen forms. Structured data collection is limited to quick reply buttons and text parsing.", mitigation: "Use IG for lead gen and light engagement only. Funnel structured interactions (check-ins, workout logs, intake forms) to WhatsApp where Flows exist. IG's role is top-of-funnel; WhatsApp is the coaching engine.", color: C.orange },
              { risk: "WhatsApp template approval friction", severity: "MED", detail: "Every business-initiated message template needs Meta's approval. They reject anything that feels spammy. Can be slow and unpredictable.", mitigation: "Pre-build a library of approved templates before launch. Design generic templates that work across coaches. Submit early in development, not at launch.", color: C.orange },
              { risk: "24-hour window constraint (WhatsApp)", severity: "MED", detail: "If a client goes quiet for 24+ hours, re-engaging requires a paid template message. Some clients ghost for days.", mitigation: "Design the product to keep the window open — daily workout logs, micro check-ins, reply buttons. Make client engagement a product feature, not just a messaging constraint.", color: C.orange },
              { risk: "Payments outside India/Brazil/Singapore", severity: "MED", detail: "Native WhatsApp Pay unavailable in US/UK/EU. Must use Stripe payment links — functional but adds one friction step.", mitigation: "Stripe links work well. Most coaches already use Stripe. Position this as 'your existing Stripe, now integrated with WhatsApp' rather than native checkout.", color: C.orange },
              { risk: "Coach adoption / switching cost", severity: "MED", detail: "Coaches have muscle memory with their current tools. Switching requires effort even if the new tool is better.", mitigation: "Zero-friction onboarding. Import from Sheets. Don't require replacing everything at once — let coaches adopt one feature (IG lead gen or WA check-in flows) and expand from there.", color: C.orange },
              { risk: "Trainer UX — dashboard feels 'enterprise'", severity: "HIGH", detail: "Research shows coaches reject tools that feel like Salesforce. Cross-channel inbox + CRM + automation could easily feel bloated if not designed carefully.", mitigation: "Coach's notebook, not CRM. Mobile-first PWA. Maximum 3 clicks to any action. Cross-channel unified inbox should feel like one conversation per client, not two separate views. Design for the person holding their phone between sessions.", color: C.red },
              { risk: "Scope creep into 12-month build", severity: "HIGH", detail: "Adding IG to an already ambitious problem space increases surface area. IG lead gen, comment automation, DM sequences, cross-channel routing — each could become a project.", mitigation: "MVP discipline: WhatsApp coaching delivery first (Flows + check-ins + payments). IG integration is Phase 2 — keyword triggers + DM auto-reply + WhatsApp handoff only. No IG analytics, no comment moderation, no content scheduling.", color: C.red },
            ].map((r, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "16px 18px", marginBottom: "8px", borderLeft: `3px solid ${r.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontFamily: fonts.mono, fontSize: "13px", fontWeight: 700, color: C.text }}>{r.risk}</span>
                  <Tag color={r.color} bg={r.color + "18"}>{r.severity}</Tag>
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: "12.5px", color: C.textDim, lineHeight: 1.55, marginBottom: "10px" }}>{r.detail}</div>
                <div style={{ background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: "6px", padding: "10px 12px" }}>
                  <div style={{ fontFamily: fonts.mono, fontSize: "10px", color: C.green, letterSpacing: "0.5px", marginBottom: "4px" }}>MITIGATION</div>
                  <div style={{ fontFamily: fonts.body, fontSize: "12px", color: C.text, lineHeight: 1.5 }}>{r.mitigation}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GO/NO-GO */}
        {activeSection === "decision" && (
          <div>
            <SectionHeader number="09" title="Go / No-Go Framework" subtitle="What needs to be true before this moves from research to build." color={C.green} />

            <InfoCard title="STATUS: RESEARCH COMPLETE — PARKED" color={C.blue} accent={C.blueDim} borderColor={C.blueBorder}>
              <p style={{ color: C.text, fontWeight: 600, margin: "0 0 8px 0" }}>This document is a strategic asset, not a build trigger.</p>
              <p style={{ margin: 0 }}>Everything here — persona matrix, JTBD map, architecture, cost model — is designed to be reopened cold in 3–6 months without losing context. Brixa ships first.</p>
            </InfoCard>

            <div style={{ fontFamily: fonts.mono, fontSize: "11px", color: C.textFaint, letterSpacing: "1px", marginTop: "20px", marginBottom: "10px" }}>PRE-BUILD VALIDATION CHECKLIST</div>
            {[
              { check: "Talk to 5–10 online coaches (Persona 1 & 2) about their workflow", status: "Not started", done: false },
              { check: "Confirm willingness to pay $45/mo for WhatsApp + IG integrated tool", status: "Not started", done: false },
              { check: "Prototype one WhatsApp Flow (check-in) with a real coach's client", status: "Not started", done: false },
              { check: "Verify Meta template approval process for fitness use case", status: "Not started", done: false },
              { check: "Test IG comment-to-DM trigger with real coach's IG Business account", status: "Not started", done: false },
              { check: "Confirm IG Messaging API app review + permissions approval timeline", status: "Not started", done: false },
              { check: "Confirm Stripe Connect onboarding friction is acceptable", status: "Not started", done: false },
              { check: "Brixa has shipped or is in stable maintenance mode", status: "In progress", done: false },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex", gap: "12px", padding: "12px 16px", background: C.card,
                border: `1px solid ${C.border}`, borderRadius: "8px", marginBottom: "6px", alignItems: "center",
              }}>
                <div style={{
                  width: "18px", height: "18px", borderRadius: "4px", border: `2px solid ${item.done ? C.green : C.textFaint}`,
                  background: item.done ? C.green : "transparent", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", color: "#000", fontWeight: 700,
                }}>
                  {item.done && "✓"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: fonts.body, fontSize: "12.5px", color: C.text, lineHeight: 1.4 }}>{item.check}</div>
                </div>
                <Tag color={item.status === "In progress" ? C.orange : C.textFaint} bg={item.status === "In progress" ? C.orangeDim : C.surface}>
                  {item.status}
                </Tag>
              </div>
            ))}

            <InfoCard title="THE FOUNDER-LEVEL QUESTION" color={C.violet} accent={C.violetDim} borderColor={C.violetBorder} style={{ marginTop: "20px" }}>
              <p style={{ color: C.text, fontWeight: 600, margin: "0 0 10px 0", fontFamily: fonts.display, fontSize: "15px", fontStyle: "italic" }}>
                "Should this be Option C (WhatsApp-integrated stealth layer) executed with the discipline of Option A (Notion-style simplicity)?"
              </p>
              <p style={{ margin: "0 0 8px 0" }}>Based on all research: <span style={{ color: C.green, fontWeight: 600 }}>Yes.</span> The market insight is strong, the technical foundation exists (WhatsApp Flows + API + Stripe), and the persona/JTBD alignment is clear.</p>
              <p style={{ margin: "0 0 8px 0" }}>But the timing question is separate from the market question. The research compounds — this document will be as valid in Q3 2026 as it is today. The coach pain points aren't going anywhere. The WhatsApp API will only get more capable.</p>
              <p style={{ margin: 0, color: C.text, fontWeight: 600 }}>Park this. Ship Brixa. Come back with fresh energy and a stable revenue base to fund the build.</p>
            </InfoCard>

            {/* Footer */}
            <div style={{ marginTop: "32px", padding: "20px", background: C.surface, borderRadius: "10px", border: `1px solid ${C.border}`, textAlign: "center" }}>
              <div style={{ fontFamily: fonts.display, fontSize: "16px", color: C.text, fontStyle: "italic", marginBottom: "6px" }}>
                "Disciplined research before building is rare founder behaviour."
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: "11px", color: C.textFaint }}>
                FitFlow Product Brief v1.0 — February 2026 — Leslie / Ovalay Studios
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: "11px", color: C.textFaint, marginTop: "4px" }}>
                Built for reopening in Q3 without losing context.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
