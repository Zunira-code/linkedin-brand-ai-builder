
# LinkedIn Brand Builder — v1 Plan

A Taplio-inspired (not a clone) LinkedIn growth workspace with AI post generation, a content calendar, a viral posts library, and personal analytics. Built on TanStack Start + Lovable Cloud (auth + DB) + Lovable AI + the LinkedIn connector.

## What you get in v1

1. **Landing page** — hero, feature grid, pricing-style CTA, marketing footer. Taplio-inspired visual language (deep indigo + electric violet accents, clean SaaS sidebar app once signed in). No copied assets or copy.
2. **Auth** — email/password + Google (Lovable Cloud managed). Public `/`, everything else under `_authenticated/`.
3. **App shell** — left sidebar (Dashboard, Post generator, Calendar, Inspiration, Analytics, Settings), top bar with LinkedIn connection status and user menu.
4. **AI Post Generator** — form (topic, tone, format: story/list/hook+insight/carousel-outline, length). Streams a draft via Lovable AI (`google/gemini-3-flash-preview`). Actions: regenerate, edit, save as draft, schedule, "post now" (real if LinkedIn connected).
5. **Content Calendar** — month/week grid of scheduled posts (drag-free MVP: click date → pick draft → set time). A cron-style server route (`/api/public/cron/publish-due`) publishes due posts to LinkedIn via the connector.
6. **Viral Posts Inspiration Library** — seeded set of ~30 high-performing post *patterns* (original text, no scraped copyrighted content) categorized by hook type; "Remix with AI" opens the generator prefilled.
7. **Personal Brand Analytics** — pulls the connected member's profile + recent posts via LinkedIn (`/v2/userinfo`, `/rest/posts`). Shows followers, post count, and per-post engagement where the API returns it; falls back to "connect LinkedIn to see live data".
8. **Settings** — connect/disconnect LinkedIn, brand voice (saved system-prompt snippet used by the generator), timezone.

## Tech shape

- **Server functions** (`src/lib/*.functions.ts`) for all DB + AI + LinkedIn calls, gated by `requireSupabaseAuth`.
- **Server route** `src/routes/api/public/cron/publish-due.ts` with a shared-secret header for the scheduler.
- **LinkedIn** via Lovable connector gateway (`https://connector-gateway.lovable.dev/linkedin/...`) — never direct.
- **AI** via `@ai-sdk/openai-compatible` → Lovable AI Gateway helper in `src/lib/ai-gateway.server.ts`. Chat streaming route at `src/routes/api/chat.ts` for the generator.

## Database (Lovable Cloud / Supabase, RLS on every table)

```text
profiles(id uuid pk → auth.users, display_name, avatar_url, brand_voice text, timezone text, linkedin_urn text)
posts(id, user_id, content text, format text, status enum[draft|scheduled|posted|failed],
      scheduled_at timestamptz null, posted_at timestamptz null, linkedin_urn text null,
      created_at, updated_at)
inspiration_templates(id, category, hook_type, template_text, seeded bool)  -- public read
post_metrics(post_id pk, impressions int, likes int, comments int, shares int, fetched_at)
```

Owner-scoped SELECT/INSERT/UPDATE/DELETE for `posts`, `profiles`, `post_metrics`. Public `TO anon` SELECT on `inspiration_templates`. Auto-create `profiles` row on signup via trigger.

## Secrets

- `LOVABLE_API_KEY` (auto)
- `LINKEDIN_API_KEY` (auto, from connector)
- `CRON_SECRET` (generated, used by the publish-due route)

## What's mocked in v1 vs real

- **Real**: auth, DB persistence, AI generation, LinkedIn profile fetch, LinkedIn post publishing (immediate + via scheduler when due), LinkedIn `/rest/posts` list.
- **Best-effort**: per-post metrics — LinkedIn's `/rest/posts` returns limited engagement without extra scopes; shown when present, otherwise the card says "metrics unavailable for this post".
- **Not in v1**: carousel image generation, comment auto-reply, team/multi-account, CSV export, A/B testing, chrome extension.

## Design

Dark-friendly SaaS look: deep indigo `#0F1226` surfaces, violet `#7C5CFF` primary, mint `#3DDC97` success accent, warm off-white text. Display font: Space Grotesk. Body: Inter. Rounded 12px cards, subtle grid background on the marketing page, dense but airy app views. All tokens in `src/styles.css` (oklch). Framer-motion on hero + card entrances only — restrained.

## Build order

1. Enable Lovable Cloud, connect LinkedIn, generate `CRON_SECRET`.
2. DB migration (tables, RLS, grants, profile trigger, seed inspiration templates).
3. Design tokens + shell layout + auth pages.
4. Landing page.
5. AI generator (streaming chat route + UI).
6. Drafts + calendar + publish-now + scheduled publish route.
7. Inspiration library + "remix" hand-off.
8. Analytics page.
9. Settings + brand voice wiring.
10. SEO (sitemap, robots, llms.txt, per-route metadata).

Ship v1, then iterate.
