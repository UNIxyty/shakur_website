# SHAKUR — website

Production build of the SHAKUR interior-finishing site, reproducing the Claude Design
`Shakur.dc.html` (plus its `CtaSection`, `FaqSection`, and `ProcessSteps` imports).

**Stack:** Vite · React 18 · TypeScript · Tailwind · framer-motion · Supabase · Docker + Cloudflare Tunnel

---

## What's here

| Route | Page |
| --- | --- |
| `/` | Home — hero, partner marquees, value props, services, process, projects, FAQ, CTA |
| `/projects` | Project index (Load More) |
| `/project/:slug` | Project detail — media gallery, lightbox, Facts sidebar |
| `/services` | Service index (Load More) |
| `/service/:slug` | Service detail — long copy, why/how, gallery, process |
| `/contact` | Contact form + booking modal |
| `/admin` | Protected projects CRUD |
| `/admin/login` | Supabase email + password sign-in |
| `*` | 404 |

Three languages (EN / LV / RU), persisted to `localStorage` under `shakur_lang`.

### Design fidelity

- `src/tokens.ts` holds every token extracted **literally** from the design — hex colors,
  the fluid `clamp()` type ramp, spacing, radii, shadows, easing. `tailwind.config.js`
  mirrors it. Nothing was eyeballed.
- Fonts (Inter 300–800, Cormorant Garamond 500–700) are **self-hosted** in
  `public/fonts/`, with `unicode-range` subsetting for Latin, Latin-Ext (LV) and
  Cyrillic (RU) — no CDN, no look-alike substitutes.
- The design's single breakpoint (900px, where the nav collapses) is the Tailwind
  `nav:` screen.

### Motion

All animation is framer-motion. Scroll reveals use `whileInView` with staggered
children; buttons and cards use `whileHover` / `whileTap`; routes cross-fade through
`AnimatePresence`. The app is wrapped in `<MotionConfig reducedMotion="user">`, and
`prefers-reduced-motion` additionally stops the infinite logo marquee (which is CSS,
so framer-motion can't reach it).

---

## Local development

```bash
npm install
cp .env.example .env     # optional — see below
npm run dev              # http://localhost:5173
```

**Supabase is optional for local dev.** With no `.env`, the public site renders from the
static content in `src/data.ts`, which is identical to the design's built-in data. Only
`/admin` requires Supabase.

Other scripts:

```bash
npm run build     # typecheck + production bundle to dist/
npm run preview   # serve dist/ on :3000
npm run lint      # tsc --noEmit
```

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).

2. **Run the SQL, in this order,** in the Supabase SQL editor:

   | File | What it does |
   | --- | --- |
   | `supabase/schema.sql` | Creates the `projects` table, enables RLS + policies, seeds the six design projects |
   | `supabase/storage.sql` | Creates the public `project-images` bucket the admin uploads into, with matching policies |

   Both are re-runnable (idempotent) — safe to paste again after an edit.

3. Copy **Project Settings → API** into `.env` (see `.env.example`):

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

4. Create the admin user under **Authentication → Users → Add user** (email + password),
   then sign in at `/admin/login`.

### Security model — RLS

RLS is enabled on `projects`, with **public read / authenticated write**:

| Role | SELECT | INSERT / UPDATE / DELETE |
| --- | --- | --- |
| `anon` (every site visitor) | only rows where `published = true` | ❌ denied by policy |
| `authenticated` (the admin) | everything, including unpublished drafts | ✅ allowed |

This was verified against a real Postgres, under Supabase's actual grant model (where
`anon` *does* hold table privileges, so RLS is the only thing standing between a visitor
and your data): as `anon`, `INSERT` is rejected with *"new row violates row-level security
policy"*, `UPDATE`/`DELETE` match zero rows, and unpublished rows stay invisible.

The anon key is a *public* key — it ships in the browser bundle by design, and RLS is what
constrains it. **Never put the `service_role` key in `.env`**: it bypasses RLS entirely.

---

## Deploy — Docker Compose + Cloudflare Tunnel → `shakur.verxyl.com`

Two services: `web` (nginx serving the built SPA on `:3000`) and `tunnel`
(`cloudflare/cloudflared`), which dials out to Cloudflare and publishes `web` at your
hostname. No inbound ports are opened — `web` binds to `127.0.0.1` only, so the tunnel is
the sole public path in.

**1. Authenticate the CLI** (one-time, interactive):

```bash
cloudflared tunnel login
```

It prints a `https://dash.cloudflare.com/argotunnel?...` URL — open it in any browser,
sign in, and pick the **verxyl.com** zone. That writes `~/.cloudflared/cert.pem`, which
authorizes the next step.

**2. Create the tunnel, DNS record, and container config** (non-interactive):

```bash
bash scripts/setup-tunnel.sh
```

This creates a named tunnel `shakur`, points `shakur.verxyl.com` at it (CNAME to
`<tunnel-id>.cfargotunnel.com`), and writes `./cloudflared/config.yml` +
`credentials.json` for the container. The ingress routes the hostname to `http://web:3000`
— the Compose service name, resolved over the internal Docker network, which is why no
port needs publishing. Idempotent; safe to re-run.

> `./cloudflared/` holds the tunnel credentials — it is gitignored and mounted read-only
> into the container. Don't commit it.

**3. Fill in `.env`** (Supabase only — the tunnel needs no env var):

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**4. Ship it:**

```bash
docker compose up -d --build
```

Then check it:

```bash
docker compose ps                        # both services up, web healthy
curl -I http://127.0.0.1:3000            # origin answers locally
curl -I https://shakur.verxyl.com        # served through the tunnel
docker compose logs -f tunnel            # look for "Registered tunnel connection"
```

`tunnel` waits on `web`'s healthcheck (`depends_on: condition: service_healthy`), so it
never advertises the origin before nginx is actually serving — no 502s on a cold deploy.

> ⚠️ **Rebuild, don't just restart, after changing any `VITE_*` var.** Vite inlines them
> into the JS bundle at build time, so they are baked into the image:
> `docker compose up -d --build`.

### What nginx does

- `try_files … /index.html` — a hard refresh on `/projects`, `/project/rimi`, or
  `/admin/login` resolves instead of 404ing. (A missing *asset* still correctly 404s
  rather than silently returning HTML.)
- Hashed assets and fonts: `Cache-Control: public, max-age=31536000, immutable`.
- `index.html`: `no-store` — so a client can never pin to a stale asset manifest and start
  requesting JS bundles that no longer exist.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- gzip on JS/CSS/SVG/JSON.

---

## Project layout

```
src/
  tokens.ts          design tokens, extracted literally from the design
  i18n.ts            EN / LV / RU dictionaries
  data.ts            static content — also the Supabase seed + fallback
  motion.ts          shared framer-motion variants
  lang.tsx           language context (localStorage-backed)
  lib/
    supabase.ts      client + row types; null when unconfigured
    useProjects.ts   Supabase read with static fallback
  components/        Header, Footer, Marquee, MediaGallery, Lightbox,
                     BookingModal, Cta/Faq/ProcessSteps, Reveal, icons
  pages/             Home, Projects, Services, *Detail, Contact, NotFound
  admin/             AdminLogin, AdminDashboard, RequireAuth
supabase/schema.sql  table + RLS policies + seed
public/
  fonts/             self-hosted woff2 (Inter, Cormorant Garamond)
  images/            design assets
```

---

## ⚠️ Known gap: 19 photos are PLACEHOLDERS — do not ship as-is

**The real photography is not in this repo.** The Claude Design file API caps responses at
256 KiB, and 19 of the design's photos exceed that, so every one of them came back with
its pixel data truncated mid-stream (valid header, no `IEND`/`EOI` marker). Shipping
corrupt files would have been worse than shipping none, so they were dropped — and
**replaced with flat dark-grey placeholder images** so that layout, scrims, and aspect
ratios remain verifiable.

The placeholders are deliberately flat and textureless: if you see solid grey blocks where
a photo should be, that is what you're looking at.

Genuine assets, present and correct: the SHAKUR logo (SVG), all 11 partner logos, and
`cta-meeting.jpg` (the CTA band).

Placeholder, in `public/images/`:

```
home-hero.jpg      pv-hero.jpg        home-interior.png   rimi.png
svc-1.png          img-193d.png       img-39bf.png        img-5279.png
img-553f.png       img-575d.png       img-771e.png        img-97b7.png
img-9c88.png       img-aa46.png       img-be98.png        proj-kepler.png
proj-kuldiga.png   proj-moho.png      proj-rimi.png
```

**To fix:** drop the originals into `public/images/` under those exact filenames.
Everything resolves with no code change — the paths in `src/data.ts` and the seed already
point at them. (Alternatively, upload new covers through `/admin`, which writes them to
Supabase Storage and stores absolute URLs; `src/lib/assets.ts` resolves both shapes.)
