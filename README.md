# SHAKUR — website + admin

Production build of the SHAKUR construction-company site and its admin panel,
reproducing the Claude Design files (`Shakur.dc.html`, `ShakurServicesPage`,
`ShakurServiceDetail`, `ShakurProjectDetail`, `ShakurAdminPanel`, `ShakurDashboard`,
`ShakurAdminLogin`, plus shared `Dropdown`, `DatePicker`, `CtaSection`, `FaqSection`).

**Stack:** Vite · React 18 · TypeScript · Tailwind · framer-motion · Supabase ·
Node/Express API (OpenAI + Resend) · Docker + Cloudflare Tunnel

---

## Routes

| Route | Page |
| --- | --- |
| `/` | Home — hero, partner marquees, value props, services, process, projects, FAQ, CTA |
| `/projects` | Project index |
| `/projects/:slug` | Project detail — graphic header, gallery + lightbox, scope of work, details aside (`/project/:slug` redirects here) |
| `/services` | Services — graphic header, category filter chips, card grid |
| `/services/:slug` | Service detail — gallery, capabilities 01–04, description + sticky aside (`/service/:slug` redirects here) |
| `/contact` | Contact form + booking flow (date → time → details, real slots) |
| `/booking/:token` | Manage a booking from an email link — reschedule / cancel, no login |
| `/admin/login` | Supabase email + password sign-in |
| `/admin/*` | Admin panel — Dashboard, Projects, Services, Availability, Meetings, Settings |
| `*` | 404 |

Public site is trilingual (EN / LV / RU, persisted under `localStorage.shakur_lang`);
the admin is English-only, matching the design.

## Admin panel

- **Projects & Services** — card grids with search, status filter, publish/draft
  toggle, duplicate, delete (confirm), drag-to-reorder. Editor drawer with:
  - **Media manager** — drag-drop or browse, up to 20 images/videos per record,
    **real resumable uploads** (TUS) to Supabase Storage with live progress,
    cancel/retry, set-cover, reorder, delete, video poster replacement.
  - **EN / LV / RU tabs** with per-language completion dots (green = complete,
    orange = partial, grey = empty). Title / summary / description (+ service CTA
    label) are per-language; media, slug, category, dates, client, location and URL
    are shared. Slugs derive from the EN title on create and never change on edit.
  - **Write with AI** on every text field and on the capabilities section — rewrites
    a rough note into on-brand copy and fills **all three languages at once** via the
    server-side OpenAI endpoint. Falls back to built-in sample copy when the server
    or key is unavailable, so the flow always works.
- **Availability** — weekly on/off + hours per day, slot duration / buffer /
  timezone, block-out dates, live open-slot preview. Drives the public booking flow.
- **Meetings** — Upcoming / Past / Canceled tabs, search, detail modal with notes,
  cancel + reschedule (attendee is emailed through the server when configured).
- **Settings** — profile & password, site settings (title, tagline, contact,
  announcement bar), integrations (read-only, masked — env is the source of truth),
  notification toggles.
- **Dashboard** — overview with stat cards and a visitor chart (demo data; there is
  no analytics backend) plus quick actions.

## Data & localization model

Localized text lives as JSON per field: `{ "en": …, "lv": …, "ru": … }`. Shared
fields (media, slug, category, dates, client, location, url) are single-value.
Types in `src/lib/db.ts`. Public pages read published rows via the anon key and fall
back to the static content in `src/data.ts` when Supabase is unreachable **or still
has the old v1 column layout** — the site never white-screens on a half-migrated DB.

---

## Local development

```bash
npm install
cp .env.example .env     # optional — see below
npm run dev              # http://localhost:5173
```

Supabase is optional for local dev: without `.env` the public site renders from
static content; only `/admin` needs Supabase. The booking flow runs in a clearly
labeled demo mode unless the API server is reachable.

To run the API locally: `cd server && npm install && node index.js` (reads the same
`.env` vars; every key-dependent feature degrades gracefully when its key is empty).

```bash
npm run build     # typecheck + production bundle
npm run preview   # serve dist/ on :3000
npm run lint      # tsc --noEmit
```

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).

2. **Run the SQL in the Supabase SQL editor:**

   | Situation | Run |
   | --- | --- |
   | Fresh project (nothing deployed yet) | `supabase/schema.sql`, then `supabase/storage.sql` |
   | **Existing v1 database** (deployed before the admin-panel rebuild) | `supabase/migrate-v2.sql`, then `supabase/storage.sql` |

   `migrate-v2.sql` upgrades in place without losing rows you created: it backfills
   the new `i18n`/`media` JSON from the old text columns, then adds the `services`,
   `meetings`, `availability` and `site_settings` tables. All three scripts are
   idempotent — safe to run again.

   Until the migration runs, the deployed v2 site shows its built-in static content
   and the admin shows a "run supabase/migrate-v2.sql" notice instead of crashing.

3. Copy **Project Settings → API** into `.env` (see `.env.example`).

4. Create the admin user under **Authentication → Users → Add user** (Auto Confirm),
   sign in at `/admin/login` — and **disable "Allow new users to sign up"** under
   Authentication → Providers → Email, otherwise anyone could self-register an
   account that RLS treats as an admin.

### Security model — RLS

| Table | anon (site visitor) | authenticated (admin) |
| --- | --- | --- |
| `projects`, `services` | SELECT published rows only | full CRUD |
| `meetings` | **no access at all** | SELECT / UPDATE / DELETE |
| `availability` | no access | full |
| `site_settings` | SELECT | full |
| storage `project-images` | read | write |

Public bookings never touch `meetings` from the browser — they go through the API
server, which holds the `service_role` key. That keeps attendee names/emails
unreadable to visitors even though the anon key ships in the bundle.

**Never put the `service_role` key in a `VITE_*` variable.** It belongs only in the
server-side section of `.env` (see below); Vite would bake a `VITE_*` value into the
public JS bundle.

---

## Environment variables

Client (baked into the bundle at **build** time — rebuild after changing):

| Var | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase for the browser (RLS-constrained) |

Server (`api` service only — never sent to the browser; each one optional, the
feature switches off gracefully without it):

| Var | Powers |
| --- | --- |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | booking storage, slot computation, admin meeting actions |
| `OPENAI_API_KEY` | admin "Write with AI" (server-side only) |
| `RESEND_API_KEY` + `RESEND_FROM` | confirmation / reminder / cancellation emails (`emails/` templates) |
| `PUBLIC_URL` | absolute links in emails (`https://shakur.verxyl.com`) |
| `SUPPORT_EMAIL` | contact address shown in emails |

## Server API (`server/`)

Node 22 + Express, proxied by nginx at `/api/`:

- `POST /api/ai/write` — OpenAI structured output; `{note, fieldType, targetLanguages}`
  → `{en,lv,ru}` (or 4 capability cards in all three languages). Validated
  server-side; malformed model output fails into the client's sample-copy fallback.
- `GET /api/slots?from&to` — open slots from the availability settings minus booked
  meetings (+buffer), block-outs, 1-day lead, 60-day horizon (Europe/Riga).
- `POST /api/bookings` — validates the slot, stores the meeting, emails a
  confirmation with an `.ics` attachment and tokenized manage links.
- `GET/POST /api/bookings/:token[/cancel|/reschedule]` — email-link actions, no login.
- `POST /api/admin/meetings/:id/cancel|reschedule` — admin actions (verified
  Supabase JWT) that also notify the attendee.
- Basic input validation + in-memory rate limiting on the public endpoints.

---

## Deploy — Docker Compose + Cloudflare Tunnel → `shakur.verxyl.com`

Three services: `web` (nginx, SPA + `/api/` proxy, loopback-only :3000), `api`
(internal only, not published), `tunnel` (cloudflared, the sole public path in).

```bash
cloudflared tunnel login          # one-time, interactive
bash scripts/setup-tunnel.sh      # tunnel + DNS + ./cloudflared/ (idempotent)
docker compose up -d --build
```

Checks:

```bash
docker compose ps                          # web + api healthy
curl http://127.0.0.1:3000/api/health      # {"ok":true} through the nginx proxy
curl -I https://shakur.verxyl.com          # served through the tunnel
```

> ⚠️ Rebuild (not just restart) after changing any `VITE_*` var — Vite bakes them
> into the bundle. Server vars only need `docker compose up -d` to recreate `api`.

### nginx

SPA fallback via `try_files`, immutable caching for hashed assets/fonts, `no-store`
for `index.html`, nosniff/referrer headers, gzip, and an `/api/` proxy that resolves
the `api` container via Docker DNS at runtime (nginx stays up even if `api` is down).

---

## Project layout

```
src/
  tokens.ts            design tokens, extracted literally
  i18n.ts              EN / LV / RU dictionaries
  data.ts              static fallback content (mirrors the SQL seeds)
  lib/                 db.ts types · supabase client · useProjects/useServices
  components/          Header, Footer, Marquee, Dropdown, DatePicker,
                       DetailSections (gallery/lightbox/capability cards),
                       BookingModal, Cta/Faq sections, Reveal, icons
  pages/               Home, Projects, Services, *Detail, Contact, Booking, NotFound
  admin/               AdminPanel shell + views/ + components/ (drawer, media
                       manager, AI actions), AdminLogin, RequireAuth
server/                Express API (ai, slots, bookings, email)
emails/                Resend templates (confirmation, reminder, canceled/rescheduled)
supabase/              schema.sql (fresh v2) · migrate-v2.sql (v1 → v2) · storage.sql
```

---

## ⚠️ Known gap: 19 photos are PLACEHOLDERS — do not ship as-is

The design API truncates binaries over 256 KiB, so 19 of the design's photos could
not be exported and are **flat dark-grey placeholders** in `public/images/`
(`home-hero.jpg`, `pv-hero.jpg`, `home-interior.png`, `rimi.png`, `svc-1.png`,
`img-193d/39bf/5279/553f/575d/771e/97b7/9c88/aa46/be98.png`,
`proj-kepler/kuldiga/moho/rimi.png`). Drop the originals in under the same names —
no code change needed — or upload real covers through `/admin`, which stores them in
Supabase Storage. The SHAKUR logo, all 11 partner logos and `cta-meeting.jpg` are genuine.
