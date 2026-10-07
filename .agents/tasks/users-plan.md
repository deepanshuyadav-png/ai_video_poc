# Implementation Plan — Admin "Users" Section

Adds a 4th admin section ("Users") alongside Avatars, Voices, Configurations. Admins can create users (email + initial password + role), activate/deactivate, change role admin<->user, and delete, with lock-out guardrails. All decisions below are APPROVED; implement them, do not re-decide.

## Context discovered during exploration

- Backend: Express + TypeScript, raw `pg` via shared `pool` (`backend/src/config/db.ts`). Build = `npm run build` (`tsc`) in `backend/`. No test framework exists; verification is compile + manual/runtime checks.
- Controllers use `async (req: AuthRequest, res: Response): Promise<void>` with try/catch and `{ success, data }` / `{ success, error }` responses. `isActive` is normalized as `isActive === 'true' || isActive === true` in avatar/voice controllers.
- `AuthRequest.userId` is set by `authMiddleware`. `/api/admin` is mounted behind `authMiddleware` + `adminMiddleware` in `index.ts`, so new user routes are admin-protected automatically.
- `UserModel.create()` currently does `RETURNING id, email, role, created_at` (no `name`, no `is_active`). `findByEmail` is `SELECT *` (so `is_active` will be present after the column is added). `findById` is `SELECT id, email, name, role, created_at` and is used by `adminMiddleware` and `authController.me`.
- `init.sql` only runs on fresh DB init (docker-entrypoint-initdb.d). Startup wiring: `index.ts` `app.listen` callback calls `await seedAdmin()` from `seed.ts`. `seedAdmin` uses `pool.query` directly.
- Frontend: React + Vite (`npm run build`), axios, no tests. `VoiceManager.jsx` is the closest template but uses FormData; Users MUST use JSON (plain objects). Shared CSS `frontend/src/styles/admin/Manager.css` provides: `manager`, `manager-header`, `btn-primary`, `btn-secondary`, `modal-overlay`, `modal`, `form-group`, `modal-actions`, `manager-table`, `status-toggle` + `.active`/`.inactive`, `btn-icon`, `empty-state`. No new CSS classes needed.
- API base in frontend: `import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`.

## Design decisions (APPROVED, recorded for the implementer)

- Idempotent-ALTER host spot: add a new exported `ensureSchema()` function in `backend/src/seed.ts` and call it from `index.ts`'s `app.listen` callback BEFORE `seedAdmin()`. Rationale: `seed.ts` already owns startup DB mutations via `pool.query` and is the established pattern wired into `index.ts`; placing the migration there (and ordering it before `seedAdmin`) is the least-invasive change and guarantees the `is_active` column exists before the seeded admin row is read/inserted. The same ALTER also goes into `init.sql` for fresh DB installs.
- Existing rows stay logged-in-capable: `ADD COLUMN ... BOOLEAN DEFAULT true` backfills every existing row (including the seeded admin) to `true`, so login is unaffected.
- Users endpoints use JSON, not FormData (no file upload), unlike Avatars/Voices.

## Guardrail checks (spell out exactly — enforced in `adminController`)

Let `actingAdminId = req.userId`, `targetId = parseInt(req.params.id)`.

1. Self-protection on update: if `targetId === actingAdminId` AND (the request sets `role` to anything other than `'admin'` OR sets `isActive` to `false`) -> `400 { success:false, error:'You cannot deactivate or demote your own account' }`.
2. Last-active-admin on update: if the change would demote OR deactivate a user who is CURRENTLY an active admin (`target.role === 'admin' && target.is_active === true`), AND `countActiveAdmins() <= 1` -> `400 { success:false, error:'Cannot remove the last active admin' }`. (Demote = incoming `role` present and !== 'admin'; deactivate = incoming `isActive` normalized to `false`.)
3. Delete guards: if `targetId === actingAdminId` -> `400 { success:false, error:'You cannot delete your own account' }`. Else if target is an active admin and `countActiveAdmins() <= 1` -> `400 { success:false, error:'Cannot remove the last active admin' }`.

---

## Plan items

- [ ] 1. Add the `is_active` column to the schema for fresh DB installs.
      Add `is_active BOOLEAN DEFAULT true` to the `users` CREATE TABLE (place it right after the `role` line), and add an idempotent `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;` statement immediately after the `users` table block.
      Files: `database/init.sql`
      Verify: `Get-Content database/init.sql | Select-String is_active` shows the column in the CREATE TABLE and the ALTER statement. (Full runtime verification happens in item 2 via startup.)

- [ ] 2. Add an idempotent startup migration and wire it before seeding.
      In `backend/src/seed.ts`, add and export `ensureSchema()` that runs `await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true')` inside try/catch with a console log (mirror `seedAdmin` style). In `backend/src/index.ts`, import `ensureSchema` and `await ensureSchema()` inside the `app.listen` callback BEFORE `await seedAdmin()`.
      Files: `backend/src/seed.ts`, `backend/src/index.ts`
      Verify: `cd backend; npm run build` compiles with no TS errors. (Runtime: on `npm run dev` against a live DB, startup logs the migration and `seedAdmin` still succeeds; the seeded admin row has `is_active = true`.)

- [ ] 3. Extend `UserModel` with the new field and methods.
      In `backend/src/models/user.ts`: add `is_active: boolean` to the `User` interface. Change `create()` RETURNING to `id, email, role, is_active, created_at` (keep bcrypt hashing; `is_active` defaults via column DEFAULT). Add `is_active` to the `findById` SELECT list. Add methods: `findAll()` -> `SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC` (NEVER select `password`); `updateRole(id, role)` -> `UPDATE ... SET role=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id, email, name, role, is_active, created_at`; `setActive(id, isActive)` -> same pattern updating `is_active`; `delete(id)` -> `DELETE FROM users WHERE id=$1`; `countActiveAdmins()` -> `SELECT COUNT(*) FROM users WHERE role='admin' AND is_active=true` returning a number (`parseInt(result.rows[0].count, 10)`). No method returns `password`.
      Files: `backend/src/models/user.ts`
      Verify: `cd backend; npm run build` compiles clean.

- [ ] 4. Block inactive users from logging in.
      In `backend/src/controllers/authController.ts` `login`, AFTER the password `isValid` check passes and BEFORE issuing the JWT, add: `if (!user.is_active) { res.status(403).json({ success:false, error:'Account is inactive. Please contact an administrator.' }); return; }`. (`findByEmail` is `SELECT *`, so `is_active` is present.) Leave `register` unchanged.
      Files: `backend/src/controllers/authController.ts`
      Verify: `cd backend; npm run build` compiles clean. (Runtime: active user logs in and gets a token; a user with `is_active=false` gets 403 with the exact message and no token.)

- [ ] 5. Add Users handlers to `adminController`.
      In `backend/src/controllers/adminController.ts`, import `UserModel`, add four handlers mirroring the avatar/voice style (try/catch, `{ success, data|error }`, correct status codes):
      - `getUsers`: `UserModel.findAll()` -> `res.json({ success:true, data })`.
      - `createUser`: read `{ email, password, role }`; 400 if email or password missing; normalize `role` to `'admin'` or `'user'` (default `'user'` when not exactly `'admin'`); if `findByEmail(email)` exists -> `400 'Email already registered'`; else `UserModel.create(email, password, role)`; respond `201 { success:true, data }` (data has no password).
      - `updateUser`: `targetId = parseInt(req.params.id)`; `actingAdminId = req.userId`; read `{ role, isActive }`; normalize `isActive` with `=== 'true' || === true` only when the field is present (track presence so an absent `isActive` is NOT treated as false); load `target = findById(targetId)`, 404 if missing; apply guardrails 1 and 2 above; then if `role` present call `updateRole`, if `isActive` present call `setActive`; return the latest user via `findById(targetId)` as `{ success:true, data }` (no password).
      - `deleteUser`: `targetId`/`actingAdminId` as above; apply guardrail 3; else `UserModel.delete(targetId)` -> `{ success:true, message:'User deleted' }`.
      Files: `backend/src/controllers/adminController.ts`
      Verify: `cd backend; npm run build` compiles clean.

- [ ] 6. Add the admin user routes (JSON body, no multer).
      In `backend/src/routes/admin.ts` add, after the provider routes: `router.get('/users', adminController.getUsers);` `router.post('/users', adminController.createUser);` `router.put('/users/:id', adminController.updateUser);` `router.delete('/users/:id', adminController.deleteUser);`. Do NOT attach multer (JSON only; `express.json()` is already applied globally in `index.ts`).
      Files: `backend/src/routes/admin.ts`
      Verify: `cd backend; npm run build` compiles clean. (Runtime: `GET /api/admin/users` with an admin JWT returns the user list; without admin role returns 403 from existing middleware.)

- [ ] 7. Create the `UserManager` frontend component (JSON/axios).
      Create `frontend/src/components/admin/UserManager.jsx` modeled on `VoiceManager.jsx` but using plain JSON objects (let axios set `application/json`), reusing only existing `Manager.css` classes. State: `users`, `loading`, `showForm`, `formData { email, password, role }`, plus an `error` string. On mount `GET ${API_URL}/admin/users`. Table columns: Email, Role, Status, Created, Actions.
      - Role: a `status-toggle`/select or button that PUTs `{ role: user.role === 'admin' ? 'user' : 'admin' }` to `/admin/users/:id`.
      - Status: `status-toggle` button (class `active`/`inactive`, label Active/Inactive) PUT `{ isActive: !user.is_active }`.
      - Created: `new Date(user.created_at).toLocaleString()` (or `toLocaleDateString()`).
      - Actions: delete `🗑️` `btn-icon` with `confirm(...)` -> DELETE `/admin/users/:id`.
      - "Add User" button opens a `modal-overlay`/`modal` form: Email (`required`), Password (`required`, `type="password"`), Role (`select` User/Admin, default user); submit POSTs `{ email, password, role }` as JSON.
      - On any create/update/delete, refetch the list. Catch errors and surface the backend message: `err.response?.data?.error` into the `error` state (shown inline) or `alert(...)`, so guardrail 400/403 messages are visible. Clear `error` on successful actions.
      Files: `frontend/src/components/admin/UserManager.jsx`
      Verify: `cd frontend; npm run build` builds with no errors.

- [ ] 8. Register the Users section in the sidebar and layout.
      In `frontend/src/components/admin/AdminSidebar.jsx` add `{ id: 'users', label: 'Users', icon: '👥' }` to `menuItems` (after the Voices entry or at the end). In `frontend/src/components/admin/AdminLayout.jsx` import `UserManager` and add `case 'users': return <UserManager />;` in `renderContent()`, keeping existing cases and the default.
      Files: `frontend/src/components/admin/AdminSidebar.jsx`, `frontend/src/components/admin/AdminLayout.jsx`
      Verify: `cd frontend; npm run build` builds clean. (Runtime: the Admin Panel shows a 4th "Users" nav item that renders the Users table.)

- [ ] 9. Final full-build integration check.
      Run both builds and confirm no regressions in existing admin sections or auth.
      Files: none (verification only)
      Verify: `cd backend; npm run build` AND `cd frontend; npm run build` both succeed. Runtime smoke (if a DB + servers are available): active admin logs in; Users section lists users; create user (201, no password in response); toggle role and status; the three guardrails each return the stated 400; an inactive user's login returns 403 with the exact message; existing Avatars/Voices/Configurations sections still work.

## Notes / assumptions

- No automated test framework exists in either package; `tsc` build (backend) and `vite build` (frontend) are the authoritative automated checks. Runtime checks require a running Postgres and the dev servers, noted as optional smoke steps where relevant.
- `countActiveAdmins()` returns a parsed integer because `pg` returns COUNT as a string.
- `updateUser` must distinguish "field absent" from "field false" for `isActive`; use `'isActive' in req.body` (or `req.body.isActive !== undefined`) to decide whether to call `setActive`, so a role-only update does not accidentally deactivate.
- Only the files listed above are added/modified; no unrelated files are touched, no new libraries added.
