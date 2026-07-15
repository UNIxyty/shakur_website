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
| `/` | Home — full-viewport hero (booking + consultation overlays), partner marquees, value props, live service/project cards, process, Help Center, CTA |
| `/projects` | Project index |
| `/projects/:slug` | Project detail — graphic header, gallery + lightbox, scope of work, details aside (`/project/:slug` redirects here) |
| `/services` | Services — graphic header, category filter chips, card grid |
| `/services/:slug` | Service detail — gallery, capabilities 01–04, description + sticky aside (`/service/:slug` redirects here) |
| `/contact` | Contact form + booking flow (date → time → details, real slots) |
| `/booking/:token` | Manage a booking from an email link — reschedule / cancel, no login |
| `/admin/login` | Supabase email + password sign-in |
| `/admin/*` | Admin panel — Dashboard, Home page, Projects, Services, Availability, Meetings, Settings |
| `*` | 404 |

Public site is trilingual (EN / LV / RU, persisted under `localStorage.shakur_lang`);
the admin is English-only, matching the design.

**Coming-soon mode:** build with `VITE_SITE_MODE=coming_soon` and every public route
serves the dark holding page instead (trilingual, with contact CTAs). `/admin/login`
and `/admin/*` keep working, and the page itself has a discreet admin entry — the
low-contrast dot in the bottom-left corner, or long-pressing the logo, reveals a
"Team access" card linking to the login. Per-visitor override during a migration: a
`shakur_site_mode=live` cookie (set manually or via a Cloudflare rule) shows that
visitor the full site. Flip back with `VITE_SITE_MODE=live` + rebuild.

The home hero's two CTAs open overlays (no navigation): **Book an Appointment** runs
the full date → time → details → confirmed scheduling flow against live availability,
and **Request a Consultation** opens a lead-capture modal (pre-filled from the hero
form) that stores the request and emails the admin.

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
  - **Write with AI — describe-driven.** Each drawer has a "Describe it" brief box:
    describe the record in any language and the AI writes the title, summary and
    description in **all three languages at once** (server-side OpenAI, structured
    output). The service drawer's separate "Scope of work" box generates a **dynamic
    1–6 capability cards** (the model decides how many the content needs), each with
    title, description and 2–4 bullets — all editable (add/remove card and bullet,
    regenerate). Falls back to built-in sample copy when the server or key is
    unavailable, so the flow always works.
- **Home page** — the public home CMS, section by section: **Hero**, **Partner
  block**, **CTA banner** (image sections with a preset picker + real upload through
  the media pipeline) and **Text & translations** (EN/LV/RU tabs with completion
  dots: hero headline/sub, partner title + value points with add/remove, CTA
  title/sub/button). Each section has a live, render-accurate preview, its own
  published/draft status pill and **Save as draft / Publish** actions — the public
  home page only ever reads published content.
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

Home-page content lives in `home_sections` (one row per section, `draft` +
`published` jsonb columns). Visitors can only reach the published copy, through the
`home_public` view — drafts are invisible to the anon key. The public home merges
published content over the static defaults (`useHome()`), so an empty or
pre-migration DB still renders the complete page.

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
   | **Existing v1 database** (deployed before the admin-panel rebuild) | `supabase/migrate-v2.sql`, then `supabase/migrate-v3.sql`, then `supabase/storage.sql` |
   | **Existing v2 database** (has `i18n`/`media` but no `home_sections`) | `supabase/migrate-v3.sql`, then `supabase/storage.sql` |

   `migrate-v2.sql` upgrades in place without losing rows you created: it backfills
   the new `i18n`/`media` JSON from the old text columns, then adds the `services`,
   `meetings`, `availability` and `site_settings` tables. `migrate-v3.sql` adds the
   home CMS (`home_sections` + `home_public` view, seeded with the design content),
   `consultation_requests` and `media_assets`. All scripts are idempotent — safe to
   run again.

   Until the migrations run, the deployed site shows its built-in static content
   and the admin shows a "run the migration" notice instead of crashing.

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
| `consultation_requests` | **no access at all** | SELECT / UPDATE |
| `availability` | no access | full |
| `site_settings` | SELECT | full |
| `home_sections` | no direct access — published copy only, via the `home_public` view | full CRUD |
| `media_assets` | no access (the files themselves are public) | SELECT |
| storage `project-images`, `media` | read | write |

Public bookings and consultation requests never touch their tables from the
browser — they go through the API server, which holds the `service_role` key. That
keeps names/emails/phones unreadable to visitors even though the anon key ships in
the bundle.

**Never put the `service_role` key in a `VITE_*` variable.** It belongs only in the
server-side section of `.env` (see below); Vite would bake a `VITE_*` value into the
public JS bundle.

---

## Environment variables

Client (baked into the bundle at **build** time — rebuild after changing):

| Var | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase for the browser (RLS-constrained) |
| `VITE_SITE_MODE` | `live` (default) or `coming_soon` — the holding-page switch |
| `VITE_PUBLIC_BASE_URL` | public origin for the canonical/OG tags in `index.html` |

Server (`api` service only — never sent to the browser; each one optional, the
feature switches off gracefully without it):

| Var | Powers |
| --- | --- |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | booking storage, slot computation, admin meeting actions |
| `OPENAI_API_KEY` | admin "Write with AI" (server-side only) |
| `RESEND_API_KEY` + `RESEND_FROM` | confirmation / reminder / cancellation / consultation emails (`emails/` templates) |
| `PUBLIC_BASE_URL` | absolute links in emails (`https://shakurs.com`); legacy `PUBLIC_URL` still read as a fallback |
| `SUPPORT_EMAIL` | consultation-request recipient + contact address shown in emails |
| `MEDIA_DIR` | where uploaded home-CMS images land (default `/data/media`, the compose volume) |

The public origin is **never hardcoded** — changing domains is an `.env` edit
(`PUBLIC_BASE_URL` restart-only, `VITE_PUBLIC_BASE_URL` needs a rebuild).

## Server API (`server/`)

Node 22 + Express, proxied by nginx at `/api/`:

- `POST /api/ai/write` — OpenAI structured output; `{note, fieldType}` → `{en,lv,ru}`
  (or **1–6** capability cards in all three languages — the model decides the count).
  The note is a describe-brief in any language (the model detects it) and copy stays
  on the described work only. Validated server-side; malformed model output fails
  into the client's sample-copy fallback.
- `POST /api/consultations` — hero lead-capture: validates, stores the request
  (service key; visitors have no table access), then emails the admin
  (`SUPPORT_EMAIL`) via the `emails/4-consultation-request` template. Email is
  best-effort — a provider failure never loses the stored request.
- `POST /api/media` — home-CMS image upload (admin JWT required): streams to the
  local media volume first and responds immediately, then replicates to Supabase
  Storage in the background (see below).
- `GET /api/slots?from&to` — open slots from the availability settings minus booked
  meetings (+buffer), block-outs, 1-day lead, 60-day horizon (Europe/Riga).
- `POST /api/bookings` — validates the slot, stores the meeting, emails a
  confirmation with an `.ics` attachment and tokenized manage links.
- `GET/POST /api/bookings/:token[/cancel|/reschedule]` — email-link actions, no login.
- `POST /api/admin/meetings/:id/cancel|reschedule` — admin actions (verified
  Supabase JWT) that also notify the attendee.
- Basic input validation + in-memory rate limiting on the public endpoints.

## Media storage — local-first, Supabase replica

Home-CMS uploads are **local-first**: the API writes the file to the
`media-uploads` Docker volume and answers as soon as the local write lands, so
uploads feel fast; nginx serves the files directly at `/media/…`. Each file is then
replicated to the Supabase Storage `media` bucket in the background, and
`media_assets` records local path + Supabase URL + replication status. The client
renders the local path and falls back to the Supabase URL if the local copy is
missing (e.g. a rebuilt box with an empty volume).

Trade-off: the local copy lives on this one machine; Supabase is the durable copy.
The volume survives `docker compose up -d --build`; to wipe local media:
`docker compose down && docker volume rm shakur_website_media-uploads`.

(Project/service gallery uploads are unchanged — they go straight to Supabase
Storage with resumable TUS uploads and real progress.)

---

## Deploy — Docker Compose + Cloudflare Tunnel

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

### Domain migration → `shakurs.com` (checklist)

The app side is done — nothing references the old domain in code. To finish the
cutover:

1. **Cloudflare**: point `shakurs.com` at Cloudflare and add a tunnel public
   hostname `shakurs.com → http://web:3000` (same pattern as before; edit
   `cloudflared/config.yml` or re-run `scripts/setup-tunnel.sh` with the new
   hostname).
2. **Supabase Auth**: add `https://shakurs.com` to Authentication → URL
   Configuration (Site URL / additional redirect URLs) so admin sign-in works there.
3. `.env` already carries `PUBLIC_BASE_URL` / `VITE_PUBLIC_BASE_URL` =
   `https://shakurs.com` — booking/consultation email links point at the new domain
   **now**, so don't delay the tunnel step long (or temporarily set them back).
4. During the migration, gate visitors: `VITE_SITE_MODE=coming_soon` + rebuild
   shows everyone the holding page; let yourself through with a Cloudflare rule (or
   browser devtools) setting the cookie `shakur_site_mode=live`, or use Cloudflare
   Access instead. When ready: `VITE_SITE_MODE=live` + rebuild.
5. CORS needs no changes — the browser only ever calls `/api/` on its own origin
   (nginx proxies internally).

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
  lib/                 db.ts types · supabase client · useProjects/useServices/useHome
  components/          Header, Footer, Marquee, Dropdown, DatePicker,
                       DetailSections (gallery/lightbox/capability cards),
                       BookingModal, ConsultationModal, Cta/Faq sections, Reveal, icons
  pages/               Home, ComingSoon, Projects, Services, *Detail, Contact,
                       Booking, NotFound
  admin/               AdminPanel shell + views/ (incl. HomeView CMS) + components/
                       (drawer, media manager, AI actions), AdminLogin, RequireAuth
server/                Express API (ai, slots, bookings, consultations, media, email)
emails/                Resend templates (confirmation, reminder, canceled/rescheduled,
                       consultation request)
supabase/              schema.sql (fresh v3) · migrate-v2.sql (v1 → v2) ·
                       migrate-v3.sql (v2 → v3) · storage.sql
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
