# Browser console warnings — Planlet

How to tell Planlet-owned console noise from browser extensions, dev tooling, and harmless framework messages.

## How to verify in a clean context

1. Open Planlet locally (`./scripts/dev.sh` → http://localhost:3000).
2. Open the same URL in one of:
   - **Chrome Incognito** with extensions disabled
   - A **fresh Chrome profile** with no extensions
   - **Safari** (no Chrome extensions)
3. Open DevTools → **Console**.
4. Filter by source:
   - `chrome-extension://…` → **not Planlet**
   - `planlet` / `localhost:3000` / `_next/` → investigate

If extension-style errors disappear in Incognito, they are **not Planlet bugs** and should not be patched in app code.

## Password manager hydration warnings

Dashlane, 1Password, LastPass, and similar extensions may inject attributes onto planning controls **before** React hydrates, for example:

- `data-dashlane-label`
- `data-dashlane-rid`
- `data-dashlane-classification`

Common targets: `AddItemForm`, `PrivateObservationsSection` toggle, `StatusButton`, `ItemActionsMenu`, task title buttons, and other non-auth planning UI.

**Verify in Incognito or Safari** before treating these as Planlet bugs. If the diff shows `data-dashlane-*` attributes, the warning is **extension-owned**.

Planlet adds ignore hints via `lib/password-manager-ignore.ts` on non-auth planning controls:

- `data-lpignore="true"`
- `data-1p-ignore="true"`
- `data-form-type="other"`
- `data-dashlane-ignore="true"`
- `autoComplete="off"`

Scoped `suppressHydrationWarning` is also set on these controls (`passwordManagerSafeControlProps`). This does **not** disable hydration checks app-wide.

These hints are **not** applied to login or share-email fields. Share email keeps `autoComplete="email"`.

**Example mismatch (extension-owned):**

```
- data-dashlane-label="true"
- data-dashlane-rid="…"
```

If this disappears in Incognito, no further Planlet fix is required. Dashlane may still inject attributes despite hints — that is expected extension behavior.

## Extension-owned (do not fix in Planlet)

These strings are **not present** in Planlet source (repo search: `voice-trace`, `SettingsRoutes`, `pageViewId`, `sendMessage`).

| Message pattern | Source |
|-----------------|--------|
| `chrome-extension://…` | Browser extension content scripts |
| `runtime/sendMessage: The message port closed before a response was received` | Extension messaging API |
| `Could not establish connection. Receiving end does not exist` | Extension background page not listening |
| `Cannot destructure property 'pageViewId'…` | Extension page-tracking code |
| `A listener indicated an asynchronous response…` | Extension async message handler |
| `SettingsRoutes [voice-trace]…` | Extension settings / voice feature (not Planlet) |

**Action:** Ignore in Planlet development. Disable the offending extension or use Incognito when debugging app issues.

## App-owned issues fixed

| Issue | Fix |
|-------|-----|
| Duplicate `apple-touch-icon` link | Removed manual `<link>` from `app/layout.tsx`; `metadata.icons.apple` already emits the correct tag |
| Vazirmatn font preload on English-only pages | Set `preload: false` on `Vazirmatn` in `app/layout.tsx` — font loads when RTL/Farsi content renders (`:lang(fa)`, `[dir="rtl"]`) |

## Harmless / expected warnings (no change needed)

| Message | Notes |
|---------|-------|
| `<link rel="preload" as="script">` for Turbopack HMR client | **Dev only** — injected by Next.js 16 + Turbopack |
| Plus Jakarta Sans `as="font"` preload | **Expected** — `next/font` manages primary UI font; correct `type` and `crossOrigin` |
| Next.js Dev Tools overlay button | **Dev only** |
| `node DEP0205 module.register()` in terminal | **Server/dev tooling** — not browser console |
| `[planlet]` / `[push]` `console.warn` in `lib/*` | **Server-side only** (login tracking, push failures) — not shown in browser console on normal page loads |

## Preload audit summary

| Location | Owner | Status |
|----------|-------|--------|
| `next/font` (Plus Jakarta Sans) | Next.js | Correct `as="font"`, keep preloaded |
| `next/font` (Vazirmatn) | Planlet config | Preload disabled; on-demand for RTL |
| `app/layout.tsx` manual `<link>` | Planlet | No manual preload links |
| `metadata.icons` | Next.js metadata API | Icons via `<link rel="icon">`, not preload |
| `components/audio/audio-recorder.tsx` `preload="metadata"` | Planlet | HTML `<audio>` attribute, not `<link rel="preload">` |
| Turbopack HMR chunk | Next.js dev | Dev-only script preload |

There are **no manual `<link rel="preload">` tags** in Planlet source. Preload warnings about fonts on English landing pages should be reduced after disabling Vazirmatn preload.

## CSP note

Planlet does not weaken CSP to silence console errors. Development adds `'unsafe-eval'` only for React/Next dev tooling (documented in `lib/security/content-security-policy.ts`). Production has no `'unsafe-eval'`.

## Remaining limitations

- Cannot suppress third-party extension errors from Planlet code.
- Some Next.js dev preloads may still appear in development; compare against a **production** build (`./scripts/build.sh` + `npm start`) for deployment-like console output.
- Vazirmatn may cause a brief font swap the first time RTL content appears (acceptable tradeoff vs preloading on every page).

## Quick checklist for future console reports

1. Does the stack trace include `chrome-extension://`? → Extension.
2. Does the string exist in Planlet `git grep`? → If no, likely extension or browser.
3. Does it reproduce in Incognito / Safari? → If no, extension.
4. Does it reproduce in production build only? → Likely app-owned; investigate.
5. Is it server terminal output vs browser console? → Server `console.warn` in `lib/` is intentional ops logging.
