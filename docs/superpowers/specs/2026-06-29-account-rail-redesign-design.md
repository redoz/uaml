# Model Canvas — Account & right-rail redesign

**Date:** 2026-06-29
**Status:** design approved (visual), pending spec review
**Concept prototype:** `p4-concept.html` (P4 base + iterations 1–2 + final decisions)

## Goal

Replace the current account/save UX in PRs **#4** (sign-up-to-save, Supabase) and
**#5** (version history + left rail) with the approved design:

- a single **`Enable` control** in the top bar (replaces the old "Sign in" + account chip),
- a **right icon-rail** (Inspect · My Models · History · Share) that replaces the
  left `ModelsRail`,
- one **right Sheet** that hosts every panel, with the rail always visible so the
  user sees what's open and what else is available,
- without breaking the existing **Inspector** behaviour.

This is a UI/UX refactor of already-built functionality — not new backend work.

## Preconditions

- **Rebase required.** #4 and #5 are 15 commits behind `main`. Rebase **#4 → main**,
  then **#5 → #4**. Expect conflicts in `Canvas.tsx` and `Dock.tsx` (PR #7
  "relationship label visibility" touched the same dock/edge area) and in
  `pnpm-lock.yaml`. Resolve before any redesign work.
- #5 currently ships a **left** `ModelsRail`; this redesign discards it. #5 should be
  **reworked** to the right rail rather than merged-then-replaced.

## Product decisions (locked)

| # | Decision |
|---|---|
| A | **OWOX API-key connect** has no separate button. It is triggered **only from `Push to OWOX`** when not connected. The old top-bar "Sign in / Sign out" (OWOX) is removed. |
| B | **Share** moves into the right rail and stays **available without Enable** (the existing anonymous `#m=` hash link). A server-side *named* share is a **later, account-gated** upgrade — out of scope here. So Share is **not** an Enable perk and is **not** listed in the Enable panel. |
| C | The rail is on the **right**. The left rail is removed. |
| D | **Project / Storage pickers** stay where they are now (top bar), populated when an OWOX token is entered (token only via `Push to OWOX`). No layout change. |
| E | **Business Goal / Insight Questions** stays unchanged (top-left). The top-left corner is otherwise untouched, **except** the inline model-name crumb is removed: the model name is shown under **`Enabled`** (top-right), and **renaming moves into the My Models panel** (right). |

## Final layout

### Top bar
`◻ Model Canvas` · Business Goal* · Project* · Storage* · … · Templates · Import ·
Export ▾ · Save · `→ Push to OWOX (n)` · **`Enable ▾`**

(*OWOX-connected-only, unchanged. Model-name crumb removed.)

**Enable control**
- Signed out: dot **gray**, label **`Enable`**, subtext **`History, Saves and more`**.
- Signed in: dot **green**, label **`Enabled`**, subtext = **current model name**
  (truncated with `…`; the user can keep/switch several models).
- Click → opens the right Sheet: **Enable panel** when signed out, **Account panel**
  when signed in.

### Right icon-rail (always visible, even signed out)
`Inspect` · `My Models` (favicon hub-and-spoke glyph) · `History` · `Share`.
- The rail stays visible whenever the Sheet is open; the active icon is highlighted.
- `My Models` / `History` are **gated**: clicking while signed out opens the **Enable
  panel** (the clicked rail icon stays highlighted as the intent).
- `Inspect` and `Share` work without an account.

### Right Sheet (OWOX `Sheet` pattern)
Side right, overlay `rgba(0,0,0,.5)` over the canvas (not the rail), header
`border-b p-4` + × close, `shadow-lg`. Panels:

| Panel | Source today | Notes |
|---|---|---|
| **Enable** (signed out) | `AccountDialog` (#4) | intro copy + 2 perk rows (Saves, Version history, **non-clickable, descriptive**) + Continue with Google / GitHub / email magic link + legal note (ToS/Privacy). |
| **Account** (signed in) | account chip dropdown | avatar + email + "My Models" link + Sign out. |
| **Inspect** | `Inspector` (#existing) | selection-driven object/relationship editor — behaviour unchanged. |
| **My Models** | `MyModelsDialog` (#4) | list / open / **rename** / delete + New model. Perk description shown at top. |
| **History** | `ModelsRail` History tab + `DiffDialog` (#5) | version list, compare, restore. Perk description at top. |
| **Share** | `handleShare` / `buildShareUrl` (#existing) | anonymous link copy + Export image. Available without Enable. |

After sign-in, the two perk descriptions relocate from the Enable panel into the
**My Models** and **History** panels (shown as the panel's top description).

### Copy (locked)
- Enable intro: **"Enable saves and version history by creating a free account.**
  It's completely free — we just need to verify you're a real person before unlocking
  these advanced capabilities. And — being honest — we'll occasionally email you about
  data-modeling topics. (Unsubscribe anytime, no hard feelings.)"
- Legal: "By continuing, you agree to our [Terms of Service](https://www.owox.com/policies/terms-of-service)
  and [Privacy Policy](https://www.owox.com/policies/privacy)."

## Component impact

| Component | Change |
|---|---|
| `TopBar.tsx` | Remove OWOX Sign in/out button; remove inline model-name crumb; remove account chip + (relocate) Save's signed-out behaviour into the Enable flow; add the `Enable` control (dot + label + subtext + chevron). |
| `ModelsRail.tsx` | **Replace** — becomes the right icon-rail + drives the Sheet (or split into `RightRail` + `ModelSheet`). |
| `Inspector.tsx` | Integrate into the unified right system so rail `Inspect` toggles it and the rail stays visible. **Highest-risk integration point** — must not regress selection-driven editing, resize, or reopen. |
| `AccountDialog.tsx` | Re-host its Google/GitHub/email content inside the Enable Sheet panel; add the new intro/legal copy + 2 perk rows. |
| `MyModelsDialog.tsx` | Re-host as the My Models Sheet panel; keep rename/delete; rename becomes the single place to edit a model's name. |
| `DiffDialog.tsx` | Reachable from the History panel (compare); behaviour unchanged. |
| `Canvas.tsx` | Wire the rail + Sheet; drop the left-rail render; keep `handleShare`, Save, version restore wiring. Reconcile with #7 dock/edge changes after rebase. |

## Phasing (implementation order)

1. **Rebase** #4 → main, then #5 → #4; green build + tests.
2. **Right system scaffold:** right icon-rail + unified Sheet shell; integrate
   `Inspector` as the `Inspect` panel (prove "Inspect doesn't break").
3. **Move panels in:** Account/Enable (from AccountDialog), My Models, History
   (+ Diff), Share — one at a time.
4. **Top bar:** add Enable control, remove OWOX Sign in + name crumb, relocate Save
   signed-out behaviour; model name under Enabled; rename in My Models.
5. **Polish:** gating (My Models/History → Enable when signed out), active-icon
   highlight, status dot + `--success` token, copy, legal links.

## Out of scope

- Server-side *named* sharing (future, account-gated).
- `model_versions` retention limit (separate concern from the earlier review — still
  worth doing before public launch, but not part of this redesign).
- Any change to OWOX connect / Push / Project / Storage logic beyond removing the
  standalone OWOX sign-in button.

## Risks

- **Inspector integration** (two right drawers → one system) is the main risk; treat
  phase 2 as the proof point.
- **Rebase conflicts** with #7 in `Dock.tsx` / `Canvas.tsx`.
- Reworking #5's left rail means part of #5's shipped code is discarded — confirm with
  reviewers that #5 is reworked, not merged-as-is.
