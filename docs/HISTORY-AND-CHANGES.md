# FM Engine — history: before vs after (refactor pass)

This document records **what the codebase looked like before** the March 2025 refactor and **what changed**, so you can compare, roll back via Git, or onboard others without relying on chat history.

---

## 1. Product (unchanged intent)

- **WhatsApp-first CMMS**: inbound messages via Twilio → Vercel Edge `api/webhook` → Supabase; web app for admins (work orders, sites, tenants, approvals) and a **tenant portal** for residents.
- **Stack (still)**: React + Vite, Supabase (Postgres + Realtime), Twilio, Gemini on the webhook for intent classification.

---

## 2. Authentication & session — **before**

- **No Supabase Auth.** Sign-in was: enter phone → query `profiles` with `ilike` on last 10 digits → store a **`UserProfile` in `localStorage`** (`fm_engine_user`).
- New admins without a profile got a **client-generated UUID** and completed onboarding (org + site + profile upsert).
- **Security implication**: anyone with the **anon key** and permissive RLS could hit the same tables; “who is logged in” was only client-side state.

---

## 3. Authentication & session — **after (still no Supabase Auth)**

- Flow is **the same** (phone + `profiles` + `localStorage`); we did **not** add SMS OTP or JWT-based login (deferred — see `docs/BACKLOG.md`).
- **Improvement**: phone matching is normalized (`digitsOnly`, `phonesMatch`, etc.) so Twilio formats and typed digits align across SR list, detail, portal, and webhook-stored `requester_phone`.

---

## 4. Supabase client & env — **before**

- `lib/supabase.ts` used `window.process.env` with **hardcoded fallback URL and anon JWT** in code/HTML.
- `index.html` duplicated the script entry for `index.tsx` and embedded keys in a shim.

---

## 5. Supabase client & env — **after**

- Client reads **`import.meta.env.VITE_SUPABASE_URL`** / **`VITE_SUPABASE_ANON_KEY`**.
- **`vite.config.ts`** maps **`SUPABASE_URL`** and **`SUPABASE_ANON_KEY`** from `.env` into those `VITE_*` keys so one `.env` can serve API routes and the SPA.
- **`checkSchemaReady()`** returns a clear error if URL/key are missing.
- **`index.html`**: single module entry; no secrets in the HTML shim (empty `process.env` stub).
- **Placeholder client** if misconfigured: still creates a client to avoid import crashes; connection fails fast on checks.

---

## 6. Data & bugs — **before**

| Area | Issue |
|------|--------|
| `App.tsx` `fetchOrgData` | After `.single()`, code called `setOrganization(orgData.data)` — **wrong** (wiped / broke org state). |
| `AssetList` | Expected **`blocks`** prop; **App did not pass it** → runtime error when `blocks.find` ran on `undefined`. |
| `blocks` | Not loaded for the org; assets with `block_id` were unsupported in the UI data layer. |
| Realtime | `selectedSr` updated with a **stale closure** on SR `UPDATE` events. |
| Tab settings | `fm_tabs` **read** on load but **never written** when tabs changed. |
| SR IDs | Inconsistent generation (4 vs 6 digits) between tenant portal and admin. |
| Phones | `whatsapp:+1…` vs digits-only **strict equality** broke requester labels and tenant portal. |
| Dashboard | Hardcoded “avg time”; WhatsApp prefill mixed **site code** with Twilio sandbox needs. |
| `index.html` | **Two** `script` tags loading the app. |
| Webhook | Stored **raw `From`** on `requester_phone` instead of normalized digits. |
| `send-message` | `To` formatting inconsistent for WhatsApp. |

---

## 7. Data & bugs — **after**

| Area | Change |
|------|--------|
| Org fetch | `setOrganization(orgData)` only when the row exists; removed bogus `.data`. |
| Blocks | `App` loads **`blocks`** for org sites (with safe handling if table errors); passes to **`AssetList`**. |
| Realtime | `setSelectedSr(prev => …)` for updates. |
| Tabs | **`useEffect`** persists **`tabConfigs`** to `localStorage` (`fm_tabs`) whenever they change. |
| SR IDs | **`generateServiceRequestId()`** in `lib/srId.ts` (single pattern). |
| Phones | **`lib/phone.ts`**: `digitsOnly`, `phonesMatch`, `formatPhoneDisplay`, `toWhatsAppAddress`. |
| Dashboard | **Mean resolution time** from real `resolved_at` data where possible; **Twilio sandbox** prefill via **`VITE_TWILIO_SANDBOX_JOIN`** (fallback `join bad-color`); site codes shown as **routing hints**, not as the sandbox keyword. |
| `index.html` | One script; Tailwind **`fm-*`** theme; **DM Sans** + **JetBrains Mono**; `index.css` variables. |
| Webhook | **`requester_phone`** stored as **digit string** (`rawDigits`). |
| `send-message` | Uses **`toWhatsAppAddress`** from `lib/phone.ts`. |

---

## 8. UI/UX — **before**

- Light slate/blue “generic app” styling; Inter; sidebar + mobile nav without a strong FM/ops identity.

---

## 9. UI/UX — **after**

- **Operations CMMS** direction: navy sidebar, copper accent, mono for IDs/codes, renamed labels (work orders, command center, correspondence, portfolio).
- Components restyled: **Layout, Auth, Dashboard, SRList, SRDetail, TenantPortal, Settings, TwilioLive, AssetList, TenantList**, plus onboarding / DB setup / modals in **App**.
- **Settings** embeds **Twilio + Realtime** instructions (**TwilioLive**).

---

## 10. Database (Supabase) — MCP migration

Applied on project **FMEngine** (via Supabase MCP), mirrored in repo:

**File:** `supabase/migrations/20260326004028_cmms_rls_requesters_and_indexes.sql`

- **`requesters`**: **RLS enabled** + policy `requesters_public_access` (`USING (true)` — keeps current anon app working; fixes “RLS disabled in public” **ERROR**).
- **`sr_messages.sr_id`**: **NOT NULL** (verified no nulls pre-migration).
- **Indexes** for org-scoped queries: `service_requests`, `requesters` (pending), `sr_messages`, `profiles`, `tenants`.

**Not changed:** other tables still use legacy **`Public full access`**-style policies → Supabase linter **WARN**s remain until true org-scoped RLS + Auth (see backlog).

---

## 11. Files touched (high level)

**New:** `index.css`, `lib/phone.ts`, `lib/srId.ts`, `lib/metrics.ts`, `vite-env.d.ts`, `supabase/migrations/…`, `docs/*.md`.

**Modified:** `App.tsx`, `index.html`, `vite.config.ts`, `tsconfig.json`, `types.ts`, `lib/supabase.ts`, `.env.example`, `api/webhook.ts`, `api/send-message.ts`, and multiple files under `components/`.

**Note:** `services/geminiService.ts` remains **unused** by the UI (webhook uses Gemini inline).

---

## 12. Rollback

Use Git: the work is intended to live on a dedicated branch (see repo) and merge when stable.

```bash
git checkout main
# or revert the merge commit
```

Restore database only if you reverse migrations manually in Supabase SQL editor (keep backups).
