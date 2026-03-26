# FM Engine — backlog & deferred work

Items we **explicitly did not implement** (hard to test now, out of scope, or follow-up).

---

## 1. Supabase Auth — phone (SMS OTP) — **deferred**

**Why defer:** harder to test without SMS provider spend/setup; current product still uses phone lookup + `localStorage`.

**When ready:**

- Enable **Phone** provider in Supabase + Twilio (or other SMS).
- Replace auth screen with: `signInWithOtp` → `verifyOtp`.
- Bind **`profiles.id = auth.uid()`** and stop using client-only UUID for real users.
- Tighten **RLS** using `auth.uid()` and `profiles.org_id` / role.

See also: `docs/HISTORY-AND-CHANGES.md` (auth section).

---

## 2. Stricter RLS (org isolation) — **deferred**

**Current state:** anon key + broad policies (`USING (true)` on many tables) = **WARN** in Supabase linter; **`requesters`** now has RLS **on** but same permissive policy pattern.

**Next step:** after Auth, replace `Public full access` with policies scoped to `org_id` (and role) per table; use **service role** only in `api/webhook.ts` for cross-row logic if needed.

---

## 3. Webhook — unknown sender → org routing

**Current behavior:** unknown WhatsApp user attaches to **latest organization** (demo shortcut).

**Improvement:** require **site code**, org slug, or signed token in the first message; resolve `org_id` / `site_id` from DB before inserting `requesters` / `service_requests`.

---

## 4. `geminiService.extractSRInfo`

Still **unused**; webhook classifies intent inline. Either wire it for richer extraction or remove dead code.

---

## 5. Production WhatsApp (non-sandbox)

Move from Twilio sandbox to **approved WhatsApp Business**; align Dashboard QR/`wa.me` with production number and intake rules documented in runbooks.

---

## 6. Testing & CI

Add E2E or integration tests for webhook + critical Supabase paths; CI `npm run build` + `npm run lint`.

---

## 7. Optional DB performance

`pg_trgm` indexes on `phone` columns if `ilike '%suffix'` becomes hot at scale.
