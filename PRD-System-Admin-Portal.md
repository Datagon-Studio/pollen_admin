# PRD: Pollean System Admin Portal

| Field | Value |
| --- | --- |
| Product | Pollean |
| Document | System Admin Portal — Product Requirements |
| Status | Draft |
| Date | 16 September 2026 |
| Audience | Product, engineering, design, operations |
| Related | `PRODUCT.md`, `TechnicalRequirements.md` |

---

## 1. Summary

Pollean currently has two customer-facing surfaces: the **group manager / collector dashboard** and the **group member portal**. Platform operations (KYC review, account health, settlements, support) are either missing or squeezed into the group dashboard as a thin superadmin screen.

This PRD defines a third interface: the **System Admin Portal** — a dedicated operations product for the Pollean team. It will live in a **separate repository**, share the same backend and data, and become the only place Pollean staff approve KYC, inspect all accounts, and process settlement requests.

Staff access is **tiered**: not every admin can do everything. Roles follow least privilege — support can search and inspect, operations can process KYC and settlements, and super admins can also change account lifecycle and manage staff.

The portal is **not** for group managers, officers, collectors, or members.

---

## 2. Problem

1. **No operator home.** Pollean staff cannot see platform-wide accounts, funds, members, contributions, or settlements without logging into a single group context.
2. **KYC lives in the wrong product.** Approval is a superadmin page inside the group dashboard (`/kyc-verification`). That mixes internal compliance work with customer UX and will not scale.
3. **Settlement operations are incomplete.** Groups can store bank / MoMo destinations. There is no request → review → payout status flow for ops, and no per-fund settlement tracking.
4. **Account lifecycle is unused.** Accounts already have `active | inactive | suspended`, but operators cannot deactivate an account from a UI.
5. **Audit risk.** Contributions can be hard-deleted. Online payments and financial records must remain reconstructable.
6. **Multi-group people look like duplicates.** The same person can belong to several groups as separate member records. Ops tools must show that clearly without collapsing distinct group activity.

---

## 3. Goals

1. Give Pollean system admins a dedicated portal to **observe and operate the whole platform**.
2. Move **KYC review** out of the group dashboard and into this portal.
3. Let ops **list, inspect, and deactivate accounts**; view members, funds, contributions, and settlements across all groups.
4. Let ops **process settlement requests** (pending → successful / canceled) and notify the right people.
5. Treat **financial records as immutable** for audit: archive / reverse, never hard-delete online contributions; restrict manual contribution deletion.
6. Handle **multi-group membership** without duplicate-looking people and without mixing one group’s actions with another.
7. Ship as a **separate frontend** that talks to the existing Pollean API and does not grant system-admin powers to group roles.
8. Enforce **role-based access** inside the portal so each staff member sees only the actions their level allows.

### Non-goals (this release)

- Replacing the group manager dashboard or member portal.
- Letting system admins create, edit, or record contributions.
- Full accounting, bookkeeping, or a general ledger.
- Acting as a bank, wallet, or lender.
- Member-facing features (join, pay, OTP portal).
- Impersonating a group manager session (nice-to-have later; not MVP).
- Automated Paystack settlement batching / provider payouts (ops marks status; money movement may remain manual in v1).
- Platform billing or pricing plans.
- Fine-grained custom permissions per user (fixed roles only in v1).

---

## 4. Product context: three interfaces

Pollean will have three distinct products that share one backend and one data model.

| # | Interface | Who | Job | Repo / host (target) |
| --- | --- | --- | --- | --- |
| 1 | **System Admin Portal** | Pollean staff (`users.role ∈ { superadmin, ops, support }`) | Platform ops, compliance, support, settlements | New repo. Proposed host: `admin.pollean.com` |
| 2 | **Group workspace** | Group manager (account admin), collector / officer, viewer | Run one group: members, funds, contributions, expenses, reports, public page, KYC *submit*, settlement *destination* | Existing app: `app.pollean.com` |
| 3 | **Group member portal** | Members / contributors (no login) | Join, view progress, pay, see own history via OTP | Existing public routes on `app.pollean.com` |

**Hard boundary:** a group manager is not a system admin. Collectors and members never see this portal. A Pollean staff user who also belongs to a test group uses **this** portal for ops and the **group workspace** only when acting as that group.

```
                    ┌─────────────────────────┐
                    │   Pollean backend API   │
                    │   + Supabase (source of │
                    │     truth)              │
                    └───────────┬─────────────┘
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
 ┌────────────────┐   ┌─────────────────┐   ┌──────────────────┐
 │ System Admin   │   │ Group workspace │   │ Member portal    │
 │ Portal         │   │ Manager /       │   │ Public + OTP     │
 │ (this PRD)     │   │ Collector       │   │                  │
 └────────────────┘   └─────────────────┘   └──────────────────┘
```

### Language

| Prefer | Notes |
| --- | --- |
| **Account** | Canonical entity in API/DB. In this portal, the primary label is **Account**. Always show the group’s public name. |
| **Group** | Customer-facing synonym. Use in copy that refers to what members see (“this member’s group”). |
| **Member** | A person **in a specific account**. Not a login user. |
| **Person / identity** | Same phone or email across accounts. Used only to group memberships, never as a substitute for the membership record. |
| **Fund** | Collection bucket inside an account. |
| **Contribution** | Payment or recorded amount into a fund. Channel: **Online** (Paystack) or **Manual** (offline / collector). |
| **Collector** | UX name for account role `officer`. |
| **Staff admin** | Any Pollean employee with portal access. Platform roles: `superadmin`, `ops`, or `support`. |
| **Super admin** | Highest staff tier. Full portal access including account lifecycle and staff management. |
| **Ops** | Staff tier for compliance and payouts. KYC + settlements + read everything; no account deactivation or staff management. |
| **Support** | Read-only staff tier. Search and inspect across the platform; no mutations. |
| **Settlement request** | Ops object: a group asks Pollean to settle collected funds for a fund. Distinct from **settlement details** (bank / MoMo destination on the account). |

---

## 5. Users and jobs

### Primary: Staff admins (Pollean operations)

Three fixed portal roles. A user has exactly one. Group-manager platform role `admin` does **not** grant portal access.

| Role | Typical person | Primary jobs |
| --- | --- | --- |
| **Super admin** | Engineering lead, head of ops | Everything below, plus deactivate/reactivate accounts, manage staff roles, view audit-sensitive actions |
| **Ops** | Compliance, finance, senior support | KYC queue, settlement processing, platform dashboard, inspect any account/member/fund/contribution |
| **Support** | Front-line support | Search and inspect to answer customer questions; read-only everywhere |

**All staff admins** need to:

- See whether the platform is healthy (accounts, collections, trends) — dashboard visible to all tiers.
- Open any account and understand its money, members, funds, and KYC state.
- Answer “what did this person pay, in which group?” without confusing memberships.

**Ops and super admin** additionally need to:

- Approve or reject KYC so groups can collect online.
- Process settlement requests and keep groups informed.

**Super admin only:**

- Deactivate or reactivate an account that should no longer operate.
- Invite, change role, or revoke other staff admins.

**No staff admin** needs to:

- Run a group’s day-to-day (add members, record dues, edit funds).
- Change contribution amounts.

### Secondary: Group manager (affected, not a user of this portal)

- Submits KYC in **account settings** and sees approval status there.
- Creates settlement requests (new capability in the group workspace — dependency of this portal).
- Sees account status (active / deactivated) and cannot collect online if deactivated or unverified.

### Secondary: Member (affected, not a user of this portal)

- Sees KYC / payment availability only inasmuch as the public portal allows or hides **Contribute**.
- Must never see another group’s activity mixed into theirs.

---

## 6. Design principles

1. **Observe first, mutate rarely.** Most screens are read-only. Writes are explicit: deactivate account, approve/reject KYC, change settlement status.
2. **One source of truth.** This portal never stores a parallel copy of accounts, members, or money. It reads and writes the shared API.
3. **Membership is the row; identity is the hint.** Tables are account-scoped memberships. Duplicate names are expected; phone/email clustering explains them.
4. **Actions are always scoped to one account.** A button that affects Group A must not be reachable from Group B’s context.
5. **Financial records are append-only.** Status changes and archives, not deletes.
6. **Customer products stay clean.** After launch, group workspace nav must not contain KYC verification or other staff tools.
7. **Least privilege.** UI hides actions the signed-in role cannot perform. API rejects them even if called directly.

---

## 7. Information architecture

```
/                    Dashboard
/accounts            Accounts
/accounts/:id        Account detail
/members             Members
/members/:id         Member (membership) detail
/funds               Funds
/funds/:id           Fund detail
/contributions       Contributions
/contributions/:id   Contribution detail (read-only)
/settlements         Settlement requests
/settlements/:id     Settlement request detail
/kyc                 KYC queue
/kyc/:id             KYC submission detail
```

Global chrome: search (account name, member name, email, phone), environment indicator if staging vs production, signed-in staff identity (name + role badge), sign out.

**Role-aware nav:** all tiers see Dashboard, Accounts, Members, Funds, Contributions. KYC and Settlements appear for **ops** and **super admin** only. **Settings → Staff** (manage portal users) appears for **super admin** only.

Deep links between objects are required (see §9). Breadcrumbs always include the parent account. Direct URLs to a page the role cannot use show a **403 / Not authorized** screen, not a broken partial view.

---

## 8. Feature requirements

### 8.1 Admin dashboard (manager view)

**Purpose:** Platform pulse for ops. Not a group dashboard.

**Metrics (always labeled as platform-wide, GH₵):**

| Metric | Definition |
| --- | --- |
| Total accounts | Count of all accounts, including inactive / suspended |
| Active accounts | `status = active` |
| Inactive / deactivated accounts | `status = inactive` (and show suspended separately if any) |
| Active funds | Funds with `is_active = true` across all accounts |
| Total funds | All funds, active + inactive |
| Overall collected | Sum of **confirmed** contributions (online + manual) across all accounts |
| Collected this month | Same, current calendar month (Africa/Accra) |

**Charts / trends:**

- Monthly collection trend (last 12 months): total confirmed amount, split **Online vs Manual**.
- Optional secondary line: new accounts created per month.

**Lists / shortcuts:**

- Accounts pending KYC (count + link to KYC queue).
- Settlement requests in `pending` (count + link).
- Recently deactivated accounts.

**Actions from dashboard:**

- Deactivate is **not** a dashboard bulk action. It lives on account detail, with a confirmation. Dashboard may deep-link to an account.

**Empty / error:** If totals fail to load, show the failed widget in error state; do not display `0` as if it were real.

---

### 8.2 Accounts view

**Purpose:** Table of every organization account on Pollean.

**Table columns:**

| Column | Source / notes |
| --- | --- |
| Account name | `account_name` + logo thumbnail |
| Status | Active / Inactive / Suspended |
| KYC | Unverified / Pending / Verified / Rejected |
| Members | Member count |
| Funds | Fund count (optionally “N active”) |
| Total collected | Confirmed contributions |
| Manual vs online | Amount or % split |
| Settlement | Outstanding pending request amount, or “None pending” |
| Created | Account created date |

**Behavior:**

- Click row → account detail.
- Search: name, account id, short URL / slug.
- Filters: status, KYC status, has pending settlement, created date range.
- Sort: name, created, total collected, member count.
- Pagination.

**Account detail** must show:

- Identity: name, logo, id, public page URL, created at.
- Status + **Deactivate** / **Reactivate** (and Suspend if used for compliance).
- KYC status + link to KYC record.
- Settlement destination summary (bank / MoMo, masked account number) — read-only.
- KPI strip: total collected, this month, funds count, members count, manual vs online.
- Tabs or linked tables: Funds, Members, Contributions, Settlement requests, KYC, Activity (account-scoped audit log).
- Group workspace admins / collectors (users linked via `user_accounts`) — names, emails, roles. Read-only.

**Deactivate account**

| Rule | Requirement |
| --- | --- |
| Who | Super admin only |
| Confirm | Modal: reason (required), what will happen |
| Effect | `account.status → inactive`. Online Contribute hidden. Group workspace remains visible to that group’s managers so they can see historical data, with a persistent banner: “This account is deactivated.” New online payments blocked. Public join may remain or be blocked — see Open questions. |
| Not allowed | Hard-delete of the account or its records |
| Audit | Log actor, previous status, new status, reason |
| Reactivate | Allowed; also requires reason + audit |

Deactivate is **not** KYC reject and **not** fund deactivate. Those are separate.

---

### 8.3 Members view

**Purpose:** See every **membership** across accounts, then understand the person behind it.

**Table columns:**

| Column | Notes |
| --- | --- |
| Name | Membership name |
| Email | |
| Phone | |
| Account | Parent account name (link) |
| Also in | If the same identity exists in other accounts, show “+N groups” (not a second full row of the same membership) |
| Status | Active if phone or email verified (existing rule) |
| Contributions | Count and/or confirmed total **in this account** |
| Joined | `created_at` |

**Search / filters:** name, email, phone, account, verified/unverified.

**Click row → membership detail**, which is always titled with **name + account**.

Membership detail:

- This membership’s fields (name, contact, membership number, verification).
- Parent account (link).
- **Other groups for this person** (see §9): list of other memberships matched by verified phone and/or verified email. Each row is a link to that membership in that account. No combined “edit all groups” action.
- Contribution history **for this account only** as the default table.
- Toggle or second tab: “All groups” contribution history, with a mandatory **Account** column so rows cannot be mistaken for one group.

**Staff admins cannot:** add, edit, delete, or merge members in v1. (Identity grouping is display-only.)

---

### 8.4 Funds view

**Purpose:** All funds, system-wide.

**Table columns:**

| Column | Notes |
| --- | --- |
| Fund name | |
| Account | Link to account |
| Amount collected | Confirmed contributions for this fund |
| Goal | `fund_goal` if set |
| Visibility | Public / Private (`is_public`) |
| Status | Active / Inactive (`is_active`) |
| Settlement | Latest request status for this fund, if any |

**Click → fund detail:**

- Fund metadata, parent account, active/public flags (read-only).
- Collected vs goal.
- Contributions for this fund (read-only table).
- Settlement requests for this fund.
- Staff admins do **not** create, edit, activate, or deactivate funds (group managers do).

---

### 8.5 Contributions view

**Purpose:** Read-only ledger of all contributions.

**Table columns:** Date, Member (or “Anonymous”), Account, Fund, Amount, Channel (Manual / Online), Status, Payment reference (online).

**Filters:** account, fund, channel, status, date range, member search.

**Every row links to:** parent account, fund, membership (if present).

**Permissions:** **No create, no edit, no delete** for any staff admin.

**Status display** uses existing values: pending, confirmed, failed, reversed, pledge. Reversed / archived rows remain listed (not hidden by default; filterable).

Detail drawer/page: amount, dates, channel, collector (`received_by_user_id`) for manual, Paystack reference for online, comments, related settlement if any.

---

### 8.6 Settlements view

**Purpose:** Ops queue for **settlement requests** — a group asking Pollean to settle collected funds for a **fund**.

This is distinct from **settlement details** (where money should go), which remain configured by the group manager in the group workspace.

#### Lifecycle

```
Group manager creates request
        → status: pending
        → email to Pollean ops (+ copy to requesting manager)
Ops or super admin reviews
        → successful  (payout done)
        → canceled    (will not pay; reason required)
```

No skip from empty to successful without a request record.

#### Table columns

Request id, date created, account, fund, requested amount, destination summary (bank/MoMo masked), status, updated at.

Filters: status, account, fund, date.

#### Detail

- Account + fund (links).
- Amount requested vs amount collected on that fund vs already settled (sum of successful requests for that fund).
- Destination snapshot **at request time** (do not silently use a destination edited later).
- Requester (group manager user).
- Status history (who, when, from → to, note).
- Actions: Mark successful, Cancel — both require a note. Successful may record provider reference / transfer date.

**Track per fund:** fund detail and account detail list all requests for that fund. Prevent over-settling in UX: warn if requested amount > unsettled confirmed online (and/or total) balance. Exact eligible-balance rule is an Open question.

#### Email when a request is created

- Trigger: request created (from group workspace).
- Recipients: Pollean ops inbox (configurable) and the requesting manager.
- Content: account name, fund name, amount, destination type, link to admin detail (ops) / status page (manager).
- Failure to send email must not block request creation; log the failure.

#### Group workspace dependency (required for this feature)

Group managers need a **Create settlement request** action (per fund or from a Settlements section). Officers / collectors cannot create requests. Members never see this.

Until that UI exists, ops cannot receive requests except via a temporary internal create path — do not ship Settlements as “done” without the manager-side create flow.

---

### 8.7 KYC management

**Purpose:** The only place Pollean staff approve or reject KYC. Moved off the group dashboard.

**Queue table:** account name, official name, type (individual / business), submitted at, status, assigned/reviewed by.

Filters: status (default **Pending**), type, search.

**Detail:**

- Account link.
- Type, official name, submitted timestamps.
- Document viewer (existing signed URLs): national ID (required); passport photo (individual); business registration (business).
- Actions: **Approve**, **Reject** (rejection reason required, shown to the group manager).

**Effects:**

| Action | Account `kyc_status` | Group manager sees | Member portal |
| --- | --- | --- | --- |
| Approve | `verified` | Verified; online payments available (if account active and destination set) | Contribute enabled (existing gate) |
| Reject | `rejected` | Rejected + reason; can resubmit from settings | Contribute remains hidden |
| Pending | `pending` | “Under review” | Contribute hidden |

**Move from account settings:**

- **Keep** in group settings: document upload / resubmit, current status, rejection reason.
- **Remove** from group workspace: `/kyc-verification` route, nav item, and any superadmin-only KYC UI.
- Group managers never approve their own KYC.

**Notifications (should have):** email (and existing notification channel if already used) to account admins on approve and reject.

---

## 9. Multi-group members (no false duplicates)

### Reality in data

A member row belongs to **one** `account_id`. The same person may join many groups → many member rows. Phone and email uniqueness is **per account**, not global. Auth users (managers/collectors) may also link to multiple accounts via `user_accounts`; that is a different concept from member memberships.

### UX rules

1. **Default lists are memberships**, not a de-duplicated people directory. Two rows named “Ama Boateng” in two accounts are correct if they are two memberships.
2. **Identity cluster:** if verified phone and/or verified email match, show a non-blocking hint: “Same contact in N other groups.” Unverified contact is **not** used for matching (too collision-prone).
3. **Never merge rows in v1.** Ops must not collapse two memberships into one. Contributions stay on the membership that received them.
4. **Every amount, history, and action is labeled with the account name.** Cross-group history is opt-in and always includes an Account column.
5. **Filters default to one account** when the user arrived from an account detail. Clearing the filter is explicit (“All accounts”).
6. **Collectors / managers** who appear as both a `user` and a `member` are not auto-merged with member identity. Show both facts if both exist; do not imply they are the same record.

### Copy pattern

> Ama Boateng · **St. Mary’s Welfare**  
> Also a member of Youth Choir and Teachers’ Association

Not: “Ama Boateng (3 accounts)” as a single editable person.

---

## 10. Records, deletion, and audit trail

Applies to **all three interfaces**. The System Admin Portal must obey these rules and the group workspace must be updated to match. Otherwise ops will see holes in the ledger.

### Policy

| Record | Hard delete | What to do instead |
| --- | --- | --- |
| Online contribution | **Never** | Keep forever. Failed stays `failed`. Chargebacks / corrections → `reversed` with reason and original row intact. |
| Manual (offline) contribution | **No hard delete in v1** | Group manager/collector may **void / reverse** with required reason. Row remains, status `reversed` (or `voided` if we add it). System admin cannot void. |
| Accounts, members, funds, expenses, KYC, settlements | No hard delete from admin portal | Account: deactivate. Fund: group deactivates (`is_active`). Member: existing verification/inactive behavior in group workspace; admin portal is read-only. |
| Settlement request | No delete | Cancel with reason. |

**Archive vs delete:** “Archive” for financial records means **retained, excluded from default “active collected” totals where appropriate, fully visible in admin/audit filters**. Do not remove rows from the database.

**Review later (not v1):** whether a group manager may void a *same-day* manual entry without a reverse, or a time-boxed correction window. Until that policy is approved, **void/reverse only**.

### Audit log (platform-wide in this portal)

Every write from this portal (and settlement create, KYC submit/approve/reject, contribution reverse) must append to `audit_logs`:

- actor (staff user id)
- action
- entity type + id
- parent `account_id`
- before / after (or reason text)
- timestamp

Account detail includes a readable activity timeline. A global activity view is nice-to-have, not MVP.

Existing contribution-delete API used by the group workspace must be replaced or locked down so it cannot hard-delete online rows and should not hard-delete manual rows once reverse ships.

---

## 11. Permissions

### 11.1 Staff admin roles (portal)

Portal access requires `users.role` to be one of **`superadmin`**, **`ops`**, or **`support`**. These are platform-level roles, distinct from group-manager `admin` and account roles (`admin` / `officer` / `viewer` on `user_accounts`).

| Capability | Super admin | Ops | Support | Group manager | Collector | Member |
| --- | --- | --- | --- | --- | --- | --- |
| Access System Admin Portal | Yes | Yes | Yes | No | No | No |
| Dashboard / all-accounts data | Yes | Yes | Yes (read-only) | Own account only, in group app | Own account, limited | No |
| View accounts, members, funds, contributions | Yes | Yes | Yes | Own account | Own account | Own, via OTP |
| Deactivate / reactivate account | Yes | No | No | No | No | No |
| Approve / reject KYC | Yes | Yes | No | Submit only | No | No |
| View KYC documents | Yes | Yes | No | Own submission only | No | No |
| Mark settlement successful / canceled | Yes | Yes | No | No (can cancel own pending? — Open question) | No | No |
| Manage staff admins (invite, change role, revoke) | Yes | No | No | No | No | No |
| Create / edit contributions | No | No | No | Yes (manual) | Yes (manual) | Pay online only |
| Create settlement request | No | No | No | Yes | No | No |
| Void/reverse manual contribution | No | No | No | Yes (policy in §10) | TBD (Open question) | No |

**Inheritance:** super admin ⊃ ops ⊃ support for read access. Mutations are never inherited — each action names the minimum role explicitly.

**Support restrictions:** no action buttons on detail pages (deactivate, approve KYC, mark settlement, etc.). Export of bulk data is out of scope for v1.

### 11.2 Auth and enforcement

**Auth:** same Supabase project. Portal sign-in is allowed only for `superadmin`, `ops`, and `support`. Unauthenticated users and customer roles (`admin`, `user`) are refused at the API, not only in the UI.

**API:** every admin endpoint checks the caller’s platform role against the matrix above. Today KYC list/reject enforce `superadmin` only; that must expand to allow `ops` for KYC mutations while keeping reads available to `support` where appropriate. The verify endpoint’s known gap (`TODO` role check) must be fixed as part of this work.

**Audit:** staff mutations log the actor’s user id and platform role. Staff-management actions (invite, role change, revoke) are always logged.

### 11.3 Staff management (super admin)

**Settings → Staff** (super admin only):

- List current staff admins (name, email, role, last sign-in if available).
- Invite by email → assign role (`ops` or `support`; another `superadmin` only by an existing super admin).
- Change role or revoke access (sets role back to `user` or disables portal flag — see Open questions).
- Cannot demote the last remaining super admin.

Initial staff are seeded in the database (migration or manual SQL). No self-service signup.

---

## 12. Cross-product changes (existing repo)

The new portal cannot succeed as a UI-only app. The current `pollen_frontend` / backend must:

1. **Expose admin APIs** (or extend existing ones) for: platform dashboard aggregates, list/get all accounts, deactivate/reactivate, list members/funds/contributions/settlements with filters, KYC queue (already exists), settlement request CRUD + status transitions. All endpoints enforce the role matrix in §11.
2. **Extend platform roles** in `users.role` to include `ops` and `support` (today: `superadmin`, `admin`, `user`). Add staff-management endpoints for super admin.
3. **Add settlement request** persistence (not only settlement *details*). Align naming with this PRD (`pending | successful | canceled`).
4. **Add group-workspace UI** to create a settlement request and to see its status.
5. **Remove** superadmin KYC page from the group app once the admin portal is live (feature-flag during transition).
6. **Replace hard-delete** of contributions with reverse/void; block delete for `channel = online`.
7. **Keep KYC submit** in group settings; surface richer status copy (pending / verified / rejected + reason).

Suggested rollout: API + audit rules first, then admin portal, then remove the old KYC route.

---

## 13. Technical constraints

- **Separate frontend repository**; shared API (`/api/v1`) and shared Supabase Auth + Postgres.
- Stack may match the group app (React, Vite, TypeScript, Tailwind, TanStack Query) for speed and design consistency; not mandated by this PRD.
- Auth: Bearer Supabase JWT. Idle timeout comparable to the group app (~20 minutes) is recommended for a staff tool.
- Hosting: separate Vercel project. CORS and cookie/host assumptions must allow `admin.pollean.com` to call the API. If the API is same-origin on `app.pollean.com` today, introduce a stable API base URL for both frontends.
- Currency: GHS / GH₵. Timezone for “month” metrics: Africa/Accra.
- No second database.

---

## 14. UX requirements

- Dense, table-first, desktop-primary (ops tool). Responsive enough to use, not member-portal branded.
- Status badges consistent with existing product (`StatusBadge` semantics: KYC, account, contribution, settlement).
- Destructive / irreversible-looking actions (deactivate, reject KYC, cancel settlement) use confirmation + required reason.
- Mask payout credentials (show last 4 of account / MoMo number).
- Loading, empty, and error states on every table.
- Do not use customer marketing voice; keep copy operational and precise.

---

## 15. Success metrics

| Signal | Target (qualitative for v1) |
| --- | --- |
| KYC handled entirely in admin portal | 100% of approvals/rejections after cutover |
| Group app has no staff KYC nav | Removed post-cutover |
| Settlement requests have a status owner | Every request is pending, successful, or canceled |
| Online contribution hard-deletes | Zero |
| Time to find an account / member | Ops can search and open detail without using the database |
| Multi-group clarity | QA script: person in two groups; histories and totals never mix unless “All groups” is selected |

---

## 16. Phasing

### MVP (P0)

- Auth gate (`superadmin`, `ops`, `support`) + role-based UI and API enforcement
- Staff management (super admin): list, invite, change role, revoke
- Dashboard metrics + 12-month collection trend (online vs manual)
- Accounts table + detail + deactivate/reactivate
- Members table + membership detail + “other groups” cluster
- Funds table + detail (read-only)
- Contributions table + detail (read-only)
- KYC queue + approve/reject; status visible in group settings
- Settlement requests: create (group app) + list/detail + pending/successful/canceled + email on create
- Audit log writes for all admin mutations
- Contribution hard-delete blocked for online; reverse/void for manual
- Remove group-app KYC verification page at cutover

### P1

- Global activity / audit explorer
- Settlement over-settle hard block (once eligible-balance rule is decided)
- Email on KYC approve/reject and settlement status change
- Suspended account status as a distinct compliance state in UI
- Staff-facing search that jumps across entity types from one box

### P2

- Support impersonation / “open in group workspace”
- Automated provider payouts / `settlement_txn` from the original TRD
- Identity merge tools (still optional; memberships remain source of truth)

---

## 17. Open questions

1. **Eligible settlement amount:** Online only (Paystack, net of fees) or confirmed online + manual? Gross vs net of Paystack fees vs platform fee?
2. **Can a group manager cancel** their own pending settlement request, or only system admin?
3. **Deactivated account public page:** still findable and view-only, or unpublished?
4. **May collectors void** manual contributions, or only group managers?
5. **Revoking staff access:** set `users.role` back to `user`, or add a separate `portal_enabled` flag so ex-staff keep a group-manager `admin` role elsewhere?
6. **Settlement destination missing:** can a manager create a request with no bank/MoMo details? Recommend **block** until details exist and KYC is verified.
7. **Anonymous online contributions:** how they appear in Members vs Contributions (already nullable `member_id`).
8. **Email ops inbox:** which address / env var, and is Postmark template work in scope for MVP?
9. **Support + PII:** should support see full phone/email or masked values? Recommend full for v1 with audit; revisit if team grows.

---

## 18. Acceptance criteria (MVP)

- [ ] A user without `superadmin`, `ops`, or `support` cannot load any admin portal page or admin API.
- [ ] Support can search and view but cannot approve KYC, process settlements, or deactivate accounts (UI hidden + API 403).
- [ ] Ops can approve/reject KYC and process settlements but cannot deactivate accounts or manage staff.
- [ ] Super admin can manage staff roles; the last super admin cannot be demoted.
- [ ] Dashboard shows total accounts, active accounts, active funds, overall collected, and a monthly trend split manual vs online.
- [ ] Ops can open any account and see collected total, funds count, members count, manual vs online, KYC, and status.
- [ ] Ops can deactivate and reactivate an account with a reason; the group sees a banner and cannot take online payments while inactive.
- [ ] Members table lists memberships with parent account; clicking through shows contribution history for that account; other groups are listed without mixing totals by default.
- [ ] Funds and contributions are system-wide, filterable, and read-only for admin.
- [ ] KYC approve/reject works only in this portal; group settings show status; group app no longer has a verification screen after cutover.
- [ ] Settlement request can be created by a group manager, emails on create, and admin can set pending → successful or canceled.
- [ ] Online contributions cannot be deleted. Manual contributions cannot be hard-deleted; void/reverse retains the row. Audit entries exist for admin writes and reverses.

---

## 19. Appendix — current state vs this PRD

| Area | Today | Target |
| --- | --- | --- |
| Staff UI | `/kyc-verification` inside group app | Separate System Admin Portal |
| Accounts list | None (plus an internal list-ids test route) | Full accounts IA |
| Account status | Enum exists; users cannot change it | Admin deactivate / reactivate |
| Settlements | Destination details only | Requests + ops status machine |
| Platform dashboard | None | §8.1 |
| Cross-account members / funds / contributions | None | Read-only system views |
| Contribution delete | Hard delete API + UI | Reverse / void; never delete online |
| KYC verify API | Role check incomplete on verify | Enforce `ops` or `superadmin` |
| Platform staff roles | `superadmin` only in practice | `superadmin`, `ops`, `support` with role matrix |
| Staff management | None | Super-admin Settings → Staff |
