# Users admin-panel section — judge review

Adds a 4th admin section ("Users") so an admin can create users, flip role admin↔user, activate/deactivate, and delete, with lock-out guardrails. Backend is raw-`pg` model methods plus four `adminController` handlers behind the existing `authMiddleware`+`adminMiddleware` mount; frontend is a JSON/axios `UserManager` mirroring `VoiceManager`, wired into the sidebar and layout. The `is_active` column is added for fresh installs (`init.sql`) and backfilled on existing DBs via an idempotent startup ALTER that runs before admin seeding.

Watch for: unrelated CSS color/shadow edits are present in the working tree (confirmed) — they belong to the earlier UI-polish task, not this feature, and touch no Users logic.

**Verdict**: APPROVED

<details>
<summary>Issues (1)</summary>

1. **Unrelated CSS edits in working tree** (non-blocking) — Palette/shadow tweaks across eight stylesheets plus build-log/`package-lock`/`dist_check` artifacts are present alongside the Users files. They carry no Users-feature logic; if a clean per-feature commit is wanted, stage only the Users files and commit the CSS polish separately.

</details>

## Schema and migration (`database/init.sql`, `backend/src/seed.ts`, `backend/src/index.ts`)

`is_active BOOLEAN DEFAULT true` is added to the `users` CREATE TABLE immediately after `role`, and the idempotent `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;` sits right after the table block for pre-existing installs (confirmed). The same ALTER is hosted in a new exported `ensureSchema()` in `seed.ts` (try/catch + console log, mirroring `seedAdmin`), and `index.ts` runs `await ensureSchema()` in the `app.listen` callback before `await seedAdmin()` (confirmed). Because `ADD COLUMN ... DEFAULT true` backfills every existing row, the seeded admin stays active and login is unaffected. This is one of the allowed host options from the brief.

## Login block for inactive users (`backend/src/controllers/authController.ts`)

The 403 branch fires after the password check and before `jwt.sign`, returning the exact message `Account is inactive. Please contact an administrator.` with no token (confirmed). `findByEmail` is `SELECT *`, so `is_active` is populated at login time. `register` is untouched (confirmed — the diff adds only the 403 block).

## User model methods (`backend/src/models/user.ts`)

`is_active: boolean` is added to the `User` interface; `create()` RETURNING and `findById` SELECT now include `is_active`. New `findAll`, `updateRole`, `setActive`, `delete`, and `countActiveAdmins` are added. No method selects or returns `password` — every SELECT/RETURNING is an explicit column list without `password` (confirmed). `countActiveAdmins` parses the `pg` string COUNT via `parseInt(..., 10)` (confirmed). `updateRole`/`setActive` write `updated_at = CURRENT_TIMESTAMP`; the `updated_at` column exists on the users table (confirmed), so these UPDATEs are valid.

## createUser (`backend/src/controllers/adminController.ts`)

Missing email or password → 400; role normalized to exactly `admin` or `user` (anything not `'admin'` becomes `'user'`); existing email via `findByEmail` → 400 `Email already registered`; otherwise `UserModel.create` hashes with bcrypt and the 201 response carries the RETURNING row without a password (confirmed).

## Guardrails (`backend/src/controllers/adminController.ts`)

All three are enforced server-side with clear 400s (confirmed):
- Self-protection on update: when `targetId === actingAdminId` and the body demotes (`role` present and `!== 'admin'`) or deactivates (`isActive` present and normalized false) → 400 `You cannot deactivate or demote your own account`, before any write.
- Last active admin on update: a demotion or deactivation of a currently-active admin consults `countActiveAdmins()`; `<= 1` → 400 `Cannot remove the last active admin`.
- Delete: self-delete → 400 `You cannot delete your own account`; last-active-admin delete → 400 `Cannot remove the last active admin`.

Field presence is tracked with `role !== undefined` / `isActive !== undefined`, so a role-only update never accidentally deactivates and vice versa (confirmed). `updateUser` returns the fresh `findById` row (no password).

## Routes (`backend/src/routes/admin.ts`)

`GET`/`POST /users` and `PUT`/`DELETE /users/:id` added with no multer, consistent with the JSON contract; they inherit the admin-only mount (confirmed).

## Frontend UserManager and wiring (`UserManager.jsx`, `AdminSidebar.jsx`, `AdminLayout.jsx`)

`UserManager` mirrors `VoiceManager`, uses plain JSON objects via axios (not FormData), and reuses only existing `Manager.css` classes (`manager`, `manager-header`, `btn-primary`, `status-toggle` + `active`/`inactive`, `btn-icon`, `empty-state`, `modal-overlay`/`modal`). Backend 400/403 text is surfaced through `err.response?.data?.error` into an inline error line using an inline style — no new CSS class (confirmed). The Users tab is added to `AdminSidebar` `menuItems` and to `AdminLayout.renderContent()` as `case 'users'` with existing cases/default preserved (confirmed).

## Build evidence

The coder's `users-verification.md` records backend `tsc --noEmit` EXIT=0 (zero type errors) and frontend `vite build` EXIT=0 (106 modules, dist emitted). Per instructions these gates are trusted and not re-run; evidence is present for both.

## Unrelated changes in the working tree

The working tree also carries color/shadow edits across `App.css`, `AuthPage.css`, `ChatArea.css`, `Sidebar.css`, `admin/AdminLayout.css`, `admin/AdminSidebar.css`, `admin/Manager.css`, and `admin/ProviderManager.css` (confirmed via diff). These are palette/elevation tweaks from the earlier "more professional / less white" UI task, not Users-feature changes, and they touch no Users logic or component. The two `Manager.css` edits are shared-stylesheet polish (table shadow, focus ring), not new classes consumed by `UserManager`. Non-blocking for this feature; flagged only because the brief scoped the change to the Users files. Also present are build-log/`package-lock.json`/`dist_check` artifacts under `backend/` and `frontend/` plus `.agents/` — housekeeping, no source impact.
