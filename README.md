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

**Coming-soon mode (runtime switch, v4):** the Live / Coming-soon toggle in
**Settings ▸ Site settings** flips what anonymous visitors see **without a
rebuild** — it persists to `site_settings.status`, which the public app reads on
load. When set to Coming soon, anonymous visitors get the dark holding page
(trilingual, with contact CTAs) while `/admin/*` and **signed-in admins keep
seeing the full site**. Switching to Coming soon asks for confirmation, the admin
top bar always shows a green *Live* / amber *Coming soon* pill, and the holding
page keeps its discreet admin entry — the low-contrast corner dot or a logo
long-press reveals a "Team access" card linking to the login. Two overrides
remain: a `shakur_site_mode=live` cookie (set manually or via a Cloudflare rule)
shows that visitor the full site, and `VITE_SITE_MODE` acts as the build-time
fallback for the brief first paint and for installs without Supabase.

The home hero's two CTAs open overlays (no navigation): **Book an Appointment** runs
the full date → time → details → confirmed scheduling flow against live availability,
and **Request a Consultation** opens a lead-capture modal (pre-filled from the hero
form) that stores the request and emails the admin.

## Admin panel

- **Projects & Services** — card grids with search, status filter, publish/draft
  toggle, duplicate, delete (confirm), drag-to-reorder. Editor drawer with:
  - **Media manager** — drag-drop or browse, up to 20 images/videos per record,
    uploads to the local-first `POST /api/media` pipeline with live progress +
    a "Processing…" phase while videos transcode, cancel/retry, set-cover,
    reorder, delete. Video posters are generated automatically (replaceable).
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
  announcement bar, plus in v4: the **Live / Coming-soon status switch** with
  confirmation + amber warning banner, and the **logo carousel manager** — add
  logos via upload, rename, replace, delete, drag-to-reorder per row, and a
  5–120 s speed slider the public marquee follows), integrations (read-only,
  masked — env is the source of truth), notification toggles.
- **Website text (v5)** — every fixed string on the public site (nav, hero, forms,
  FAQ, footer, modals…) listed by section with **EN / LV / RU inline editing**,
  per-language completion dots, search and All / Unsaved / Needs-translation
  filters. Per key: **Save draft / Publish / Revert** (drafts are invisible to
  visitors); per section and global **Publish all** with confirmation. Hovering a
  row's eye icon renders the **actual live component** in a scaled popover —
  current (even unsaved) values injected, the edited string highlighted in place,
  switchable EN/LV/RU. The Hero and Projects-showcase section headers also carry
  the **"Blur panel behind text"** toggle (see below). Edits go live at runtime —
  no rebuild.
- **Dashboard (v5)** — real statistics from the database: published/total projects
  and services, upcoming meetings (with past/canceled counts), pending consultation
  requests, a requests chart (new bookings + consultation requests per day, 7/30/90
  day ranges) and a real recent-activity feed — plus quick actions. Loading
  skeletons while queries run; no demo numbers anywhere.

## Data & localization model

Localized text lives as JSON per field: `{ "en": …, "lv": …, "ru": … }`. Shared
fields (media, slug, category, dates, client, location, url) are single-value.
Types in `src/lib/db.ts`. Public pages read published rows via the anon key.
**v5 removed the static sample projects/services** that used to fill the grids as a
fallback: all project/service content now comes from Supabase only. An empty (or
unreachable, or still-v1) database renders the designed "No projects/services yet"
empty states — never stale sample cards, and never a white screen.

Home-page content lives in `home_sections` (one row per section, `draft` +
`published` jsonb columns). Visitors can only reach the published copy, through the
`home_public` view — drafts are invisible to the anon key. The public home merges
published content over the static defaults (`useHome()`), so an empty or
pre-migration DB still renders the complete page.

**Static copy — `src/i18n/strings.json` + the `site_texts` table (v5):** every
fixed string on the public site (nav, hero, forms, FAQ, footer, modals,
coming-soon page, aria-labels, month/weekday names…) is keyed in one JSON file,
nested `section → [subsection →] key → { en, lv, ru }`. Since v5 the file is the
**seed and fallback**; the live values come from the `site_texts` table, edited in
**Admin ▸ Website text** and applied at runtime (no rebuild). Each key stores a
`published` and a `draft` `{en,lv,ru}` value; visitors only ever see `published`
(through the `site_texts_public` view — drafts are invisible to the anon key,
same pattern as the home CMS). Keys with no published row keep the file's copy,
so a fresh or pre-migration DB renders the complete site. `src/i18n.ts` is the
typed loader — a typo'd `t.some_key` fails `tsc`. To add NEW copy: drop a leaf
(all three languages) into the right `strings.json` section, reference it as
`t.<key>`, and it appears in the Website-text manager automatically. Dynamic
content (services, projects, home CMS) is deliberately *not* here — it comes
from Supabase.

**Blur panels (v5):** the Hero and Projects-showcase sections have an optional
translucent, blurred backdrop behind their text for legibility over photos.
Toggle per section in **Admin ▸ Website text** (section header widget);
persisted in `site_settings.blur_sections` (jsonb), read by the public page at
runtime. Defaults: both **off** (matching the public design; the Text Manager mock's hero-on was a seeded demo state).

**Company registry links (v5):** the footer's badge cards were replaced by
**Lursoft** and **Firmas.lv** chips linking to the SIA SHAKUR company pages
(reg. no. 51203071901). The URLs live in `REGISTRY_LINKS` in `src/data.ts` —
⚠️ confirm they point at the right company profile and adjust there if not.
The footer's Services column now lists the actual published services from
Supabase (first five, in their configured order) and hides itself when there
are none.

---

## Local development

```bash
npm install
cp .env.example .env     # optional — see below
npm run dev              # http://localhost:5173
```

Supabase is optional for local dev: without `.env` the public site renders its
copy from `strings.json` with the designed empty states in the project/service
grids (since v5 there is no sample content); only `/admin` needs Supabase. The
booking flow runs in a clearly labeled demo mode unless the API server is
reachable.

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
   | **Existing v1 database** (deployed before the admin-panel rebuild) | `supabase/migrate-v2.sql`, then `migrate-v3.sql`, then `migrate-v4.sql`, then `migrate-v5.sql`, then `storage.sql` |
   | **Existing v2 database** (has `i18n`/`media` but no `home_sections`) | `supabase/migrate-v3.sql`, then `migrate-v4.sql`, then `migrate-v5.sql`, then `storage.sql` |
   | **Existing v3 database** (has `home_sections` but no `site_logos`) | `supabase/migrate-v4.sql`, then `migrate-v5.sql` |
   | **Existing v4 database** (has `site_logos` but no `site_texts`) | `supabase/migrate-v5.sql` |

   `migrate-v2.sql` upgrades in place without losing rows you created: it backfills
   the new `i18n`/`media` JSON from the old text columns, then adds the `services`,
   `meetings`, `availability` and `site_settings` tables. `migrate-v3.sql` adds the
   home CMS (`home_sections` + `home_public` view, seeded with the design content),
   `consultation_requests` and `media_assets`. `migrate-v4.sql` adds the runtime
   site status + marquee speed columns to `site_settings`, the `site_logos` table
   (seeded from the design's logo lists), and the `media_assets` video columns —
   **note:** the runtime status defaults to `live`; if your site is currently
   hidden via `VITE_SITE_MODE=coming_soon`, flip the switch in Settings right
   after migrating (or uncomment the `update … set status='coming_soon'` line at
   the bottom of the script). `migrate-v5.sql` adds the `site_texts` table +
   `site_texts_public` view (the Website-text manager's store) and the
   `site_settings.blur_sections` column. All scripts are idempotent — safe to
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
| `VITE_SITE_MODE` | `live` (default) or `coming_soon` — since v4 only the **fallback** for the runtime switch in Settings ▸ Site settings (used for the first paint and when Supabase is unconfigured) |
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
- `POST /api/media` — media upload (admin JWT required) for the home CMS, the
  project/service galleries, and the logo carousel. Images (≤15 MB) stream to the
  local media volume and respond immediately. **Videos (mp4/mov/webm, ≤512 MB)**
  are transcoded in-request with ffmpeg to a web-optimized H.264/AAC mp4
  (`+faststart`, ≤1080p, stream-copy when the source is already H.264) and get an
  auto-generated jpg poster. Everything then replicates to Supabase Storage in the
  background (see below).
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

### Video performance (v4)

Why videos used to load slowly: gallery uploads went **raw** to Supabase Storage —
un-transcoded phone footage with the mp4 index (`moov` atom) at the *end* of the
file, so browsers had to fetch nearly the whole file before showing frame one, from
a cross-origin bucket, with no poster image. v4 fixes every link in that chain:

- uploads are transcoded server-side (ffmpeg) to H.264/AAC with `+faststart` and
  capped at 1080p — already-compliant files are stream-copied, not re-encoded;
- a poster jpg is generated automatically, so grids/lightbox show a still instantly;
- players use `preload="none"` + the poster — nothing downloads until play;
- files are served same-origin from nginx `/media/` with HTTP range support (206)
  for instant seeking and `Cache-Control: public, max-age=2592000`.

Older gallery rows that still point at Supabase URLs keep working (and still gain
the preload/poster improvements). Optional: add a Cloudflare Cache Rule for
`shakurs.com/media/*` (Eligible for cache, respect origin TTL) to serve media from
the edge. Cloudflare caveats: the proxy caps upload body size (~100 MB on free
plans) below the API's 512 MB limit, and very long transcodes can hit its ~100 s
response timeout — prefer reasonably sized clips.

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
4. During the migration, gate visitors with the **Live / Coming-soon switch** in
   Settings ▸ Site settings (no rebuild — signed-in admins still see the site);
   let other teammates through with a Cloudflare rule (or browser devtools)
   setting the cookie `shakur_site_mode=live`, or use Cloudflare Access instead.
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
