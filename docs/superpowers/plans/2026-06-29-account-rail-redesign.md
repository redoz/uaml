# Account & right-rail redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the left ModelsRail + scattered account UI (PRs #4/#5) with one right icon-rail + a single right Sheet driven by an `Enable` top-bar control, without regressing the Inspector.

**Architecture:** A single right-side region renders a persistent icon-rail (`Inspect · My Models · History · Share`) plus one active panel in an OWOX-style Sheet. Panel selection is a single `RightPanel` state in `Canvas.tsx`; the existing `Inspector` becomes the `inspect` panel (selection auto-opens it). Account/Enable, My Models, History (+Diff) and Share panels re-host existing dialog/rail content. The top-bar `Enable` control replaces the old OWOX "Sign in", the account chip, and the standalone Save sign-in entry.

**Tech Stack:** React 19 + TypeScript, Vite, Tailwind, Supabase (client-direct), vitest 2.1 + @testing-library/react + jsdom, Lucide icons.

## Global Constraints

- **Do NOT merge to GitHub.** All work stays on a local branch; the user verifies locally (`pnpm dev:web`) before any push/PR. No `gh pr merge`, no push, unless the user explicitly asks.
- **Design source of truth:** `/tmp/mc-preview/prototypes/p4-concept.html` (final concept) and the spec `docs/superpowers/specs/2026-06-29-account-rail-redesign-design.md`.
- **Visual styling:** OWOX Data Marts Design System — tokens in `/tmp/mc-preview/design-system/colors_and_type.css`; reuse the app's existing Tailwind classes/values already in `TopBar.tsx`/`Inspector.tsx` (e.g. border `#d8dee8`, primary `#1e88e5`/hover `#1976d2`, radius `rounded-lg`, status-green `#10b981`).
- **Copy (verbatim):**
  - Enable label/subtext: `Enable` / `History, Saves and more` (signed out); `Enabled` / `<model name>` (signed in, truncated).
  - Enable intro: `Enable saves and version history by creating a free account. It's completely free — we just need to verify you're a real person before unlocking these advanced capabilities. And — being honest — we'll occasionally email you about data-modeling topics. (Unsubscribe anytime, no hard feelings.)`
  - Legal links: Terms `https://www.owox.com/policies/terms-of-service`, Privacy `https://www.owox.com/policies/privacy`.
- **Product rules (locked):** OWOX connect only via `Push to OWOX`; Share available without Enable; My Models + History gated behind Enable; model name shown under `Enabled`, renamed in My Models; top-left corner (logo, Business Goal, Project, Storage) unchanged except the model-name crumb is removed.
- **Commits:** small and frequent; each task ends with a commit on the local branch. Run `pnpm --filter @mc/web test` (and `tsc --noEmit`) before committing.

---

### Task 1: Rebase #4 → main, #5 → #4, set up the local working branch

**Files:** none (git only).

**Interfaces:**
- Produces: a local branch `feat/account-rail-redesign` whose tree = #5 rebased onto current `main`, with a green build + tests. All later tasks branch off this state.

- [ ] **Step 1: Fetch latest refs**

```bash
cd /Users/r.obolonskii/Claude_Workspace/Projects/model-canvas
git fetch origin main 'pull/4/head:pr4' 'pull/5/head:pr5'
```

- [ ] **Step 2: Rebase #4 onto main**

```bash
git checkout pr4 && git rebase origin/main
# resolve conflicts (expect pnpm-lock.yaml; possibly Canvas.tsx/Dock.tsx vs #7), then:
# git add -A && git rebase --continue
```

- [ ] **Step 3: Rebase #5 onto the rebased #4**

```bash
git checkout pr5 && git rebase pr4
# resolve conflicts in Canvas.tsx / Dock.tsx (PR #7 relationship-label changes) + pnpm-lock.yaml
```

- [ ] **Step 4: Create the working branch + worktree for development**

```bash
git branch -f feat/account-rail-redesign pr5
git worktree add /tmp/mc-redesign feat/account-rail-redesign
cd /tmp/mc-redesign && pnpm install && pnpm --filter @mc/okf build
```

- [ ] **Step 5: Verify green baseline**

Run: `cd /tmp/mc-redesign && pnpm --filter @mc/web exec tsc --noEmit && pnpm --filter @mc/web test`
Expected: tsc clean; all web tests PASS.

- [ ] **Step 6: Commit the rebase resolution markers (if rebase created any) — otherwise no-op.** Then confirm `git log --oneline -5` shows #5's commits on top of main.

> All remaining tasks run inside `/tmp/mc-redesign` on `feat/account-rail-redesign`. Reference the Supabase mock from `/tmp/mc-preview/design-system`? No — for local visual verification the user runs with the real `supabaseEnabled` flag off OR copies the mock `supabase.ts`; note this in handoff, do not commit the mock.

---

### Task 2: Right-panel state + RightRail + Sheet shell, with Inspector integrated

This is the riskiest task (the "Inspect must not break" proof point). Deliverable: the left ModelsRail is gone; a right icon-rail is always visible; clicking `Inspect` (or selecting a node/edge) opens the existing Inspector inside the unified Sheet; other rail icons open empty placeholder panels.

**Files:**
- Create: `packages/web/src/components/rail/RightRail.tsx`
- Create: `packages/web/src/components/rail/ModelSheet.tsx`
- Create: `packages/web/src/components/rail/useRightPanel.ts`
- Create: `packages/web/src/components/rail/RightRail.test.tsx`
- Modify: `packages/web/src/components/canvas/Canvas.tsx` (remove `<ModelsRail>` left render ~line 764; render `<RightRail>` + `<ModelSheet>` in the right slot where `<Inspector>` is ~line 861)
- Reference (read, do not yet delete): `packages/web/src/components/ModelsRail.tsx`, `packages/web/src/components/inspector/Inspector.tsx`

**Interfaces:**
- Produces:
  - `type RightPanelId = "inspect" | "models" | "history" | "share" | "enable" | "account"`
  - `useRightPanel(): { active: RightPanelId | null; open(id: RightPanelId): void; close(): void }`
  - `RightRail(props: { active: RightPanelId | null; onOpen(id: RightPanelId): void; signedIn: boolean })`
  - `ModelSheet(props: { active: RightPanelId | null; title: string; onClose(): void; children: React.ReactNode })`

- [ ] **Step 1: Write the failing test for RightRail**

```tsx
// packages/web/src/components/rail/RightRail.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RightRail } from "./RightRail";

describe("RightRail", () => {
  it("renders all four entries and is visible regardless of sign-in", () => {
    render(<RightRail active={null} onOpen={() => {}} signedIn={false} />);
    ["Inspect", "My Models", "History", "Share"].forEach(l =>
      expect(screen.getByRole("button", { name: l })).toBeTruthy());
  });

  it("calls onOpen with the clicked panel id", () => {
    const onOpen = vi.fn();
    render(<RightRail active={null} onOpen={onOpen} signedIn={true} />);
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(onOpen).toHaveBeenCalledWith("history");
  });

  it("marks the active entry with aria-current", () => {
    render(<RightRail active="models" onOpen={() => {}} signedIn={true} />);
    expect(screen.getByRole("button", { name: "My Models" }).getAttribute("aria-current")).toBe("true");
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `cd /tmp/mc-redesign && pnpm --filter @mc/web exec vitest run src/components/rail/RightRail.test.tsx`
Expected: FAIL — cannot resolve `./RightRail`.

- [ ] **Step 3: Implement `useRightPanel.ts`**

```ts
import { useState, useCallback } from "react";
export type RightPanelId = "inspect" | "models" | "history" | "share" | "enable" | "account";
export function useRightPanel() {
  const [active, setActive] = useState<RightPanelId | null>(null);
  const open = useCallback((id: RightPanelId) => setActive(id), []);
  const close = useCallback(() => setActive(null), []);
  return { active, open, close };
}
```

- [ ] **Step 4: Implement `RightRail.tsx`**

```tsx
import { PanelRight, Clock, Share2 } from "lucide-react";
import type { RightPanelId } from "./useRightPanel";

const ModelsGlyph = ({ size = 20 }: { size?: number }) => (
  // OWOX Model Canvas favicon — hub-and-spoke, drawn in currentColor for the rail
  <svg viewBox="0 0 48 48" width={size} height={size} fill="none" aria-hidden="true">
    <g stroke="currentColor" strokeWidth={4.5} strokeLinecap="round">
      <line x1="24" y1="24" x2="24" y2="9"/><line x1="24" y1="24" x2="38" y2="19.5"/>
      <line x1="24" y1="24" x2="33" y2="36"/><line x1="24" y1="24" x2="15" y2="36"/>
      <line x1="24" y1="24" x2="10" y2="19.5"/>
    </g>
    <g fill="currentColor">
      <circle cx="24" cy="9" r="5"/><circle cx="38" cy="19.5" r="5"/><circle cx="33" cy="36" r="5"/>
      <circle cx="15" cy="36" r="5"/><circle cx="10" cy="19.5" r="5"/><circle cx="24" cy="24" r="6"/>
    </g>
  </svg>
);

const ITEMS: { id: RightPanelId; label: string; icon: React.ReactNode }[] = [
  { id: "inspect", label: "Inspect",  icon: <PanelRight size={20} /> },
  { id: "models",  label: "My Models", icon: <ModelsGlyph /> },
  { id: "history", label: "History",  icon: <Clock size={20} /> },
  { id: "share",   label: "Share",    icon: <Share2 size={20} /> },
];

export function RightRail({ active, onOpen, signedIn }: {
  active: RightPanelId | null; onOpen: (id: RightPanelId) => void; signedIn: boolean;
}) {
  return (
    <nav className="w-[74px] flex-shrink-0 border-l border-[#d8dee8] bg-[#fafafa] flex flex-col items-center gap-1 py-[14px] px-[6px] z-20">
      {ITEMS.map(it => {
        const on = active === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onOpen(it.id)}
            aria-current={on ? "true" : undefined}
            className={`w-full flex flex-col items-center gap-1 py-[9px] px-1 rounded-lg text-[11px] font-medium border ${
              on ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] border-[#d8dee8]"
                 : "border-transparent text-slate-500 hover:bg-[#f1f3f7] hover:text-slate-900"}`}
          >
            {it.icon}{it.label}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 5: Run RightRail test, verify PASS**

Run: `pnpm --filter @mc/web exec vitest run src/components/rail/RightRail.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Implement `ModelSheet.tsx` (the OWOX Sheet shell)**

```tsx
import { X } from "lucide-react";
import type { RightPanelId } from "./useRightPanel";

export function ModelSheet({ active, title, onClose, children }: {
  active: RightPanelId | null; title: string; onClose: () => void; children: React.ReactNode;
}) {
  if (!active) return null;
  return (
    <>
      {/* overlay covers the canvas, NOT the rail (rail sits to the right of this) */}
      <div className="absolute inset-0 bg-black/50 z-[15]" onClick={onClose} />
      <aside
        role="dialog" aria-label={title}
        className="absolute top-0 bottom-0 right-[74px] w-[560px] max-w-[calc(100%-74px)] bg-white border-l border-[#d8dee8]
                   shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] z-[16] flex flex-col"
      >
        <div className="flex items-center justify-between gap-2 p-4 border-b border-[#d8dee8]">
          <h2 className="m-0 text-[17px] font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="w-[30px] h-[30px] flex items-center justify-center rounded-md text-slate-500 hover:bg-[#f1f3f7]">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 overflow-auto">{children}</div>
      </aside>
    </>
  );
}
```

- [ ] **Step 7: Wire into `Canvas.tsx`** — remove the left `<ModelsRail>` block (the `supabaseEnabled && <ModelsRail .../>` at ~764) and, in place of the current `<Inspector .../>` at ~861, render the right region. Add near other hooks: `const panel = useRightPanel();`. Auto-open inspect on selection:

```tsx
useEffect(() => { if (selection) panel.open("inspect"); }, [selection]); // selection-driven, preserves current UX
```

Right region JSX (replaces the `<Inspector>` element; the rail is always present, the sheet shows the active panel):

```tsx
<>
  <ModelSheet
    active={panel.active}
    title={SHEET_TITLES[panel.active ?? "inspect"]}
    onClose={() => { panel.close(); if (panel.active === "inspect") setSelection(null); }}
  >
    {panel.active === "inspect" && (
      <Inspector
        selection={selection} nodes={graph.nodes} edges={graph.edges}
        onUpdateNode={store.updateNode} onUpdateEdge={store.updateEdge}
        onClose={() => { setSelection(null); panel.close(); }}
        goal={goal} questionsEnabled={questionsEnabled} onEditGoal={() => setShowGoal(true)}
        embedded   /* new prop: render body only, no own drawer chrome */
      />
    )}
    {/* other panels added in Tasks 3–6 */}
  </ModelSheet>
  <RightRail active={panel.active} onOpen={panel.open} signedIn={!!account} />
</>
```

Add the title map at module scope:

```tsx
const SHEET_TITLES: Record<NonNullable<ReturnType<typeof useRightPanel>["active"]>, string> = {
  inspect: "Inspect", models: "My Models", history: "Version history",
  share: "Share model", enable: "Enable Model Canvas", account: "Account",
};
```

- [ ] **Step 8: Add an `embedded` prop to `Inspector.tsx`** so it renders only its inner content (no own `border-l`, width, resize handle, or ReopenTab) when hosted in the Sheet. When `embedded`, skip the outer wrapper and the `ReopenTab`/collapse logic; render the existing selection body (ObjectInspector/RelationshipInspector/QuestionsPanel/EmptyState) directly. Keep all current behaviour when `embedded` is false (back-compat for any other caller/tests).

- [ ] **Step 9: Run full web tests + tsc**

Run: `pnpm --filter @mc/web exec tsc --noEmit && pnpm --filter @mc/web test`
Expected: PASS. Existing `Inspector`/`TopBar` tests still green (Inspector default path unchanged).

- [ ] **Step 10: Manual check + commit**

Manual: `pnpm --filter @mc/web dev`, with a node on canvas — clicking it opens Inspect in the right Sheet; the rail is visible; Esc/overlay closes it; selecting/deselecting behaves as before.
```bash
git add -A && git commit -m "feat(web): right icon-rail + unified Sheet; Inspector embedded as inspect panel"
```

---

### Task 3: Enable / Account panel (re-host AccountDialog auth)

Deliverable: the `Enable` top-bar control + `enable`/`account` Sheet panels. (Top-bar control added here so the panel is reachable; old buttons removed in Task 7.)

**Files:**
- Create: `packages/web/src/components/rail/EnablePanel.tsx`
- Create: `packages/web/src/components/rail/AccountPanel.tsx`
- Create: `packages/web/src/components/rail/EnablePanel.test.tsx`
- Modify: `packages/web/src/components/canvas/Canvas.tsx` (render the two panels in `ModelSheet`; route `models`/`history` → `enable` when signed out)
- Reference: `packages/web/src/components/AccountDialog.tsx` (auth methods), `packages/web/src/lib/account.tsx`

**Interfaces:**
- Consumes: `useAccount()` from `lib/account.tsx` (`signInWithGoogle/signInWithGitHub/signInWithEmail`, `user`).
- Produces: `EnablePanel(props:{ onGoogle():void; onGitHub():void; onEmail(email:string):void })`, `AccountPanel(props:{ email:string; onMyModels():void; onSignOut():void })`.

- [ ] **Step 1: Failing test for EnablePanel copy + legal links**

```tsx
// EnablePanel.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EnablePanel } from "./EnablePanel";

describe("EnablePanel", () => {
  it("shows the intro copy and both legal links", () => {
    render(<EnablePanel onGoogle={()=>{}} onGitHub={()=>{}} onEmail={()=>{}} />);
    expect(screen.getByText(/we'll occasionally email you about data-modeling topics/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Terms of Service" }).getAttribute("href"))
      .toBe("https://www.owox.com/policies/terms-of-service");
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href"))
      .toBe("https://www.owox.com/policies/privacy");
  });
  it("does NOT list named sharing as a perk", () => {
    render(<EnablePanel onGoogle={()=>{}} onGitHub={()=>{}} onEmail={()=>{}} />);
    expect(screen.queryByText(/named sharing/i)).toBeNull();
  });
  it("submits the typed email", () => {
    const onEmail = vi.fn();
    render(<EnablePanel onGoogle={()=>{}} onGitHub={()=>{}} onEmail={onEmail} />);
    fireEvent.change(screen.getByPlaceholderText("you@company.com"), { target: { value: "a@b.co" } });
    fireEvent.click(screen.getByRole("button", { name: /send magic link/i }));
    expect(onEmail).toHaveBeenCalledWith("a@b.co");
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `vitest run src/components/rail/EnablePanel.test.tsx`.

- [ ] **Step 3: Implement `EnablePanel.tsx`** — translate the prototype's enable panel into Tailwind: intro `<p>` with the verbatim copy; two **non-clickable** descriptive rows (Saves, Version history) using icon tiles; `Continue with Google` / `Continue with GitHub` buttons (reuse the Google/GitHub SVGs from `AccountDialog.tsx`); a divider "or"; an email `<input placeholder="you@company.com">` + `Send magic link` button calling `onEmail(input)`; and the legal `<p>` with the two links (`target="_blank" rel="noreferrer"`). No "Named sharing" row.

- [ ] **Step 4: Implement `AccountPanel.tsx`** — avatar (first letter of email) + email + "Signed in with …"; a `My Models` button → `onMyModels`; a `Sign out` button → `onSignOut`.

- [ ] **Step 5: Wire panels into `Canvas.tsx`** — inside `ModelSheet`, render `EnablePanel` when `panel.active==="enable"` (wire to `useAccount()` actions) and `AccountPanel` when `"account"`. Gate: in the rail `onOpen`, if `id` is `models`/`history` and `!account` → `panel.open("enable")` (keep the clicked icon's intent). The `Enable` control's click → `panel.open(account ? "account" : "enable")`.

- [ ] **Step 6: Run tests + tsc**, verify PASS.

- [ ] **Step 7: Commit** — `git commit -am "feat(web): Enable + Account sheet panels (re-host auth)"`.

---

### Task 4: My Models panel (re-host MyModelsDialog + rename)

**Files:**
- Create: `packages/web/src/components/rail/MyModelsPanel.tsx`
- Create: `packages/web/src/components/rail/MyModelsPanel.test.tsx`
- Modify: `Canvas.tsx` (render panel; pass model list/handlers)
- Reference: `packages/web/src/components/MyModelsDialog.tsx`, `packages/web/src/lib/models.ts` (`listModels/loadModel/updateModel/deleteModel`)

**Interfaces:**
- Consumes: `SavedModel[]` and handlers from existing MyModels logic (`onOpen(id)`, `onNew()`, `onRename(id,name)`, `onDelete(id)`, `currentModelId`).
- Produces: `MyModelsPanel(props:{ models:SavedModel[]; currentModelId:string|null; onOpen; onNew; onRename; onDelete })`.

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MyModelsPanel } from "./MyModelsPanel";
const models = [{ id:"m1", name:"Ecommerce OKF", updated_at:"2026-06-29T00:00:00Z" }];
it("renders saved models and triggers rename", () => {
  const onRename = vi.fn();
  render(<MyModelsPanel models={models} currentModelId="m1" onOpen={()=>{}} onNew={()=>{}} onRename={onRename} onDelete={()=>{}} />);
  expect(screen.getByText("Ecommerce OKF")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /rename ecommerce okf/i }));
  // inline edit appears; type + commit
  fireEvent.change(screen.getByDisplayValue("Ecommerce OKF"), { target:{ value:"Renamed" }});
  fireEvent.keyDown(screen.getByDisplayValue("Renamed"), { key:"Enter" });
  expect(onRename).toHaveBeenCalledWith("m1", "Renamed");
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement `MyModelsPanel.tsx`** — extract the list UI from `MyModelsDialog.tsx` (drop the modal chrome): a `New model` button (`onNew`); per model a row showing name + date, a current badge when `id===currentModelId`, and two `rowact` buttons: `Rename <name>` (aria-label) → inline `<input>` defaulting to the name, commit on Enter/blur via `onRename(id,value)`, cancel on Escape; and `Delete <name>` → `onDelete(id)`. Clicking the row body → `onOpen(id)`.

- [ ] **Step 4: Wire into `Canvas.tsx`** — render when `panel.active==="models"`. Reuse the model-list state/handlers already wired for the old MyModelsDialog/ModelsRail (`handleOpenSaved`, `handleNewModel`, and `updateModel` for rename, `deleteModel` for delete). Renaming a model updates the Enable subtext when it's the current model.

- [ ] **Step 5: Run tests + tsc**, PASS.

- [ ] **Step 6: Commit** — `feat(web): My Models sheet panel with inline rename`.

---

### Task 5: History panel (re-host version list + Diff)

**Files:**
- Create: `packages/web/src/components/rail/HistoryPanel.tsx`
- Create: `packages/web/src/components/rail/HistoryPanel.test.tsx`
- Modify: `Canvas.tsx`
- Reference: `packages/web/src/components/ModelsRail.tsx` (History tab), `packages/web/src/components/DiffDialog.tsx`, `packages/web/src/lib/models.ts` (`listVersions/loadVersion`), `packages/web/src/lib/diff.ts`

**Interfaces:**
- Consumes: `ModelVersion[]`, `onCompare(id)`, `onRestore(id)`, `versionsBump` (refresh trigger), `currentModelId`.
- Produces: `HistoryPanel(props:{ versions:ModelVersion[]; onCompare; onRestore; signedIn:boolean })`.

- [ ] **Step 1: Failing test** — renders versions, calls `onRestore` with the version id; shows the perk description header "Version history".

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HistoryPanel } from "./HistoryPanel";
it("lists versions and restores", () => {
  const onRestore = vi.fn();
  render(<HistoryPanel versions={[{id:"v2",created_at:"2026-06-29T21:54:00Z"}]} onCompare={()=>{}} onRestore={onRestore} signedIn />);
  expect(screen.getByText(/Version history/i)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /restore/i }));
  expect(onRestore).toHaveBeenCalledWith("v2");
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement `HistoryPanel.tsx`** — perk-description header (Clock icon + "Version history" + "Snapshot every save; compare and restore"); a `Current` row with a `Compare` action; each version row with date/diff summary + `Compare`/`Restore`. `Compare` opens the existing `DiffDialog` (keep DiffDialog as-is; trigger via `onCompare`). `Restore` → `onRestore(id)`.

- [ ] **Step 4: Wire into `Canvas.tsx`** — render when `panel.active==="history"`; reuse the version-loading + `handleRestoreVersion` + `versionsBump` wiring from the old ModelsRail. Keep `DiffDialog` mounted at the Canvas level as today.

- [ ] **Step 5: Run tests + tsc**, PASS.

- [ ] **Step 6: Commit** — `feat(web): History sheet panel (versions + diff)`.

---

### Task 6: Share panel (anonymous link, no Enable required)

**Files:**
- Create: `packages/web/src/components/rail/SharePanel.tsx`
- Create: `packages/web/src/components/rail/SharePanel.test.tsx`
- Modify: `Canvas.tsx`
- Reference: existing `handleShare`/`buildShareUrl` + `handleExportSvg` in `Canvas.tsx`

**Interfaces:**
- Produces: `SharePanel(props:{ shareUrl:string; onCopy():void; onExportImage():void })`.

- [ ] **Step 1: Failing test** — shows the URL, Copy calls `onCopy`, Export calls `onExportImage`; renders even when signed out (no gating).

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement `SharePanel.tsx`** — perk-description header (Share2 + "Named sharing" + "Share a model by name with a link"); a read-only input with `shareUrl` + `Copy` button (`onCopy`); an `Export as image` button (`onExportImage`).

- [ ] **Step 4: Wire into `Canvas.tsx`** — render when `panel.active==="share"`. `shareUrl = buildShareUrl(store.get(), modelName)`; `onCopy` reuses existing clipboard + `setShareToast`; `onExportImage` reuses `handleExportSvg`. Share is NOT gated (works signed out).

- [ ] **Step 5: Run tests + tsc**, PASS.

- [ ] **Step 6: Commit** — `feat(web): Share sheet panel (anonymous link + export)`.

---

### Task 7: TopBar — add Enable control, remove OWOX sign-in / account chip / name crumb

**Files:**
- Modify: `packages/web/src/components/TopBar.tsx`
- Modify: `packages/web/src/components/TopBar.test.tsx`
- Modify: `Canvas.tsx` (pass new props; relocate signed-out Save behaviour to Enable)
- Create: `packages/web/src/components/EnableControl.tsx` (the dot+label+subtext button)

**Interfaces:**
- Produces: `EnableControl(props:{ signedIn:boolean; modelName?:string; onClick():void })`.
- TopBar new props: `onEnable():void`. Removed props/usages: the standalone OWOX `onSignIn`/`onSignOut` button rendering (keep `signedIn` for Project/Storage/Push-caret gating), the account chip block, and the model-name crumb.

- [ ] **Step 1: Update TopBar tests** — replace the "shows Sign in/Sign out" assertions with: signed-out renders an `Enable` button with subtext `History, Saves and more` and a gray dot; signed-in renders `Enabled` with the model name as subtext and a green dot; the standalone OWOX "Sign in"/"Sign out" button is gone; Project/Storage pickers still appear only when `signedIn`.

```tsx
it("shows Enable (gray) when no account", () => {
  render(<TopBar signedIn={false} supabaseEnabled accountEmail={null} onEnable={()=>{}} />);
  const en = screen.getByRole("button", { name: /enable/i });
  expect(en.textContent).toMatch(/History, Saves and more/);
  expect(screen.queryByText("Sign in")).toBeNull();
});
it("shows Enabled with the model name when signed in", () => {
  render(<TopBar signedIn={false} supabaseEnabled accountEmail="a@b.co" modelName="Ecommerce OKF" onEnable={()=>{}} />);
  const en = screen.getByRole("button", { name: /enabled/i });
  expect(en.textContent).toMatch(/Ecommerce OKF/);
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement `EnableControl.tsx`** — port the prototype's `.enable` control: dot (`bg-slate-400` → `bg-[#10b981]` when signed in), `Enable`/`Enabled` label, subtext (`History, Saves and more` or truncated `modelName`), chevron; `max-w-[230px]`, name truncates with `truncate`.

- [ ] **Step 4: Edit `TopBar.tsx`** — remove the model-name crumb block, the account-chip dropdown block, and the bottom OWOX `signedIn ? Sign out : Sign in` button. Render `<EnableControl signedIn={!!accountEmail} modelName={modelName} onClick={onEnable} />` at the far right (after Push). Keep Project/Storage/Goal/Push exactly as-is. Keep `onSave` Save button.

- [ ] **Step 5: Edit `Canvas.tsx`** — pass `onEnable={() => panel.open(account ? "account" : "enable")}`. Signed-out `Save` click → `panel.open("enable")` instead of opening the old AccountDialog. Drop the now-unused AccountDialog/MyModelsDialog modal mounts if fully replaced (verify no other callers first).

- [ ] **Step 6: Run tests + tsc**, PASS (update any other test that referenced removed buttons).

- [ ] **Step 7: Commit** — `feat(web): Enable control replaces OWOX sign-in + account chip + name crumb`.

---

### Task 8: Cleanup, gating polish, and dead-code removal

**Files:**
- Delete: `packages/web/src/components/ModelsRail.tsx` (+ its test if any) once fully replaced.
- Delete or keep: `AccountDialog.tsx` / `MyModelsDialog.tsx` — delete only if no remaining importers (grep first).
- Modify: `Canvas.tsx` (final wiring review).

- [ ] **Step 1: Grep for dead imports**

Run: `cd /tmp/mc-redesign && grep -rn "ModelsRail\|AccountDialog\|MyModelsDialog" packages/web/src | grep -v node_modules`
Expected: only the definitions remain (no importers) → safe to delete; if a modal is still used somewhere, leave it.

- [ ] **Step 2: Delete confirmed-dead files**, update `Canvas.tsx` imports.

- [ ] **Step 3: Verify gating end-to-end (test)** — add a Canvas-level or integration test (or a focused RightRail+Canvas test) asserting: signed out, clicking `My Models`/`History` opens the `enable` panel; `Share`/`Inspect` open their own panels; signed in, all open their own panels.

- [ ] **Step 4: Full suite + typecheck + build**

Run: `pnpm --filter @mc/web exec tsc --noEmit && pnpm --filter @mc/web test && pnpm --filter @mc/web build`
Expected: all green.

- [ ] **Step 5: Commit** — `chore(web): remove left rail + dead dialogs after rail/Sheet migration`.

---

## Local verification handoff (no GitHub)

- [ ] Run `cd /tmp/mc-redesign && pnpm --filter @mc/web dev` (to see account UI, set `VITE_SUPABASE_*` OR drop in the `/tmp/mc-preview` mock `supabase.ts` locally — do NOT commit the mock).
- [ ] User verifies: rail always visible; Inspect (node click) unchanged; Enable→auth panel with correct copy + working ToS/Privacy links; signed-in shows model name under Enabled; My Models rename; History compare/restore; Share copies a link without Enable; gating routes My Models/History to Enable when signed out; OWOX connect still only via Push; Business Goal/Project/Storage unchanged.
- [ ] **Do not push or open/merge a PR** until the user explicitly approves after local review.

## Self-review notes

- Spec coverage: decisions A–E, rebase, all six panels, copy, legal, gating, name-under-Enabled + rename-in-MyModels, OWOX-only-via-Push, Share-without-Enable, top-left untouched — each maps to a task (1–8). ✓
- Out-of-scope honored: no server named-share; no `model_versions` retention change. ✓
- Risk task (Inspector integration) isolated as Task 2 with its own manual gate. ✓
