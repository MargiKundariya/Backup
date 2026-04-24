# SkinMockup — Enterprise SDLC Operations Manual
> **Claude Code Autonomous Development Team**
> Production-grade engineering for a credit-based SaaS mockup generator.
> Every session must operate as a FAANG-calibre engineering organisation.

---

## 1. PRODUCT CHARTER

| Field | Value |
|---|---|
| **Product** | SkinMockup — Device skin & accessories mockup generator |
| **Owner** | Karmanye |
| **Target User** | Skin/accessory vendors (Shopify, Etsy, Amazon, WooCommerce) |
| **Core Value** | Upload artwork → bulk-render on every device SKU → download ZIP for store listings |
| **Monetisation** | Credit-based (1 export = 1 credit). No subscription. No PC licensing. |
| **Repository** | `/Users/anon-macmini-m4/Documents/Karmanye/Work/Client/Karmanye/SkinMockup/skin-mockup-poc` |
| **Plan File** | `~/.claude/plans/wise-zooming-whale.md` |
| **Last Sprint** | Sprint 5 ✅ (storage pipeline + design restore) |
| **Next Sprint** | Sprint 6 (device catalog 6→50+, device sets, smart filenames, onboarding) |

---

## 2. TEAM ROSTER & RESPONSIBILITIES

### 🧭 Tech Lead (Orchestrator)
- Owns architecture decisions, quality gates, cross-team unblocking
- Approves all schema changes, API contracts, and security-sensitive code
- Final sign-off on every sprint before commit
- Writes ADRs (Architecture Decision Records) for non-obvious choices

### 📋 Product Manager (PM)
- Owns the backlog priority and acceptance criteria
- Validates features match the skin-vendor persona
- Blocks features that don't serve the core workflow
- Approves sprint scope before kickoff

### 📊 Business Analyst (BA)
- Translates business rules into precise technical requirements
- Owns credit pricing logic, edge-case rules, and store-compliance specs
- Writes acceptance criteria that QA uses for test cases

### 🗓 Scrum Master (SM)
- Tracks sprint velocity, blockers, and daily standups
- Ensures no scope creep mid-sprint
- Logs all inter-role communications with timestamps
- Updates `wise-zooming-whale.md` plan checkboxes after each task

### 🎨 Designer (UX/UI)
- Owns component design tokens, spacing system, and interaction patterns
- Reviews all new UI components for Tailwind v4 CSS-variable consistency
- Ensures WCAG 2.1 AA compliance on every screen
- Design system: `src/app/globals.css` (CSS custom properties via `@theme`)

### ⚙️ Backend Engineer (BE)
- Owns: `src/lib/`, `src/hooks/`, `src/app/api/`, `infra/`
- All API routes must validate JWT via `Authorization: Bearer`
- All DB mutations go through RLS-enforced Supabase client
- No raw data URLs stored in DB — always upload to Storage first

### 🖥 Frontend Engineer (FE)
- Owns: `src/components/`, `src/app/*/page.tsx`
- All client components have `'use client'` at top
- Canvas rendering via RAF (no `setTimeout`)
- All icons: `lucide-react` — no other icon lib
- State: Zustand (`src/lib/store.ts`) — no prop drilling

### 🚀 DevOps / SRE
- Owns: `infra/`, `infra/docker-compose.yml`, `infra/migrate.sh`
- Migration rule: every DB change = new file in `infra/volumes/db/migrations/NNN_name.sql`
- Never edit `infra/volumes/db/init/00-schema.sql` after initial setup
- Secrets generated via `infra/generate-secrets.sh` — never hardcoded

### 🧪 QA Engineer
- Writes test cases for every acceptance criterion before implementation
- Validates: type-clean build (`npx tsc --noEmit`), no console errors in browser
- Security smoke tests: unauthenticated access to `/admin` → redirected
- Credit gate: export without credits → blocked at server, not just UI

### 🔒 Security Engineer
- Reviews every API route for: JWT validation, RLS bypass risk, input sanitisation
- Validates Storage RLS: user can only access their own `{userId}/` prefix
- Stripe webhook: idempotency check before crediting
- No secrets in client bundle (`SUPABASE_SERVICE_ROLE_KEY` must stay server-only)

---

## 3. COMMUNICATION LOG

> Format: `[Role → Role] Message`
> Timestamp: `DD-MM-YYYY hh:mm:ss AM/PM`

```
08-04-2026 09:00:00 AM — [PM → Tech Lead] Sprint 5 complete. Design restore confirmed working.
                          Next: Sprint 6 — device catalog expansion is the #1 unblock for vendors.
08-04-2026 09:05:00 AM — [Tech Lead → All] Sprint 6 kickoff. Scope locked:
                          6.1 Catalog (50+ devices), 6.2 Device Sets, 6.3 Smart Filenames,
                          6.4 Onboarding. No scope additions mid-sprint.
08-04-2026 09:10:00 AM — [BA → BE] Credit deduction rule confirmed:
                          1 design × 1 device = 1 credit. Batch of 20 devices = 20 credits.
                          Deduction must be atomic via DB function. UI shows cost BEFORE export.
08-04-2026 09:12:00 AM — [Security → BE] REMINDER: Stripe webhook must check
                          reference_id uniqueness before inserting credit rows.
                          Double-credit on retry = revenue loss + compliance risk.
08-04-2026 09:15:00 AM — [Designer → FE] Token system reminder:
                          Use CSS vars only (--color-accent, --color-surface, etc.)
                          No raw hex values in components. See globals.css @theme block.
08-04-2026 09:20:00 AM — [DevOps → All] Migration discipline:
                          Never ALTER live tables manually. Always a new migration file.
                          migrate.sh is idempotent — safe to re-run.
08-04-2026 09:25:00 AM — [QA → All] Definition of Done (DoD) for every task:
                          ✓ tsc --noEmit clean
                          ✓ npm run build succeeds
                          ✓ No new console.error in browser
                          ✓ Acceptance criteria from BA verified
                          ✓ Security sign-off if touching auth/payments/storage
```

---

## 4. TECH STACK (authoritative)

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.7 |
| Runtime | React + React DOM | 19.2.3 |
| Language | TypeScript (strict) | ^5 |
| State | Zustand | ^5.0.12 |
| Styling | Tailwind CSS v4 (postcss, `@theme` in globals.css) | ^4 |
| Backend | Supabase self-hosted (Kong gateway on :8000) | see docker-compose |
| Auth | Supabase GoTrue via `@supabase/ssr` | ^0.10.0 |
| Storage | Supabase Storage (`design-images` bucket, private) | — |
| DB | PostgreSQL 15 with RLS | 15.1.1.78 |
| Error Tracking | Sentry (`@sentry/nextjs`) | ^10.47.0 |
| Payments | Stripe (Sprint 7 — not yet installed) | — |
| Icons | lucide-react | ^1.7.0 |
| Zip export | JSZip | ^3.10.1 |
| File upload | react-dropzone | ^15.0.0 |

---

## 5. REPOSITORY MAP

```
src/
├── app/
│   ├── page.tsx                  — Main editor (useAutoSave + useDesignLoader wired here)
│   ├── layout.tsx                — Root layout + ToastContainer
│   ├── globals.css               — Tailwind @theme design tokens
│   ├── admin/page.tsx            — Template admin (protected by proxy.ts)
│   ├── login/page.tsx            — Email/password + GitHub OAuth
│   ├── projects/page.tsx         — Design library (auth-gated)
│   ├── api/
│   │   ├── designs/route.ts      — GET list, POST create (JWT-gated)
│   │   ├── designs/[id]/route.ts — GET, PATCH, DELETE (JWT-gated)
│   │   └── projects/route.ts     — GET list, POST create
│   └── auth/callback/route.ts    — OAuth code exchange
├── components/
│   ├── editor/
│   │   ├── MockupCanvas.tsx      — RAF canvas rendering, drag/zoom
│   │   ├── PropertiesPanel.tsx   — Right panel: transform, text, presets
│   │   ├── TransformControls.tsx — Flip, rotate, opacity controls
│   │   └── ZoneSelector.tsx      — Zone click/highlight overlay
│   ├── sidebar/
│   │   ├── Sidebar.tsx           — Left panel container + user menu
│   │   ├── DeviceCatalog.tsx     — Device picker grid
│   │   ├── DesignUploader.tsx    — Dropzone + design queue
│   │   ├── ExportSection.tsx     — Export controls + bulk queue
│   │   ├── CustomizeSection.tsx  — Fit mode, background, opacity
│   │   ├── BackgroundPanel.tsx   — Scene/background picker
│   │   └── TextPanel.tsx         — Text layer controls
│   ├── admin/
│   │   ├── TemplateManager.tsx   — List/delete device templates
│   │   ├── TemplateUploader.tsx  — Upload new template PNG
│   │   └── ZoneEditor.tsx        — Define skinnable zones
│   └── ui/
│       ├── ErrorBoundary.tsx     — Wraps all major panels
│       ├── Toast.tsx             — Global toast notifications
│       └── Button.tsx            — Design-system button
├── hooks/
│   ├── useAuth.ts               — { user, session, loading } + signIn/signOut
│   ├── useAutoSave.ts           — Debounced save: uploads images → saves metadata
│   └── useDesignLoader.ts       — Restores design from DB+Storage on mount
├── lib/
│   ├── store.ts                 — Zustand EditorState (single source of truth)
│   ├── db.ts                    — Supabase CRUD helpers (browser client, RLS)
│   ├── supabase.ts              — getBrowserClient() / getServiceClient()
│   ├── storageUpload.ts         — uploadZoneImage() → storageKey
│   ├── storageDownload.ts       — downloadZoneImages() + LRU cache (max 50)
│   ├── bulkExport.ts            — Parallel export (4 concurrent), Promise.allSettled
│   ├── compositing.ts           — Canvas compositing: zone masking + overlay
│   ├── templateProcessor.ts     — LRU cache (max 5) for processed device templates
│   ├── imageFitting.ts          — calculateFit() — cover/contain/stretch math
│   ├── gradientUtils.ts         — drawLinearGradient() — canvas gradient helper
│   ├── safeImageLoader.ts       — sanitizeTransform() — guard against NaN/Infinity
│   ├── analytics.ts             — Sentry wrapper (no-ops without DSN)
│   ├── deviceRegistry.ts        — getAllDevices() — built-in + custom templates
│   ├── templateStore.ts         — localStorage custom template persistence
│   ├── imageUtils.ts            — Image loading helpers
│   └── presets.ts               — Transform preset definitions
├── data/
│   ├── devices.ts               — builtInDevices[] — 6 devices (Sprint 6 → 50+)
│   └── backgrounds.ts           — Background scene definitions
├── types/
│   ├── index.ts                 — Transform, ZoneDesign, DeviceTemplate, etc.
│   └── database.ts              — Manual DB type mirrors (until supabase gen types)
└── proxy.ts                     — Next.js 16 middleware: guards /admin

infra/
├── docker-compose.yml           — 10 Supabase services, bind-mount volumes
├── generate-secrets.sh          — openssl-based JWT + secret generation
├── migrate.sh                   — Idempotent migration runner
└── volumes/db/
    ├── init/00-schema.sql       — Initial schema (runs on first container start)
    └── migrations/
        ├── 001_initial_schema.sql
        └── 002_storage_buckets.sql
```

---

## 6. ENVIRONMENT & LOCAL DEV

### Start Everything
```bash
# 1. Generate secrets (first time only)
cd infra && ./generate-secrets.sh

# 2. Start Supabase stack
cd infra && docker compose up -d

# 3. Apply pending migrations
cd infra && ./migrate.sh

# 4. Start Next.js dev server
npm run dev          # → http://localhost:3000
# Supabase Studio  → http://localhost:3001
# Kong API         → http://localhost:8000
# Inbucket (email) → http://localhost:9000
```

### Environment Variables
```bash
# .env.local — copy from .env.local.example
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from infra/.env ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<from infra/.env SERVICE_ROLE_KEY>

# Never expose SERVICE_ROLE_KEY to the browser — server-only
```

### Free Port (if needed)
```bash
lsof -i:3000          # check what's using the port first
pkill -f "next dev"   # kill dev server
# NEVER: killall node / killall Chrome / killall Safari
```

---

## 7. ARCHITECTURAL RULES (non-negotiable)

### Data Flow
```
User Action
  → Zustand store (src/lib/store.ts)         — single source of truth
  → Canvas re-render via RAF                 — no setTimeout
  → useAutoSave debounce (2s)
      → uploadZoneImage() to Storage         — images never in DB
      → Supabase DB update (storageKeys only)
  → useDesignLoader on page load             — restores from DB + Storage
```

### API Route Rules
- Every route reads JWT from `Authorization: Bearer <token>`
- Use `getServiceClient()` (bypasses RLS) only in API routes — never in components
- Use `getBrowserClient()` (RLS-enforced) in all React hooks and components
- All inserts must include `user_id: user.id` — RLS double-checks but BE must be explicit

### DB Rules
- Never store raw data URLs in `zone_designs` JSONB — only `storageKey` strings
- Every schema change = new migration file `NNN_name.sql` — never edit existing migrations
- `schema_migrations` table tracks applied files — `migrate.sh` is idempotent
- Atomic credit deduction via DB function (Sprint 7) — prevents race-condition double-spend

### Storage Rules
- Bucket: `design-images` (private — signed URLs required)
- Path: `{userId}/{designId}/{zoneId}.webp`
- RLS: user can only access paths where `split(name,'/')[0] = auth.uid()`
- Max file size: 10MB per zone image
- Allowed types: `image/webp`, `image/png`, `image/jpeg`

### Credit Rules (Sprint 7 — implement exactly as specified)
- 1 export = 1 credit (1 design × 1 device)
- Bulk: 1 design × 20 devices = 20 credits — shown in UI BEFORE export starts
- Deduction: server-side DB function only — client UI cannot be trusted
- Failed export = credit refund (negative `consume` row created)
- Free trial: 25 credits, 30-day expiry — purchased credits never expire
- Zero balance: export button disabled client-side + blocked server-side

---

## 8. CODING STANDARDS

### TypeScript
- `strict: true` always — no `any` unless explicitly justified with a comment
- No `@ts-ignore` without a comment explaining why
- Interfaces over types for object shapes
- Explicit return types on all exported functions

### React / Next.js
- `'use client'` required on every component that uses hooks or browser APIs
- No prop drilling beyond 2 levels — use Zustand store
- `ErrorBoundary` wraps every major panel (already in place)
- `next/image` for all static images (Sprint 9 hardening)
- Dynamic imports for heavy components (canvas, admin)

### CSS / Tailwind
- Use CSS custom properties from `globals.css @theme` — no raw hex values
- Key tokens: `bg-canvas-bg`, `bg-surface`, `bg-surface-hover`, `text-accent`,
  `text-text-primary`, `text-text-secondary`, `text-text-muted`, `border-border`
- Glass effects: `glass-sidebar`, `glass-card`, `glass-separator` utility classes
- Responsive: mobile-first, collapsible sidebars already implemented

### Git
- Commit message: `Sprint N: short description\n\n- bullet list of changes`
- No `Co-Authored-By: Claude` or AI attribution — ever
- Never `--no-verify` or `--no-gpg-sign`
- Branch for risky work: `git worktree add` via `isolation: "worktree"`

---

## 9. QUALITY GATES

Every task must pass ALL before committing:

| Gate | Command | Must Pass |
|---|---|---|
| Type check | `npx tsc --noEmit` | Zero errors |
| Build | `npm run build` | Successful, zero warnings |
| Lint | `npx eslint src/` | Zero errors |
| Auth guard | `curl localhost:3000/admin` → 302 to `/login` | Redirect confirmed |
| Storage RLS | Cross-user image access attempt | 403 Forbidden |

### Code Review Checklist (run mentally before every commit)
- [ ] No hardcoded secrets or API keys
- [ ] No `console.log` left in production code (only `console.error` for real errors)
- [ ] No synchronous file I/O or blocking operations
- [ ] All new API routes validate JWT
- [ ] All new DB tables have RLS enabled
- [ ] Error boundaries cover new panels
- [ ] ARIA labels on all interactive elements (no icon-only buttons without `aria-label`)
- [ ] New migrations are idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)

---

## 10. SPRINT TRACKING

### ✅ Completed Sprints
| Sprint | Focus | Commit |
|---|---|---|
| 1 | Production Stability (ErrorBoundary, safeImageLoader, dimension guards) | `84c41cb` |
| 2 | Performance (RAF, shallow history clone ~300MB saved, parallel exports 4×, LRU) | `699d590` |
| 3 | Code Quality + A11y (imageFitting.ts, gradientUtils.ts, WCAG 2.1, collapsible sidebars) | `06ce4e0` |
| 4 | SAAS Infrastructure (Supabase Docker, auth, API routes, login, useAutoSave, /projects) | `9975772` + `8ab72e8` |
| 5 | Real Persistence (Storage upload pipeline, design restore, migration system) | `070a271` |

### 🔄 Sprint 6 — Vendor Workflow (current)
**Goal:** Make the core vendor workflow fast and complete.

#### 6.1 Device Catalog Expansion (6 → 50+ devices) — BE + Designer
**Acceptance Criteria (BA):**
- Phones: iPhone 16 series (4), iPhone 15 series (4), Samsung S24 series (6), Pixel 9 series (3), OnePlus 12/13, Xiaomi 14/14 Ultra
- Tablets: iPad Pro 13" M4, iPad Air M2 (11"+13"), iPad mini 7, Samsung Tab S9/S9+, Surface Pro 11
- Laptops: MacBook Air 13"/15" M3, MacBook Pro 14"/16" M3, Dell XPS 15, HP Spectre 14, Lenovo ThinkPad X1, Surface Laptop 6, ASUS ZenBook 14, Razer Blade 15
- Watches: Apple Watch Ultra 2, Series 10, Samsung Galaxy Watch 7, Pixel Watch 3
- Category filter chips in DeviceCatalog: All / Phones / Tablets / Laptops / Watches
- Search by name in catalog
- "New" badge for recently added devices
- **Files:** `src/data/devices.ts`, `public/templates/**/*.png`

#### 6.2 Device Sets ("My Lineup") — BE + FE
**Acceptance Criteria:**
- User can name and save a set of device IDs from the export section
- Saved sets appear in a dropdown — one click selects all devices in set
- `device_sets` table: `id, user_id, name, device_ids[], created_at`
- CRUD via `/api/device-sets/route.ts` (JWT-gated)
- **Migration:** `003_device_sets.sql`
- **Files:** `src/app/api/device-sets/`, `src/components/sidebar/ExportSection.tsx`

#### 6.3 Smart Export Filenames — FE + BA
**Acceptance Criteria:**
- Template engine: `{brand}-{model}-{design}-{scale}x.{ext}`
- Tokens: `{brand}`, `{model}`, `{model-slug}`, `{design}`, `{design-slug}`, `{scale}`, `{ext}`, `{date}`, `{index}`
- Live filename preview below the input field
- 5 presets: Store Listing, Internal, Shopify, Etsy, Amazon
- Slugification: spaces→hyphens, lowercase, strip special chars
- **Files:** `src/lib/filenameTemplate.ts`, `src/components/sidebar/ExportSection.tsx`

#### 6.4 Onboarding — FE + Designer
**Acceptance Criteria:**
- `localStorage` flag `onboarding_complete` — suppress after first export
- Tooltip sequence: pick device → upload art → export (3 steps)
- Sample design auto-loaded on first visit (dismissible)
- Top 3 popular phones pre-selected on first load
- **Files:** `src/hooks/useOnboarding.ts`, `src/components/ui/OnboardingTip.tsx`

### 📅 Upcoming Sprints
| Sprint | Focus |
|---|---|
| 7 | Credits & Monetisation (Stripe, credit gate on export, free trial trigger) |
| 8 | Store Integrations (Shopify OAuth, WooCommerce API, compliance export presets) |
| 9 | DevOps & Production (GitHub Actions CI/CD, prod Docker, DB backups, rate limiting) |

---

## 11. DECISION LOG

| Date | Decision | Rationale | Owner |
|---|---|---|---|
| 07-04-2026 | Supabase self-hosted | Data sovereignty, no vendor lock-in | Tech Lead |
| 07-04-2026 | RAF for canvas | 33fps → 60fps smooth drag | FE |
| 07-04-2026 | Shallow history clone | Deep clone was copying 300MB of data URLs × 50 entries | BE |
| 07-04-2026 | Promise.allSettled for exports | Per-job errors don't abort the whole batch | BE |
| 08-04-2026 | Credits over subscription | Bursty vendor usage; subscription charges idle months | PM |
| 08-04-2026 | Credits over PC licensing | Browser fingerprint unstable (incognito, cookies) | BA |
| 08-04-2026 | Drop Team Workspaces | Skin vendors are solo/2-person — not enterprise | PM |
| 08-04-2026 | Drop Share Links | Vendors generate for their own store, not client review | PM |
| 08-04-2026 | Store integrations Sprint 8 | Core workflow must be solid before integrations | Tech Lead |
| 08-04-2026 | storageKey in zone_designs | Raw data URLs in DB = 200KB+ per zone × N designs = unscalable | BE + Security |
| 08-04-2026 | isLoadingDesign flag in store | Prevents auto-save from overwriting storageKeys during restore | BE |
| 08-04-2026 | proxy.ts over middleware.ts | Next.js 16 deprecates middleware.ts convention | DevOps |

---

## 12. KNOWN BLOCKERS & OPEN ITEMS

| ID | Item | Owner | Sprint | Status |
|---|---|---|---|---|
| B-001 | Stripe keys not yet configured | DevOps | 7 | Open |
| B-002 | Device template PNGs for 50+ devices needed | Designer | 6 | Open |
| B-003 | `supabase gen types typescript` not yet run (manual types in database.ts) | BE | 6 | Open |
| B-004 | Sentry DSN not set (no-ops silently) | DevOps | 9 | Acceptable |
| B-005 | No automated tests (Sprint 9 will add Playwright E2E) | QA | 9 | Open |

---

## 13. SECURITY POSTURE

### Current (Sprint 5)
- ✅ JWT validation on all API routes
- ✅ RLS on all DB tables (owner-only)
- ✅ Storage RLS (userId prefix check)
- ✅ `/admin` protected by proxy.ts auth guard
- ✅ `sanitizeTransform()` guards canvas inputs
- ✅ `SUPABASE_SERVICE_ROLE_KEY` server-only (not prefixed `NEXT_PUBLIC_`)
- ✅ No raw data URLs in DB (storageKey pattern)
- ⚠️ No rate limiting yet (Kong config exists but not enforced — Sprint 9)
- ⚠️ No CSRF protection (stateless JWT — low risk but document)
- ⚠️ No email verification enforcement (Sprint 7 pre-export gate)

### Security Rules (enforced every sprint)
1. Every new API route → Security reviews JWT check
2. Every new DB table → RLS enabled + owner policy added
3. Every new Storage operation → path prefix = `auth.uid()`
4. Credit deduction → server-side DB function only
5. Stripe webhook → check `reference_id` idempotency before crediting

---

## 14. PRODUCTION READINESS CHECKLIST

- [x] Error boundaries on all panels
- [x] Input validation + sanitizeTransform
- [x] Memory < 500MB for 50-design sessions (shallow history clone)
- [x] Parallel export (4 concurrent jobs)
- [x] Accessible — WCAG 2.1 aria-* pass
- [x] Collapsible sidebars
- [x] Auth (login, OAuth, session management)
- [x] API routes with JWT auth
- [x] Supabase self-hosted with secure secrets
- [x] Image persistence to Storage
- [x] Design restore from library
- [x] Migration system (migrate.sh)
- [ ] 50+ device templates
- [ ] Device Sets
- [ ] Credit system + Stripe
- [ ] Email verification gate before export
- [ ] GitHub Actions CI/CD
- [ ] Kong rate limiting (anon: 30/min, auth: 300/min, export: 100/hr)
- [ ] Automated DB backups (pg_dump → S3/R2)
- [ ] CSP + HSTS headers
- [ ] Bundle < 200KB initial JS

---

## 15. HOW TO OPERATE THIS PROJECT (for Claude)

### Session Start Protocol
1. Read this file (already loaded as CLAUDE.md)
2. Check `~/.claude/plans/wise-zooming-whale.md` for current sprint status
3. Read `~/.claude/projects/.../memory/MEMORY.md` for session context
4. Identify the next incomplete task and announce it

### Before Writing Any Code
- Read the files you are about to modify — never edit blind
- Check if a utility already exists (`imageFitting.ts`, `gradientUtils.ts`, etc.)
- Run `npx tsc --noEmit` first to get baseline error count

### After Writing Code
- Run `npx tsc --noEmit` — must be zero errors
- Run `npm run build` — must succeed
- Update `wise-zooming-whale.md` plan checkboxes
- Commit with descriptive message (no AI attribution)

### Multi-Agent Usage
- Use `isolation: "worktree"` for: Stripe integration, DB migrations, auth changes
- Use parallel agents for: device catalog data files (split by category)
- Use Explore agent for: finding files, understanding unfamiliar code
- Use Plan agent for: sprint architecture before implementation

### Never Do
- Never store raw data URLs in the database
- Never use `any` without a justification comment
- Never skip the `isLoadingDesign` check in auto-save
- Never call `getServiceClient()` from a React component
- Never edit an existing migration file — always create a new one
- Never hardcode secrets — all from env vars
- Never kill browser processes to free ports
