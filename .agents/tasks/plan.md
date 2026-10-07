# Implementation Plan — CSS-only depth/layering refinement

Goal: add visual DEPTH, LAYERING, and HIERARCHY so the UI stops reading "too white / too flat"
and looks professionally designed. The existing light + indigo palette stays. Do NOT darken the
theme or add saturated color.

## Scope & hard constraints (every item must obey)

- Edit ONLY these 8 files:
  - `frontend/src/styles/App.css`
  - `frontend/src/styles/AuthPage.css`
  - `frontend/src/styles/Sidebar.css`
  - `frontend/src/styles/ChatArea.css`
  - `frontend/src/styles/admin/AdminLayout.css`
  - `frontend/src/styles/admin/AdminSidebar.css`
  - `frontend/src/styles/admin/Manager.css`
  - `frontend/src/styles/admin/ProviderManager.css`
  - (Docs under `c:\Users\hp\Desktop\ai_video_poc\.agents\tasks` are also fine to write.)
- Do NOT touch any `.jsx` / `.js`, `index.html`, `vite.config.js`, or `package.json`.
- Do NOT rename or remove any existing CSS class selector. Keep EVERY selector. Only change
  property VALUES or ADD tone/shadow/border properties inside existing rules. Add a brand-new rule
  only if a design element below genuinely requires it (none is expected).
- Keep every `:root` variable NAME identical in App.css — only tune values. (AuthPage.css consumes
  these variables and must keep working.)
- Preserve ALL layout properties EXACTLY: `display, flex, grid, width, height, min-width, padding,
  margin, position, overflow`. Touch ONLY: `color`, `background`, `background-color`,
  `border` color/width/style, `box-shadow`, and subtle `border-radius` where one already exists.
- Keep all accent usage indigo (`#5B4FE0` / `#4F46E5`). Keep semantic status colors
  (pending amber `#f59e0b`, processing blue `#3b82f6`, completed/success green `#10b981`,
  failed/danger red `#ef4444`, info `#3b82f6`).

## The surface-tone scale, shadow & border recipe (apply mechanically)

Design decision — a 3-step surface scale creates the layering (chosen over keeping everything
`#FFFFFF`, which is exactly what reads as "too white/flat"):

- PAGE background (deepest): `#EEF0F5` — soft cool off-white, one notch deeper than the current
  `#F3F4F6`. Used for the app/content canvas that cards float on.
- SIDEBAR tone (middle, whisper of lavender): `#F6F7FB` — distinct from both page and white cards,
  so the sidebar reads as its own plane. (Replaces today's near-white `#FAFAFB`.)
- CARD / panel / input bar / modal / table surface (top): `#FFFFFF` — stays crisp white, lifted by
  shadow so it clearly sits ON TOP of the page.

Shadows (cool-tinted, not pure black — this is what does the layering):

- CARD shadow: `0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.06)`
- POPOVER / dropdown shadow: `0 4px 16px rgba(16, 24, 40, 0.10)`
- MODAL shadow: `0 10px 30px rgba(16, 24, 40, 0.12)`
- SIDEBAR separation (optional subtle depth, in addition to its right border):
  `box-shadow: 1px 0 0 rgba(16, 24, 40, 0.02)` — only if a `box-shadow` fits without touching layout.

Borders (soft gray hairlines, consistent everywhere):

- Default border / divider: `#E5E7EB`
- Hover / emphasis border: `#D1D5DB`
- Table-header tint: `#F7F8FB`

Focus ring (inputs/selectors/textarea containers that take focus):

- `border-color: #5B4FE0;` AND `box-shadow: 0 0 0 3px rgba(91, 79, 224, 0.12);`

Hover / active tints:

- Row/item hover (neutral): `#F0F1F6`
- Lavender item hover: `#EEF0F8`
- Active / selected (pale lavender): `#EEF0FD` with indigo text `#5B4FE0`

Text hierarchy (accessible, keep as-is unless a rule currently uses a lighter value for body text):
headings `#1E2130`, secondary `#6B7280`, muted `#9CA3AF`.

---

## Verification command (used by every item)

`npm` is blocked by this machine's PowerShell execution policy, and the shell's `cwd` option is not
honored here, so invoke Vite's bin directly with absolute paths. From anywhere, run:

```
Set-Location 'c:\Users\hp\Desktop\ai_video_poc\frontend'; node 'c:\Users\hp\Desktop\ai_video_poc\frontend\node_modules\vite\bin\vite.js' build
```

Expected outcome (confirmed as the green baseline before any edit): build completes with
`✓ 105 modules transformed`, emits `dist/index.html` + `dist/assets/index-*.css` +
`dist/assets/index-*.js`, and ends with `✓ built in …` and exit code 0. A CSS syntax error makes
this build FAIL, so a clean build is the real "nothing broke" signal for CSS-only edits.
(Optional live check: start the dev server with
`node 'c:\Users\hp\Desktop\ai_video_poc\frontend\node_modules\vite\bin\vite.js'` and eyeball the UI.)

Run the build after EACH item; each item leaves the codebase buildable.

---

## Items (ordered; App.css variables first so AuthPage inherits the new tone)

- [ ] 1. Tune the `:root` variables in App.css to the new surface scale and cool shadows (names unchanged).
      In `:root`, set `--bg-primary: #EEF0F5;` and `--bg-tertiary: #EEF0F5;` (page canvas deepens a notch),
      keep `--bg-secondary`, `--bg-elevated` at `#FFFFFF`, set `--bg-hover: #F0F1F6;`. Replace the three
      neutral shadows with cool-tinted versions: `--shadow-sm: 0 1px 2px rgba(16,24,40,0.04);`
      `--shadow-md: 0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.06);`
      `--shadow-lg: 0 10px 30px rgba(16,24,40,0.12);` (leave `--shadow-glow` indigo as-is). Leave
      `--primary*`, `--text-*`, `--border-*`, semantic colors, radii, and transitions unchanged. Do not
      touch any non-`:root` rule, `body`, `*`, layout, or animations here.
      Files: frontend/src/styles/App.css
      Verify: run the build command above — expect `✓ 105 modules transformed` and a clean `✓ built in …` (exit 0).

- [ ] 2. Confirm AuthPage.css inherits correctly; adjust only if a surface now looks wrong (no selector changes).
      AuthPage.css already consumes the variables (`.auth-page` uses `--bg-primary`, `.auth-form` uses
      `--bg-secondary`/`--shadow-lg`, inputs use `--bg-tertiary` + the `0 0 0 3px var(--primary-light)`
      focus ring). After item 1 the card now floats on the deeper page tone — leave AuthPage.css as-is
      unless the login card's shadow reads too weak; if so, only change `.auth-form`'s `box-shadow`
      value to `var(--shadow-md)` (card recipe). Change nothing else; keep all selectors and layout.
      Files: frontend/src/styles/AuthPage.css
      Verify: run the build command — clean build (exit 0); auth page still renders (optional dev-server eyeball).

- [ ] 3. Give the main app sidebar its lavender-tint plane and lift its items (Sidebar.css).
      Set `.sidebar` `background-color: #F6F7FB;` (keep its `border-right: 1px solid #E5E7EB;`; optionally
      add `box-shadow: 1px 0 0 rgba(16,24,40,0.02);` for subtle separation — no layout change). Keep
      `.sidebar-header`, `.sidebar-footer` borders at `#E5E7EB`. Change `.new-request-btn:hover`,
      `.request-item:hover` backgrounds from `#F3F4F6` to the neutral hover `#F0F1F6`. Keep
      `.request-item.active` at `background-color: #EEF0FD; color: #5B4FE0;`. Leave all status-badge
      colors, `.admin-link-btn`, `.logout-btn`, and every text color unchanged. Touch only color/
      background/border/box-shadow — never width/padding/margin/flex.
      Files: frontend/src/styles/Sidebar.css
      Verify: run the build command — clean build (exit 0).

- [ ] 4. Make ChatArea read as layered planes: off-white canvas, white result cards, distinct right panel, focus ring.
      In ChatArea.css: give the left canvas depth by setting `.panel-scroll` or `.chat-area`
      `background-color: #EEF0F5;` (apply to `.chat-area` so welcome + split share the page tone; keep
      `.result-section` white). Upgrade `.result-section` `box-shadow` to the card recipe
      `0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.06)` (keep its `#E5E7EB` border and
      `12px` radius). Set `.panel-right` to a slightly different tone from the left so the split reads —
      keep its current `#FAFAFB` OR nudge to `#F6F7FB` (choose `#F6F7FB` to match the sidebar lavender
      family); keep its `border`? it has none, so leave layout. Keep `.panel-left`'s `border-right:
      1px solid #E5E7EB`. For inputs/selectors add the indigo focus ring: on `.input-container:focus-within`
      add `box-shadow: 0 0 0 3px rgba(91,79,224,0.12);` alongside the existing `border-color: #5B4FE0;`.
      Upgrade `.selection-grid-popup` `box-shadow` to the popover recipe `0 4px 16px rgba(16,24,40,0.10)`.
      Change `.selector-btn:hover` / `.grid-item:hover` neutral hovers from `#F3F4F6`/`#EEF0FD` only if
      needed to match tints (keep selected states `#EEF0FD` + indigo). Leave all `#5B4FE0`/`#4F46E5`
      accents, `.error-section` red, video `#000`, status colors, and every layout property untouched.
      Files: frontend/src/styles/ChatArea.css
      Verify: run the build command — clean build (exit 0).

- [ ] 5. Set the admin canvas to the page off-white (AdminLayout.css).
      Change `.admin-layout` `background-color` from `#F3F4F6` to `#EEF0F5` so admin content floats on
      the same deeper page tone. Leave `.admin-content` layout (padding/overflow) untouched.
      Files: frontend/src/styles/admin/AdminLayout.css
      Verify: run the build command — clean build (exit 0).

- [ ] 6. Give the admin sidebar the lavender-tint plane; keep the active nav item solid indigo (AdminSidebar.css).
      Change `.admin-sidebar` `background-color` from `#FFFFFF` to `#F6F7FB` (keep its `border-right:
      1px solid #E5E7EB`; optionally add `box-shadow: 1px 0 0 rgba(16,24,40,0.02);`). Change the neutral
      hovers `.back-to-app-btn:hover` and `.admin-nav-item:hover` background from `#F3F4F6` to `#F0F1F6`.
      Keep `.admin-nav-item.active { background-color: #5B4FE0; color: #fff; }` exactly (solid indigo).
      Keep header `#5B4FE0`, badges, borders `#E5E7EB`, and all text colors unchanged. Color/background/
      border/box-shadow only.
      Files: frontend/src/styles/admin/AdminSidebar.css
      Verify: run the build command — clean build (exit 0).

- [ ] 7. Lift admin tables and modals; tint the table header; strengthen row dividers (Manager.css).
      Upgrade `.manager-table` `box-shadow` to the card recipe `0 1px 2px rgba(16,24,40,0.04),
      0 4px 12px rgba(16,24,40,0.06)` (keep `#FFFFFF` bg, `#E5E7EB` border, `12px` radius, `overflow:
      hidden`). Set the table header `.manager-table th` `background-color` from `#F9FAFB` to the header
      tint `#F7F8FB` (keep its `#6B7280` uppercase label color). Keep `th/td` `border-bottom: 1px solid
      #E5E7EB` row dividers. Upgrade `.modal` `box-shadow` to the modal recipe `0 10px 30px
      rgba(16,24,40,0.12)` (keep white bg, `#E5E7EB` border, radius). On `.modal .form-group input:focus`
      / `select:focus` add the focus ring `box-shadow: 0 0 0 3px rgba(91,79,224,0.12);` next to the
      existing `border-color: #5B4FE0;`. Keep `.btn-primary`/`.btn-secondary` indigo, `.status-toggle`
      active/inactive tints, thumbnail/placeholder `#F3F4F6` fills, `.modal-overlay` `rgba(17,24,39,0.45)`,
      and all layout untouched.
      Files: frontend/src/styles/admin/Manager.css
      Verify: run the build command — clean build (exit 0).

- [ ] 8. Lift the provider config card and add the input focus ring (ProviderManager.css).
      Upgrade `.config-form-card` `box-shadow` to the card recipe `0 1px 2px rgba(16,24,40,0.04),
      0 4px 12px rgba(16,24,40,0.06)` (keep white bg, `#E5E7EB` border, `12px` radius). On
      `.config-form-grid .form-group input:focus` / `select:focus` add `box-shadow: 0 0 0 3px
      rgba(91,79,224,0.12);` alongside the existing `border-color: #5B4FE0;`. Keep the active badge
      green tint, label colors, and all layout untouched.
      Files: frontend/src/styles/admin/ProviderManager.css
      Verify: run the build command — clean build (exit 0).

- [ ] 9. Final full-build + visual pass (no new edits unless a regression is found).
      Run the build command one last time to confirm all 8 files compile together into a clean bundle.
      Optionally start the dev server and eyeball each surface: login card floats on off-white; app
      sidebar + admin sidebar read as a lavender-tinted plane distinct from white cards; chat left vs
      right panels read as a split; result-section/table/modal cards sit on top with soft shadows;
      inputs show the indigo focus ring; active nav/items stay indigo; status colors intact; no
      low-contrast gray-on-white body text. If a regression appears, fix only via color/background/
      border/box-shadow within the existing rule and re-run the build.
      Files: (verification only — none expected)
      Verify: run the build command — expect `✓ 105 modules transformed` and `✓ built in …` (exit 0).

---

## Chosen surface-tone scale (final)

- Page (canvas, deepest):  `#EEF0F5`
- Sidebar (lavender tint, middle):  `#F6F7FB`   (right panel in ChatArea also uses `#F6F7FB`)
- Card / panel / input bar / modal / table (top):  `#FFFFFF`

Shadow recipe — card: `0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.06)`;
popover: `0 4px 16px rgba(16,24,40,0.10)`; modal: `0 10px 30px rgba(16,24,40,0.12)`.
Border recipe — default `#E5E7EB`, hover `#D1D5DB`, table-header tint `#F7F8FB`.
Focus ring — `border-color: #5B4FE0` + `box-shadow: 0 0 0 3px rgba(91,79,224,0.12)`.
Hover/active tints — neutral hover `#F0F1F6`, lavender hover `#EEF0F8`, active `#EEF0FD` + text `#5B4FE0`.

## Assumptions / notes

- No README / AGENTS.md / CONTRIBUTING / `.kiro/steering` exist, and there is no test framework; the
  Vite production build is the authoritative "nothing broke" check for CSS-only edits.
- `node_modules` is already installed and Node v24.19.0 is available; the baseline build was verified
  green (105 modules, dist emitted) before planning.
- The `.auth-page::before` radial-gradient uses `rgba(99,102,241,.08)` / `rgba(91,79,224,.05)` indigo
  tints — leave as-is (on-palette).
- `--primary-light` is `rgba(99,102,241,0.1)` (indigo-500 tint); the explicit focus-ring recipe uses
  `rgba(91,79,224,0.12)` to match `--primary`. Both are acceptable; the plan standardizes on the
  explicit value for the hardcoded files and leaves AuthPage.css using `var(--primary-light)`.
