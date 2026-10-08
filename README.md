# Pollean System Admin Portal

Dedicated operations interface for Pollean staff (`superadmin`, `ops`, `support`). Separate from the group manager app at `app.pollean.com`.

See [PRD-System-Admin-Portal.md](./PRD-System-Admin-Portal.md) for full requirements.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- TanStack Query
- Supabase Auth (shared project with group app)
- Shared Pollean API (`/api/v1`)

## Local development

1. Copy env and fill Supabase credentials (same as group app):

```bash
cp .env.example .env.local
```

Then paste `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `pollen_frontend/frontend/.env.local`. **Restart** the dev server after editing env files.

2. Install and run (port **8081** — group app uses 8080):

```bash
npm install
npm run dev
```

3. Run the shared backend from `pollen_frontend/backend` on port **3001** (Vite proxies `/api`).

4. Sign in with a user whose `users.role` is `superadmin` (ops/support roles need a DB migration per PRD §12).

## Routes (MVP scaffold)

| Path | Access |
| --- | --- |
| `/` | Dashboard |
| `/accounts`, `/accounts/:id` | All staff |
| `/members`, `/members/:id` | All staff |
| `/funds`, `/funds/:id` | All staff |
| `/contributions`, `/contributions/:id` | All staff |
| `/kyc`, `/kyc/:id` | Ops + super admin |
| `/settlements`, `/settlements/:id` | Ops + super admin |
| `/settings/staff` | Super admin |

## Next implementation steps

1. **Backend:** platform admin API routes + extend `users.role` for `ops` / `support`
2. **KYC:** port existing superadmin KYC queue from group app into `/kyc`
3. **Dashboard:** aggregate metrics endpoint
4. **Accounts:** list/deactivate/reactivate
5. **Settlements:** request model + group-app create flow

## Deploy

Separate Vercel project (target: `admin.pollean.com`). Set `VITE_SUPABASE_*` env vars and ensure API CORS allows the admin origin..
