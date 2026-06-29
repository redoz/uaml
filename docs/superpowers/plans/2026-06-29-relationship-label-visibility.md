# Relationship Label Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users control which relationship-edge labels (join keys + cardinality) are shown on the canvas, via a four-mode setting reachable from a hover flyout on the Connect dock button, with an always-visible corner badge and per-browser persistence.

**Architecture:** A new pure module `state/relLabels.ts` owns the mode type, its `localStorage` persistence, and the filtering semantics (`visibleKeys`, `showCardinality`). The mode threads from `Canvas` into edge `data` via `buildRfEdges`, so `RelEdge` filters its label/cardinality as a pure function of props. `Dock` gains a hover-delay flyout + corner badge on the Connect button. Mirrors the existing `viewMode` wiring.

**Tech Stack:** React 18, TypeScript, @xyflow/react (React Flow), Vite, Vitest + @testing-library/react (jsdom), Tailwind utility classes.

## Global Constraints

- All run commands execute from `packages/web` (the `@mc/web` package). Test runner: `pnpm test` (`vitest run --passWithNoTests`); run a single file with `pnpm exec vitest run <path>`.
- Typecheck with `pnpm exec tsc --noEmit` from `packages/web`.
- localStorage helpers must be best-effort: wrap reads/writes in try/catch and fall back gracefully (match `state/viewMode.ts`).
- UI copy is US English, verbatim from the spec — do not reword.
- Default mode is `"all"`; an unknown/missing stored value falls back to `"all"`.
- "Set/defined" key = `k.left || k.right`; "unset/undefined" key = neither side filled.
- Follow existing file conventions: inline SVG icon components and small inline components live in the same file (as `Dock.tsx` already does).

---

### Task 1: `relLabels` state module (type, persistence, filtering semantics)

**Files:**
- Create: `packages/web/src/state/relLabels.ts`
- Test: `packages/web/src/state/relLabels.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type RelLabelMode = "all" | "defined" | "undefined" | "hidden"`
  - `loadRelLabelMode(): RelLabelMode`
  - `persistRelLabelMode(mode: RelLabelMode): void`
  - `isKeySet(k: { left: string; right: string }): boolean`
  - `visibleKeys<T extends { left: string; right: string }>(keys: T[], mode: RelLabelMode): T[]`
  - `showCardinality(keys: { left: string; right: string }[], mode: RelLabelMode): boolean`

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/state/relLabels.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadRelLabelMode,
  persistRelLabelMode,
  isKeySet,
  visibleKeys,
  showCardinality,
} from "./relLabels";

const set = { left: "id", right: "a_id" };
const partial = { left: "id", right: "" };
const unset = { left: "", right: "" };

describe("relLabels persistence", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to 'all' when nothing is stored", () => {
    expect(loadRelLabelMode()).toBe("all");
  });

  it("round-trips each valid mode", () => {
    for (const m of ["all", "defined", "undefined", "hidden"] as const) {
      persistRelLabelMode(m);
      expect(loadRelLabelMode()).toBe(m);
    }
  });

  it("falls back to 'all' for an unrecognised stored value", () => {
    localStorage.setItem("mc.relLabels.v1", "bogus");
    expect(loadRelLabelMode()).toBe("all");
  });

  it("tolerates a throwing localStorage on persist", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => persistRelLabelMode("hidden")).not.toThrow();
    spy.mockRestore();
  });
});

describe("isKeySet", () => {
  it("treats a key with either side filled as set", () => {
    expect(isKeySet(set)).toBe(true);
    expect(isKeySet(partial)).toBe(true);
    expect(isKeySet(unset)).toBe(false);
  });
});

describe("visibleKeys", () => {
  const keys = [set, unset];
  it("all → every key", () => expect(visibleKeys(keys, "all")).toEqual([set, unset]));
  it("defined → only set keys", () => expect(visibleKeys(keys, "defined")).toEqual([set]));
  it("undefined → only unset keys", () => expect(visibleKeys(keys, "undefined")).toEqual([unset]));
  it("hidden → none", () => expect(visibleKeys(keys, "hidden")).toEqual([]));
});

describe("showCardinality", () => {
  it("hidden mode never shows it", () => {
    expect(showCardinality([set], "hidden")).toBe(false);
    expect(showCardinality([], "hidden")).toBe(false);
  });
  it("shows for a zero-key edge in non-hidden modes (nothing is being filtered out)", () => {
    expect(showCardinality([], "all")).toBe(true);
    expect(showCardinality([], "defined")).toBe(true);
    expect(showCardinality([], "undefined")).toBe(true);
  });
  it("shows iff at least one key survives the filter when the edge has keys", () => {
    expect(showCardinality([set], "all")).toBe(true);
    expect(showCardinality([unset], "defined")).toBe(false); // keys exist but none visible
    expect(showCardinality([set, unset], "defined")).toBe(true);
    expect(showCardinality([set], "undefined")).toBe(false);
    expect(showCardinality([unset], "undefined")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/state/relLabels.test.ts`
Expected: FAIL — cannot resolve `./relLabels` / functions not defined.

- [ ] **Step 3: Write minimal implementation**

Create `packages/web/src/state/relLabels.ts`:

```ts
// What relationship-edge labels show on the canvas. A per-browser view
// preference (not model data) — persisted in localStorage, mirroring viewMode.
export type RelLabelMode = "all" | "defined" | "undefined" | "hidden";

const KEY = "mc.relLabels.v1";
const MODES: readonly RelLabelMode[] = ["all", "defined", "undefined", "hidden"];

export function loadRelLabelMode(): RelLabelMode {
  try {
    const v = localStorage.getItem(KEY);
    return MODES.includes(v as RelLabelMode) ? (v as RelLabelMode) : "all";
  } catch {
    return "all";
  }
}

export function persistRelLabelMode(mode: RelLabelMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // best-effort; ignore quota / private-mode failures
  }
}

type KeyPair = { left: string; right: string };

// A key is "set" once either side names a real field; an all-blank key renders
// as "? = ?" on the canvas. Matches the `usable` filter in canvas/edges.ts.
export function isKeySet(k: KeyPair): boolean {
  return Boolean(k.left || k.right);
}

export function visibleKeys<T extends KeyPair>(keys: T[], mode: RelLabelMode): T[] {
  switch (mode) {
    case "all": return keys;
    case "defined": return keys.filter(isKeySet);
    case "undefined": return keys.filter(k => !isKeySet(k));
    case "hidden": return [];
  }
}

// The cardinality badge is meta-info that rides along with the keys: hidden in
// "hidden" mode, hidden when the edge HAS keys but the filter removed them all,
// and otherwise shown (including for an edge that has no keys to begin with).
export function showCardinality(keys: KeyPair[], mode: RelLabelMode): boolean {
  if (mode === "hidden") return false;
  if (keys.length === 0) return true;
  return visibleKeys(keys, mode).length > 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/state/relLabels.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/state/relLabels.ts packages/web/src/state/relLabels.test.ts
git commit -m "feat(web): relLabels mode — persistence + key/cardinality filtering"
```

---

### Task 2: Thread the mode through `buildRfEdges` into edge data

**Files:**
- Modify: `packages/web/src/components/canvas/edges.ts`
- Test: `packages/web/src/components/canvas/edges.test.ts`

**Interfaces:**
- Consumes: `RelLabelMode` from `../../state/relLabels`.
- Produces: `buildRfEdges(edges, nodes, viewMode, relLabelMode?: RelLabelMode)` — every produced edge's `data` now carries `relLabelMode` (defaults to `"all"` when the arg is omitted, so existing 3-arg callers keep working).

- [ ] **Step 1: Write the failing test**

Append to `packages/web/src/components/canvas/edges.test.ts` (inside the existing `describe("buildRfEdges", …)` block, before its closing `});`):

```ts
  it("threads the relLabelMode into edge data (compact)", () => {
    const out = buildRfEdges([edge([{ left: "id", right: "a_id" }])], nodes, "compact", "defined");
    expect((out[0].data as { relLabelMode?: string }).relLabelMode).toBe("defined");
  });

  it("threads the relLabelMode into every ERD per-key edge", () => {
    const out = buildRfEdges(
      [edge([{ left: "id", right: "a_id" }, { left: "x", right: "y" }])],
      nodes, "erd", "undefined",
    );
    expect(out.every(e => (e.data as { relLabelMode?: string }).relLabelMode === "undefined")).toBe(true);
  });

  it("defaults the mode to 'all' when the arg is omitted", () => {
    const out = buildRfEdges([edge([{ left: "id", right: "a_id" }])], nodes, "compact");
    expect((out[0].data as { relLabelMode?: string }).relLabelMode).toBe("all");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/canvas/edges.test.ts`
Expected: FAIL — `data.relLabelMode` is `undefined`.

- [ ] **Step 3: Write minimal implementation**

In `packages/web/src/components/canvas/edges.ts`:

Add the import near the top (after the existing `ViewMode` import):

```ts
import type { RelLabelMode } from "../../state/relLabels";
```

Change `compactEdge` to accept and embed the mode:

```ts
function compactEdge(e: ModelEdge, sides: { source: Side; target: Side }, relLabelMode: RelLabelMode): Edge {
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    sourceHandle: sides.source,
    targetHandle: sides.target,
    type: "rel",
    data: { keys: e.keys, bidirectional: e.bidirectional, cardinality: e.cardinality, modelEdgeId: e.id, relLabelMode } as unknown as Record<string, unknown>,
  };
}
```

Change `buildRfEdges` to take the mode (defaulting to `"all"`), pass it into `compactEdge`, and embed it in the ERD per-key edges:

```ts
export function buildRfEdges(edges: ModelEdge[], nodes: ModelNode[], viewMode: ViewMode, relLabelMode: RelLabelMode = "all"): Edge[] {
  const byKey = new Map(nodes.map(n => [n.key, n]));

  if (viewMode !== "erd") {
    return edges.map(e => compactEdge(e, edgeSides(byKey.get(e.from), byKey.get(e.to), e, viewMode), relLabelMode));
  }

  const fieldsByKey = new Map<string, Set<string>>(
    nodes.map(n => [n.key, new Set(n.schema.map(f => f.name))]),
  );

  return edges.flatMap(e => {
    const sides = edgeSides(byKey.get(e.from), byKey.get(e.to), e, viewMode);
    const usable = e.keys.filter(k => k.left || k.right);
    if (usable.length === 0) return [compactEdge(e, sides, relLabelMode)];

    const srcFields = fieldsByKey.get(e.from);
    const tgtFields = fieldsByKey.get(e.to);
    const srcSide = sides.source === "left" ? "fl" : "fr";
    const tgtSide = sides.target === "left" ? "fl" : "fr";

    return usable.map((k, i): Edge => ({
      id: `${e.id}::${i}`,
      source: e.from,
      target: e.to,
      sourceHandle: k.left && srcFields?.has(k.left) ? `${srcSide}:${k.left}` : sides.source,
      targetHandle: k.right && tgtFields?.has(k.right) ? `${tgtSide}:${k.right}` : sides.target,
      type: "rel",
      data: { keys: [k], bidirectional: e.bidirectional, cardinality: e.cardinality, modelEdgeId: e.id, relLabelMode } as unknown as Record<string, unknown>,
    }));
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/components/canvas/edges.test.ts`
Expected: PASS (new cases + all existing cases).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/canvas/edges.ts packages/web/src/components/canvas/edges.test.ts
git commit -m "feat(web): carry relLabelMode in RF edge data"
```

---

### Task 3: Filter the label + cardinality in `RelEdge`

**Files:**
- Modify: `packages/web/src/components/canvas/RelEdge.tsx`

**Interfaces:**
- Consumes: `relLabelMode` from edge `data` (Task 2); `visibleKeys`, `showCardinality`, `RelLabelMode` from `../../state/relLabels`.
- Produces: no new exports. `RelEdgeData` gains `relLabelMode?: RelLabelMode`.

> No dedicated unit test: `RelEdge` renders inside React Flow's SVG/edge context (`EdgeLabelRenderer`), which is awkward to mount standalone. The filtering logic it calls is fully covered by Task 1; this task is pure wiring, verified by typecheck here and by the manual check in Task 5.

- [ ] **Step 1: Add the import**

At the top of `packages/web/src/components/canvas/RelEdge.tsx`, after the existing `import type { ModelEdge } from "@mc/okf";` line:

```ts
import { visibleKeys, showCardinality, type RelLabelMode } from "../../state/relLabels";
```

- [ ] **Step 2: Extend `RelEdgeData`**

Change the `RelEdgeData` type to include the mode:

```ts
export type RelEdgeData = Pick<ModelEdge, "keys" | "bidirectional" | "cardinality"> & {
  relLabelMode?: RelLabelMode;
};
```

- [ ] **Step 3: Apply the filter where the label + cardinality are derived**

Replace the label derivation block:

```ts
  const edgeData = data as unknown as RelEdgeData | undefined;
  const keys = edgeData?.keys ?? [];
  const bidirectional = edgeData?.bidirectional ?? false;
  const cardinality = edgeData?.cardinality;
```

…with the same lines plus the mode and filtered values:

```ts
  const edgeData = data as unknown as RelEdgeData | undefined;
  const keys = edgeData?.keys ?? [];
  const bidirectional = edgeData?.bidirectional ?? false;
  const cardinality = edgeData?.cardinality;
  const mode: RelLabelMode = edgeData?.relLabelMode ?? "all";
```

Then replace the existing `label` line:

```ts
  const label = keys.length > 0
    ? keys.map(k => `${k.left || "?"} = ${k.right || "?"}`).join(", ")
    : "";
```

…with a version that maps only the visible keys, and compute whether the cardinality badge shows:

```ts
  const shownKeys = visibleKeys(keys, mode);
  const label = shownKeys.length > 0
    ? shownKeys.map(k => `${k.left || "?"} = ${k.right || "?"}`).join(", ")
    : "";
  const cardShown = Boolean(cardinality) && showCardinality(keys, mode);
```

- [ ] **Step 4: Gate the rendered badge region on the new flags**

Change the label-renderer guard from `{(label || cardinality) && (` to:

```tsx
      {(label || cardShown) && (
```

…and change the cardinality span guard from `{cardinality && (` to:

```tsx
            {cardShown && (
```

(The span body still renders `{cardinality}`.)

- [ ] **Step 5: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/canvas/RelEdge.tsx
git commit -m "feat(web): filter edge label + cardinality by relLabelMode"
```

---

### Task 4: Connect-button flyout menu + corner badge in `Dock`

**Files:**
- Modify: `packages/web/src/components/canvas/Dock.tsx`
- Test: `packages/web/src/components/canvas/Dock.test.tsx` (create)

**Interfaces:**
- Consumes: `RelLabelMode` from `../../state/relLabels`.
- Produces: `Dock` gains two optional props — `relLabelMode?: RelLabelMode` (default `"all"`) and `onRelLabelModeChange?: (mode: RelLabelMode) => void`. Optional so `Canvas` (wired in Task 5) compiles before and after.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/canvas/Dock.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Dock } from "./Dock";

const base = {
  activeTool: "select" as const,
  onToolChange: () => {},
  viewMode: "compact" as const,
  onToggleView: () => {},
  onClear: () => {},
};

describe("Dock relationship-labels flyout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("opens the flyout 0.5s after hovering Connect and lists all four modes", () => {
    render(<Dock {...base} relLabelMode="all" onRelLabelModeChange={() => {}} />);
    const connect = screen.getByRole("button", { name: /connect/i });
    fireEvent.mouseEnter(connect.parentElement!);
    expect(screen.queryByText("Show everything")).toBeNull(); // not yet — delay pending
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.getByText("Show everything")).toBeTruthy();
    expect(screen.getByText("Defined keys only")).toBeTruthy();
    expect(screen.getByText("Undefined keys only")).toBeTruthy();
    expect(screen.getByText("Hide all labels")).toBeTruthy();
  });

  it("calls onRelLabelModeChange with the picked mode", () => {
    const onPick = vi.fn();
    render(<Dock {...base} relLabelMode="all" onRelLabelModeChange={onPick} />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: /connect/i }).parentElement!);
    act(() => { vi.advanceTimersByTime(500); });
    fireEvent.click(screen.getByText("Hide all labels"));
    expect(onPick).toHaveBeenCalledWith("hidden");
  });

  it("shows the glyph of the active mode as a badge", () => {
    render(<Dock {...base} relLabelMode="undefined" onRelLabelModeChange={() => {}} />);
    expect(screen.getByTestId("rel-label-badge").textContent).toBe("?");
  });

  it("still activates the Connect tool when the button itself is clicked", () => {
    const onToolChange = vi.fn();
    render(<Dock {...base} onToolChange={onToolChange} relLabelMode="all" onRelLabelModeChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /connect/i }));
    expect(onToolChange).toHaveBeenCalledWith("connect");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/canvas/Dock.test.tsx`
Expected: FAIL — menu text / badge testid not found; props not accepted.

- [ ] **Step 3: Add the mode import, glyph map, and options**

In `packages/web/src/components/canvas/Dock.tsx`, change the existing first import line:

```ts
import type { ViewMode } from "../../state/viewMode";
```

to also pull the mode type:

```ts
import type { ViewMode } from "../../state/viewMode";
import type { RelLabelMode } from "../../state/relLabels";
```

Add, just below the `Tool` type declaration:

```ts
const REL_LABEL_GLYPH: Record<RelLabelMode, string> = {
  all: "≡",
  defined: "=",
  undefined: "?",
  hidden: "⊘",
};

const REL_LABEL_OPTIONS: { mode: RelLabelMode; label: string; helper: string }[] = [
  { mode: "all", label: "Show everything", helper: "All join keys and cardinality on every relationship" },
  { mode: "defined", label: "Defined keys only", helper: "Show keys and cardinality only where the join is filled in; hide labels that are still blank" },
  { mode: "undefined", label: "Undefined keys only", helper: "Show only relationships whose keys aren't set yet — spot what's left to define" },
  { mode: "hidden", label: "Hide all labels", helper: "Just the connector lines — no keys, no cardinality" },
];
```

- [ ] **Step 4: Extend `DockProps`**

Add the two optional props to the `DockProps` interface:

```ts
interface DockProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  viewMode: ViewMode;
  onToggleView: () => void;
  onClear: () => void;
  clearDisabled?: boolean;
  relLabelMode?: RelLabelMode;
  onRelLabelModeChange?: (mode: RelLabelMode) => void;
}
```

- [ ] **Step 5: Add the `ConnectToolButton` component**

Add this component just above the `Dock` function (it needs `useState`/`useRef`, already importable from `react`). Change the top import `import { useEffect } from "react";` to:

```ts
import { useEffect, useRef, useState } from "react";
```

Then add:

```tsx
// The Connect dock button, augmented with a hover-delay flyout for the
// "Relationship labels" view setting and an always-visible corner badge showing
// the active mode's glyph. Clicking the button still activates the Connect tool;
// the flyout (revealed after ~0.5s hover) is a separate, view-only control.
function ConnectToolButton({
  active,
  onActivate,
  relLabelMode,
  onRelLabelModeChange,
}: {
  active: boolean;
  onActivate: () => void;
  relLabelMode: RelLabelMode;
  onRelLabelModeChange?: (mode: RelLabelMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };
  const handleEnter = () => {
    clearTimer();
    timer.current = setTimeout(() => setOpen(true), 500);
  };
  const handleLeave = () => {
    clearTimer();
    setOpen(false);
  };
  useEffect(() => clearTimer, []);

  return (
    <div className="relative group" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        onClick={onActivate}
        aria-label="Connect (C) — or drag from a node's port"
        className={`
          relative w-[38px] h-[38px] rounded-[9px] border-none flex items-center justify-center cursor-pointer transition-colors
          ${active
            ? "bg-[#e6f1fb] text-[#1e88e5]"
            : "bg-transparent text-slate-500 hover:bg-[#f1f3f7] hover:text-slate-900"
          }
        `}
      >
        <ConnectIcon />
        <span
          data-testid="rel-label-badge"
          aria-hidden
          className="absolute -top-[3px] -right-[3px] min-w-[14px] h-[14px] px-[2px] rounded-full bg-slate-900 text-white text-[9px] leading-[14px] font-semibold text-center shadow-[0_1px_2px_rgba(15,23,42,0.4)]"
        >
          {REL_LABEL_GLYPH[relLabelMode]}
        </span>
      </button>

      {!open && <DockTip label="Connect (C) — or drag from a node's port" />}

      {open && (
        <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50">
          {/* invisible bridge so the cursor can travel from button to menu without closing */}
          <span className="absolute right-full top-0 h-full w-[12px]" />
          <div className="w-[260px] rounded-xl border border-[#d8dee8] bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.14)]">
            <div className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Relationship labels
            </div>
            {REL_LABEL_OPTIONS.map(opt => {
              const selected = opt.mode === relLabelMode;
              return (
                <button
                  key={opt.mode}
                  onClick={() => { onRelLabelModeChange?.(opt.mode); setOpen(false); }}
                  className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${selected ? "bg-[#e6f1fb]" : "hover:bg-[#f1f3f7]"}`}
                >
                  <span className={`mt-[1px] w-[16px] flex-shrink-0 text-center text-[12px] font-bold ${selected ? "text-[#1e88e5]" : "text-slate-400"}`}>
                    {REL_LABEL_GLYPH[opt.mode]}
                  </span>
                  <span className="flex flex-col">
                    <span className={`text-[13px] font-semibold ${selected ? "text-[#1e88e5]" : "text-slate-800"}`}>{opt.label}</span>
                    <span className="text-[11px] leading-snug text-slate-500">{opt.helper}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Swap the Connect `ToolButton` for `ConnectToolButton` and accept the new props**

Change the `Dock` function signature line to destructure the new props:

```tsx
export function Dock({ activeTool, onToolChange, viewMode, onToggleView, onClear, clearDisabled, relLabelMode = "all", onRelLabelModeChange }: DockProps) {
```

Replace the existing Connect `ToolButton` block:

```tsx
      <ToolButton
        icon={<ConnectIcon />}
        tip="Connect (C) — or drag from a node's port"
        active={activeTool === "connect"}
        onClick={() => onToolChange("connect")}
      />
```

with:

```tsx
      <ConnectToolButton
        active={activeTool === "connect"}
        onActivate={() => onToolChange("connect")}
        relLabelMode={relLabelMode}
        onRelLabelModeChange={onRelLabelModeChange}
      />
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/canvas/Dock.test.tsx`
Expected: PASS (all four cases).

- [ ] **Step 8: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/components/canvas/Dock.tsx packages/web/src/components/canvas/Dock.test.tsx
git commit -m "feat(web): Connect-button flyout + corner badge for relationship labels"
```

---

### Task 5: Wire the mode through `Canvas`

**Files:**
- Modify: `packages/web/src/components/canvas/Canvas.tsx`

**Interfaces:**
- Consumes: `loadRelLabelMode`, `persistRelLabelMode`, `RelLabelMode` from `../../state/relLabels`; the 4th `buildRfEdges` arg (Task 2); `Dock`'s `relLabelMode` / `onRelLabelModeChange` props (Task 4).
- Produces: no new exports. Live integration: the dock controls the canvas edge labels.

> No unit test: `Canvas` is the integration shell (no existing test). Verified by typecheck + full suite here, and by the manual dev-server check below.

- [ ] **Step 1: Add the import**

In `packages/web/src/components/canvas/Canvas.tsx`, after the existing `viewMode` import line
(`import { loadViewMode, persistViewMode, type ViewMode } from "../../state/viewMode";`), add:

```ts
import { loadRelLabelMode, persistRelLabelMode, type RelLabelMode } from "../../state/relLabels";
```

- [ ] **Step 2: Add state + persist handler**

Just after the existing `const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode());` line, add:

```ts
  const [relLabelMode, setRelLabelMode] = useState<RelLabelMode>(loadRelLabelMode());
  const handleRelLabelModeChange = useCallback((mode: RelLabelMode) => {
    setRelLabelMode(mode);
    persistRelLabelMode(mode);
  }, []);
```

- [ ] **Step 3: Pass the mode into `buildRfEdges` and add it to the effect deps**

Replace the edges-building effect:

```ts
  useEffect(() => { setRfEdges(buildRfEdges(graph.edges, graph.nodes, viewMode)); }, [graph.edges, graph.nodes, viewMode, setRfEdges]);
```

with:

```ts
  useEffect(() => { setRfEdges(buildRfEdges(graph.edges, graph.nodes, viewMode, relLabelMode)); }, [graph.edges, graph.nodes, viewMode, relLabelMode, setRfEdges]);
```

- [ ] **Step 4: Pass the props to `Dock`**

Change the `<Dock … />` element to add the two props:

```tsx
        <Dock activeTool={tool} onToolChange={handleToolChange} viewMode={viewMode} onToggleView={handleToggleView} onClear={() => setShowClear(true)} clearDisabled={graph.nodes.length === 0} relLabelMode={relLabelMode} onRelLabelModeChange={handleRelLabelModeChange} />
```

- [ ] **Step 5: Verify typecheck + full test suite**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: typecheck clean; all tests pass.

- [ ] **Step 6: Manual verification (dev server)**

Per the project convention (don't auto-screenshot; let the user verify visually):
Run `pnpm dev:web` from the repo root, then confirm in the browser:
- Hovering the Connect dock button ~0.5s opens the flyout with the four modes.
- Picking each mode updates the edge labels: `defined` hides `? = ?` edges' labels (and their cardinality), `undefined` shows only `? = ?` edges, `hidden` shows bare lines.
- The corner badge glyph (`≡`/`=`/`?`/`⊘`) matches the active mode.
- Reloading the page preserves the chosen mode.
- Toggling ERD view keeps the filter applied.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/components/canvas/Canvas.tsx
git commit -m "feat(web): wire relationship-label mode from dock into canvas edges"
```

---

## Self-Review

**Spec coverage:**
- Four modes + default `all` → Task 1 (`visibleKeys`), Task 4 (`REL_LABEL_OPTIONS`). ✓
- "set vs unset" definition → Task 1 (`isKeySet`). ✓
- Cardinality rides along (hidden when keys hidden; shown for zero-key edges in non-hidden modes) → Task 1 (`showCardinality`), Task 3 (gating). ✓
- Glyph badge `≡/=/?/⊘`, always visible → Task 4 (`REL_LABEL_GLYPH`, badge span). ✓
- Hover-0.5s flyout on Connect, bridge, click-to-select, button still connects → Task 4. ✓
- Persistence in `mc.relLabels.v1`, fallback `all` → Task 1. ✓
- Applies in compact + ERD; routing untouched → Task 2 (both branches carry mode), Task 3 (label-only). ✓
- Not persisted in OKF/share link → no task touches `okf/io` or `share/*` (out of scope, respected). ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `RelLabelMode` used identically across tasks; `buildRfEdges` 4th param + default `"all"` consistent between Task 2 (def) and Task 5 (call); `RelEdgeData.relLabelMode` (Task 3) matches the `data` field written in Task 2; `Dock` props (Task 4) match the call in Task 5. ✓
