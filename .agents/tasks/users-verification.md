# Users Feature — Verification Evidence

Iteration: FIRST (no `users-review.json` present). Implemented from scratch per `users-plan.md`.

## Files created / changed

Backend:
- `database/init.sql` — added `is_active BOOLEAN DEFAULT true` to the `users` CREATE TABLE (after `role`) and an idempotent `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;` right after the table block.
- `backend/src/seed.ts` — added and exported `ensureSchema()` (idempotent ALTER, try/catch + console log, mirroring `seedAdmin`).
- `backend/src/index.ts` — imported `ensureSchema`; `await ensureSchema()` runs in the `app.listen` callback BEFORE `await seedAdmin()`.
- `backend/src/models/user.ts` — added `is_active: boolean` to `User`; `create()` RETURNING now includes `is_active`; `findById` SELECT includes `is_active`; added `findAll()`, `updateRole()`, `setActive()`, `delete()`, `countActiveAdmins()` (parsed int). No method returns `password`.
- `backend/src/controllers/authController.ts` — after password verify, 403 `Account is inactive. Please contact an administrator.` when `!user.is_active`; register unchanged.
- `backend/src/controllers/adminController.ts` — imported `UserModel`; added `getUsers`, `createUser`, `updateUser`, `deleteUser` mirroring avatar/voice style with the approved guardrails.
- `backend/src/routes/admin.ts` — added `GET/POST /users`, `PUT/DELETE /users/:id` (JSON, no multer).

Frontend:
- `frontend/src/components/admin/UserManager.jsx` — NEW. Modeled on `VoiceManager.jsx`, uses JSON/axios, reuses existing `Manager.css` classes. Columns Email, Role, Status, Created, Actions. Surfaces backend 400/403 messages via `err.response?.data?.error` into an inline error line (inline style only — no new CSS class).
- `frontend/src/components/admin/AdminSidebar.jsx` — added `{ id: 'users', label: 'Users', icon: '👥' }`.
- `frontend/src/components/admin/AdminLayout.jsx` — imported `UserManager`; added `case 'users'`.

## Schema-migration host chosen

`ensureSchema()` in `backend/src/seed.ts`, invoked from the `app.listen` callback in `backend/src/index.ts` BEFORE `seedAdmin()`. Rationale (from plan): `seed.ts` already owns startup DB mutations via `pool.query` and is wired into `index.ts`; ordering the ALTER before `seedAdmin` guarantees `is_active` exists before the admin row is read/inserted. The same ALTER is also in `init.sql` for fresh installs. `ADD COLUMN ... DEFAULT true` backfills existing rows (including the seeded admin) to `true`, so login stays unaffected.

## Backend TypeScript compile

Command (cwd = `backend`):
`& "C:\Program Files\nodejs\node.exe" "node_modules\typescript\bin\tsc" --noEmit -p tsconfig.json`

Note: `backend/node_modules` was missing, so dependencies were installed first via npm-cli. The install exited non-zero only on a Windows ENOTEMPTY cleanup warning for pre-existing dirs (`openai`, `langchain`); `typescript` and all needed packages were present afterward and the compile ran cleanly.

Result: **EXIT=0 — zero type errors.**

## Frontend build

Command (cwd = `frontend`):
`& "C:\Program Files\nodejs\node.exe" "node_modules\vite\bin\vite.js" build`

Result: **EXIT=0 — vite v5.4.21, 106 modules transformed, dist/ emitted (index.html + assets), built in 8.47s.** Generated `dist/` deleted afterward.

## Guardrail trace (manual, against `adminController.updateUser` / `deleteUser`)

1. Self deactivate / demote — `updateUser`: when `targetId === req.userId` and the body demotes (`role !== 'admin'`) or deactivates (`isActive` normalized to `false`), returns `400 { error: 'You cannot deactivate or demote your own account' }` before any DB write. Covers delete-self separately in `deleteUser` with `400 'You cannot delete your own account'`.

2. Last active admin on update — `updateUser`: a demotion or deactivation targeting a user who is currently `role === 'admin' && is_active === true` checks `countActiveAdmins()`; when `<= 1` it returns `400 { error: 'Cannot remove the last active admin' }`. Field presence is tracked (`role !== undefined`, `isActive !== undefined`) so a role-only update never accidentally deactivates, and vice versa.

3. Last active admin on delete — `deleteUser`: after the self-delete guard, if the target is an active admin and `countActiveAdmins() <= 1`, returns `400 { error: 'Cannot remove the last active admin' }`; otherwise deletes and returns `{ success: true, message: 'User deleted' }`.

Login block (not a numbered guardrail but verified): active users log in and receive a token; `is_active === false` yields `403` with the exact message and no token. `findByEmail` is `SELECT *`, so `is_active` is present at login time.

## Notes

- No password hash is included in any admin users response (`findAll`, `findById`, `create` RETURNING all omit `password`).
- No new libraries, state libraries, or CSS classes were added; the inline error uses an inline style, not a new class.
- Changes left uncommitted in the working tree per instructions.
