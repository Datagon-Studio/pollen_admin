# System Admin Portal — Progress Tracker

Tracks implementation against [PRD-System-Admin-Portal.md](./PRD-System-Admin-Portal.md).

**Repos:** `pollen_admin` (portal UI) · `pollen_frontend/backend` (shared API)

**Last updated:** 2026-09-16

---

## Legend

| Status | Meaning |
| --- | --- |
| ✅ Done | Shipped and wired end-to-end |
| 🟡 Partial | Scaffold or API-only; UI or edge cases remain |
| ⬜ Not started | Planned in PRD, not implemented |

---

## Infrastructure & auth

| Item | Status | Notes |
| --- | --- | --- |
| `pollen_admin` Vite/React/Tailwind scaffold | ✅ | Port 8081, proxy to backend |
| Supabase sign-in | ✅ | Real auth + session refresh |
| Staff role gate (`superadmin`) | ✅ | `users.role = superadmin` required |
| Staff middleware (`ops` / `support` ready) | 🟡 | Code supports roles; DB constraint still `admin` / `superadmin` / `user` only |
| Dev bypass (local UI only) | ✅ | No API token — use real sign-in for data |
| CORS / Vite proxy | ✅ | Leave `VITE_API_URL` unset locally |
| Pollean theme (amber/cream palette) | ✅ | Ported from `pollen_frontend` |
| Light / dark mode | ✅ | `next-themes`, toggle in header |

---

## Backend — `/api/v1/admin/*`

| Endpoint | Status | Notes |
| --- | --- | --- |
| `GET /admin/dashboard` | ✅ | Platform metrics + 12-month trend |
| `GET /admin/accounts` | ✅ | All accounts + aggregates |
| `GET /admin/accounts/:id` | ✅ | Account detail |
| `POST /admin/accounts/:id/deactivate` | ✅ | Superadmin + reason |
| `POST /admin/accounts/:id/reactivate` | ✅ | Superadmin + reason |
| `GET /admin/members` | ✅ | Cross-account memberships + identity hints |
| `GET /admin/members/:id` | ✅ | Detail, other groups, contributions (`?scope=all`) |
| `GET /admin/funds` | ✅ | System-wide funds + collected totals |
| `GET /admin/funds/:id` | ✅ | Fund detail + recent contributions |
| `GET /admin/contributions` | ✅ | Ledger (latest 500), filters |
| `GET /admin/contributions/:id` | ✅ | Contribution detail |
| `GET /admin/accounts/:id/team` | ✅ | Managers + officers from `user_accounts` |
| `GET /admin/accounts/:id/kyc` | ✅ | Account KYC record + status |
| `GET /admin/audit-logs` | ✅ | Platform-wide or `?accountId=` scoped |

### KYC (on `/accounts/kyc/*`, staff-gated)

| Endpoint | Status | Notes |
| --- | --- | --- |
| `GET /accounts/kyc/all` | ✅ | Staff read |
| `POST /accounts/:id/kyc/verify` | ✅ | Compliance staff |
| `POST /accounts/:id/kyc/reject` | ✅ | Compliance staff |
| `GET /accounts/kyc/document-url` | ✅ | Signed URLs for documents |

---

## Admin portal UI (`pollen_admin`)

| Route | Status | Notes |
| --- | --- | --- |
| `/` Dashboard | ✅ | Live metrics + trend chart |
| `/accounts` | ✅ | Search, filters, table |
| `/accounts/:id` | ✅ | Tabs: overview, members, funds, team, contributions, KYC, audit |
| `/audit` | ✅ | Platform audit log + account ID filter |
| `/members` | ✅ | Cross-account table, verification filter |
| `/members/:id` | ✅ | Other groups, this-account / all-groups contributions |
| `/funds` | ✅ | System-wide table |
| `/funds/:id` | ✅ | Metadata + contributions |
| `/contributions` | ✅ | Ledger table + filters |
| `/contributions/:id` | ✅ | Read-only detail |
| `/kyc` | ✅ | Queue, verify/reject, documents |
| `/kyc/:id` | ⬜ | Detail route exists as placeholder |
| `/settlements` | ⬜ | Placeholder — needs settlement request schema |
| `/settlements/:id` | ⬜ | Placeholder |
| `/settings/staff` | ⬜ | Placeholder — needs staff CRUD API |

---

## PRD features — remaining

### High priority

| Feature | Status | Notes |
| --- | --- | --- |
| Settlement requests (schema + API + queue) | ⬜ | PRD §8.6 — `settlement_requests` table does not exist yet |
| Staff management (invite ops/support/superadmin) | ⬜ | PRD §8.7 |
| Extend `users.role` constraint for `ops`, `support` | ⬜ | SQL migration needed |
| KYC email notifications on approve/reject | ⬜ | PRD should-have |

### Medium priority

| Feature | Status | Notes |
| --- | --- | --- |
| Pagination on large tables | ⬜ | Members/funds/contributions load full sets (contributions capped at 500) |
| Date range filter UI (contributions) | 🟡 | API supports `dateFrom` / `dateTo`; UI not wired |
| Account-scoped default filter from global list pages | 🟡 | Account detail tabs are scoped; global lists still show all |
| Fund settlement status column | ⬜ | Blocked on settlement requests |
| Remove KYC UI from group app (`/kyc-verification`) | ⬜ | PRD cutover |
| Audit log pagination / date filters | 🟡 | Latest 100 events; category + account filters |
| Africa/Accra timezone for dashboard month boundaries | ⬜ | MVP uses local/UTC approximation |

### Lower priority / polish

| Feature | Status | Notes |
| --- | --- | --- |
| shadcn Table, Select, Toast components | 🟡 | Native tables + minimal UI for speed |
| `/kyc/:id` dedicated detail page | ⬜ | Queue expandable rows cover MVP |
| Deployment (Vercel env, production URLs) | ⬜ | `ADMIN_FRONTEND_URL` in backend env |
| E2E tests | ⬜ | |
| Role-based nav for `ops` / `support` when DB roles exist | 🟡 | Nav logic exists; roles not in DB |

---

## Group app fixes (related, mostly done)

| Item | Status |
| --- | --- |
| Edit member email OTP | ✅ |
| Collector invite / wrong account after sign-in | ✅ |
| CORS for admin portal | ✅ |

---

## Local dev checklist

```bash
# Terminal 1 — backend
cd pollen_frontend/backend && npm run dev   # :3001

# Terminal 2 — admin portal
cd pollen_admin && npm run dev              # :8081
```

1. Sign in with a user where `public.users.role = 'superadmin'`.
2. Do **not** use dev bypass if you need live API data.
3. Keep `VITE_API_URL` unset in `pollen_admin/.env.local` (Vite proxies `/api`).

**Promote a user to superadmin (Supabase SQL):**

```sql
UPDATE public.users SET role = 'superadmin' WHERE email = 'your@email.com';
```

---

## Suggested next steps

1. **Settlement requests** — schema, group-manager create flow, admin queue (ops+).
2. **Staff management** — list/invite/revoke portal users.
3. **DB migration** — add `ops` and `support` to `users.role` check constraint.
4. **Production deploy** — link `pollen_admin` on Vercel, set `ADMIN_FRONTEND_URL`.
5. **Pagination** — members, funds, contributions, audit tables at scale.
