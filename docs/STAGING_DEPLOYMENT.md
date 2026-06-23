# Staging deployment (Railway)

Planlet uses two long-lived Git branches:

| Branch | Environment |
|--------|-------------|
| `staging` | Staging — test changes before production |
| `main` | Production |

## Git workflow

1. Work on feature branches off `staging` (or merge feature branches into `staging`).
2. Push to `staging` → Railway staging deploys automatically.
3. Run smoke tests on staging.
4. When ready, merge `staging` into `main` → production deploys.

**Safety rules**

- `main` = production only.
- `staging` = pre-production testing.
- Do not point staging at the production database.
- Do not reuse production `AUTH_SECRET`, OAuth credentials, or VAPID keys unless you accept cross-environment risk (not recommended).

---

## 1. Create the staging branch (one-time)

From your machine:

```bash
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging
```

If the branch already exists on GitHub, track it locally:

```bash
git fetch origin
git checkout staging
```

---

## 2. Railway staging service

Create a **separate** Railway project or service for staging. Do not reuse the production web service.

### Recommended setup

1. In [Railway](https://railway.app), create a new project (e.g. **planlet-staging**) or add a second service in an existing project.
2. **Connect GitHub** → select the `ozayn/planlet` repo (or your fork).
3. Set the **deploy branch** to `staging` (not `main`).
4. Add a **PostgreSQL** plugin for staging only.
5. Link the staging web service’s `DATABASE_URL` to the **staging** Postgres instance — never the production database.
6. Set a public domain:
   - Custom: `staging-planlet.ozayn.com` (DNS CNAME to Railway), or
   - Railway default: `planlet-staging.up.railway.app` (example)

Railway uses `railway.json` in this repo:

| Phase | Command |
|-------|---------|
| Build | `npm run build` |
| Start | `npm run start:railway` |

---

## 3. Staging environment variables

Set these on the **staging** web service. Use staging-only values.

```bash
DATABASE_URL=                    # staging Postgres only — not production
AUTH_SECRET=                     # openssl rand -base64 32 (staging-only)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXTAUTH_URL=https://staging-planlet.ozayn.com
NEXT_PUBLIC_APP_URL=https://staging-planlet.ozayn.com
ALLOWED_EMAILS=                  # small staging allowlist (see note below)
PLANLET_ADMIN_EMAILS=
PLANLET_REFLECTOR_EMAILS=
PLANLET_COACH_EMAILS=
PLANLET_JOB_TRACKER_EMAILS=
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:your-email@example.com
NEXT_PUBLIC_STRIPE_SUPPORT_URL=
```

Also set AI keys if you test parsing, transcription, or coaching on staging:

```bash
PLANLET_AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_TRANSCRIBE_MODEL=
OPENAI_VISION_MODEL=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
```

### Notes

- **`ALLOWED_EMAILS`** — sign-in allowlist (the codebase uses `ALLOWED_EMAILS`, not `PLANLET_ALLOWED_EMAILS`). Keep staging lists small: you + one tester is enough.
- **`NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL`** — must match the public staging URL (including `https://`).
- **Google OAuth** — in [Google Cloud Console](https://console.cloud.google.com/), add a **separate** authorized redirect URI for staging:

  ```text
  https://staging-planlet.ozayn.com/api/auth/callback/google
  ```

  (Replace with your Railway staging domain if different.)

- **VAPID keys** — generate a dedicated pair for staging (`npx web-push generate-vapid-keys`) or label shared keys clearly in Railway variable descriptions. Staging push subscriptions must not share production keys if you want isolated notification testing.
- **`AUTH_SECRET`** — use a different secret than production.

---

## 4. Run migrations after first staging deploy

After the staging web service builds successfully, apply migrations against the **staging** database once:

```bash
railway link   # select planlet-staging project/service
railway run npm run db:migrate
```

Or locally with staging `DATABASE_URL` (never production):

```bash
DATABASE_URL="postgresql://..." npm run db:migrate
```

Do **not** run `prisma migrate dev` or `prisma migrate reset` against staging from a developer machine unless you intend to wipe staging data.

---

## 5. Verify staging

1. Open the staging URL and sign in with an allowlisted Google account.
2. Run through [docs/SMOKE_TEST.md](./SMOKE_TEST.md) on staging.
3. Confirm production is unchanged (`main` branch / production service).

---

## 6. Promote to production

When staging looks good:

```bash
git checkout main
git pull origin main
git merge staging
git push origin main
```

Production Railway should deploy from `main`. Run `npm run db:migrate` on production only when new migrations ship (same as today).

---

## Quick reference: Railway CLI

```bash
# Link to staging project
railway link

# Run migrations on linked staging service
railway run npm run db:migrate

# Open staging logs
railway logs
```
