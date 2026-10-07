# Three-tone surface layering for the light/indigo UI

The coder addressed the user's "too white / too flat" feedback with a CSS-only pass across the 8 target stylesheets. Instead of darkening the theme, it introduces a three-step surface scale — page canvas `#EEF0F5`, sidebar/panel tone `#F6F7FB`, white cards `#FFFFFF` — and replaces the old pure-black `rgba(0,0,0,…)` drop shadows with cool-tinted `rgba(16,24,40,…)` recipes plus a soft indigo focus ring. The light + indigo identity (accents `#5B4FE0` / `#4F46E5`, semantic status colors) is preserved; only tones and shadows move. No selectors, variable names, or layout properties were touched.

Watch for: nothing blocking. One cosmetic doc-vs-code naming nuance (verification table labels the chat video wrapper as `.panel-right`) — confirmed harmless. (confirmed)

**Verdict**: APPROVED

## High-level view

The layering problem is solved by spreading surfaces across three distinguishable light tones rather than adding darkness. The deepest plane (page/canvas) drops from `#F3F4F6` to `#EEF0F5` in `--bg-primary`/`--bg-tertiary`, the chat area, and the admin layout. The middle plane (sidebars, chat video panel, right panel) lands on whisper-lavender `#F6F7FB`, which is where the admin sidebar's old flat `#FFFFFF` and the chat sidebar's `#FAFAFB` now converge. Cards, tables, modals, and the input bar stay `#FFFFFF` and float above via shadow. This is a genuine three-step hierarchy, not a repaint.

The shadow language shifts from pure black to a cool blue-gray `rgba(16,24,40,…)` and gains a two-layer card recipe (`0 1px 2px …0.04, 0 4px 12px …0.06`), so panels read as lifted rather than outlined. Interactive affordance is reinforced by a 3px indigo focus ring (`rgba(91,79,224,0.12)`) added to the chat input, modal inputs, and provider-config inputs, matching the ring AuthPage already used.

Scope is tight and reversible. Every change is a value tweak to `background-color`, `box-shadow`, or `border-color` within an existing selector. No `:root` token was renamed, no selector was added or removed, and no layout property moved — so AuthPage and every consumer keep resolving the same tokens. The production build is green (`✓ built in 8.72s`, `dist/` emitted) with the CSS bundle growing a plausible 0.28 kB.

<details>
<summary>Issues (1)</summary>

1. **Doc naming nuance (non-blocking)** — verification.md's tone table lists `.panel-right` under the `#F6F7FB` plane, but the diff shows the `#F6F7FB` ChatArea change on the centered video wrapper (line ~144). Cosmetic mislabel in the doc, not a code defect; no action required.

</details>

<details>
<summary>Details</summary>

### Three-step surface scale

The page/canvas plane is lowered consistently: `--bg-primary` and `--bg-tertiary` go `#F3F4F6 → #EEF0F5` in App.css, `.chat-area` goes `#FFFFFF → #EEF0F5`, and `.admin-layout` goes `#F3F4F6 → #EEF0F5`. The chat area dropping off pure white is the key move for the "too white" complaint — the main workspace now sits a notch below its cards.

The middle plane consolidates on `#F6F7FB`: the chat `.sidebar` (`#FAFAFB → #F6F7FB`), the admin `.admin-sidebar` (`#FFFFFF → #F6F7FB`), and the chat video wrapper (`#FAFAFB → #F6F7FB`). The admin sidebar is the most meaningful change here — it previously matched the white cards exactly, so there was no separation at all; now it reads as a distinct lavender-tinted rail. Cards, `.manager-table`, `.modal`, `.result-section`, `.config-form-card`, and the input bar remain `#FFFFFF`, completing page < sidebar < card.

```
#EEF0F5  page / chat-area / admin-layout      (deepest)
#F6F7FB  sidebars / video panel               (middle, whisper-lavender)
#FFFFFF  cards / tables / modals / input bar  (top, shadow-lifted)
```

### Shadow and border delineation

Every pure-black shadow is replaced by cool-tinted `rgba(16,24,40,…)`. The card recipe becomes two-layer (`0 1px 2px …0.04, 0 4px 12px …0.06`) in `--shadow-md`, `.result-section`, `.main-video`, `.manager-table`, and `.config-form-card`; the popover uses `0 4px 16px …0.10`; modals/`--shadow-lg` use `0 10px 30px …0.12`. Sidebars gain a hairline `box-shadow: 1px 0 0 rgba(16,24,40,0.02)` on top of their existing `border-right`, so the rail edge reads even against the near-tone page. The table-header tint moves `#F9FAFB → #F7F8FB` to stay in the cool family. These are value swaps only — no shadow was removed, so nothing goes flatter than before.

### Focus-ring hierarchy

A 3px indigo ring `box-shadow: 0 0 0 3px rgba(91,79,224,0.12)` is added alongside the existing `border-color: #5B4FE0` on `.input-container:focus-within`, the modal input/select focus, and the provider-config input/select focus. This matches the ring AuthPage already carries, so focus states are now consistent app-wide. The ring is additive — it does not replace or weaken the border — and hover tints shift to the cool `#F0F1F6` so hover and focus share the same temperature.

### Scope, selectors, and tokens

The diff is 29 insertions / 25 deletions across exactly the 8 named CSS files; no `.jsx`/`.js`, `index.html`, `vite.config.js`, or `package.json` appears. Reading the hunks, every `-`/`+` pair is a property value change inside a selector that already existed — no selector line is deleted and none is renamed. All `:root` variable names (`--bg-primary`, `--bg-tertiary`, `--bg-hover`, `--shadow-sm/md/lg`) are unchanged, so AuthPage and the rest keep resolving the same tokens even though AuthPage itself only swapped `.auth-form` from `--shadow-lg` to `--shadow-md` (login card now reads as a lifted card on the deeper page). No `display/flex/grid/width/height/min-width/padding/margin/position/overflow` was altered.

### Theme identity preserved

Accents stay `#5B4FE0` / `#4F46E5`; body/heading text `#1E2130`, secondary `#6B7280`, borders `#E5E7EB`/`#D1D5DB` are untouched; the active admin nav keeps solid indigo with white text and the active request item keeps pale-lavender `#EEF0FD` + indigo text. The deepened surfaces are still clearly light, so no low-contrast gray-on-white body text is introduced and the theme is not darkened or over-saturated.

### Build evidence

verification.md records a green Vite production build (`vite v5.4.21`, 105 modules transformed, `✓ built in 8.72s`, `dist/` emitted then cleaned), with a matching green baseline build before the edits. The CSS bundle grew `19.06 → 19.34 kB`, consistent with the added shadow/focus-ring declarations and no added selectors. No build was re-run during this review; the recorded evidence is consistent with the diff.

</details>

<details>
<summary>File map</summary>

- `frontend/src/styles/App.css` — `:root` page/hover tones lowered, shadow recipes recolored to cool-tint.
- `frontend/src/styles/AuthPage.css` — login card shadow `--shadow-lg → --shadow-md`.
- `frontend/src/styles/ChatArea.css` — chat area off white, video panel/wrapper tones, cool shadows, indigo input focus ring.
- `frontend/src/styles/Sidebar.css` — sidebar to `#F6F7FB` + hairline edge shadow, hover tints.
- `frontend/src/styles/admin/AdminLayout.css` — admin canvas to `#EEF0F5`.
- `frontend/src/styles/admin/AdminSidebar.css` — admin sidebar to `#F6F7FB` + edge shadow, hover tints.
- `frontend/src/styles/admin/Manager.css` — table/modal cool shadows, header tint, modal focus ring.
- `frontend/src/styles/admin/ProviderManager.css` — config card cool shadow, input focus ring.

Full diff: `git -C c:\Users\hp\Desktop\ai_video_poc diff`

</details>
