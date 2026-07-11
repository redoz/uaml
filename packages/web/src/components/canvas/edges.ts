import type { Edge } from "@xyflow/react";
import type { ModelNode, ModelEdge } from "@mc/okf";
import type { ViewMode } from "../../state/viewMode";
import type { RelLabelMode } from "../../state/relLabels";

// The rendered edge attaches nowhere fixed: RelEdge computes a floating attach
// point on each node's border facing its neighbour (see floating.ts), so a hub's
// many edges fan out across all four borders instead of stacking on one port. No
// sourceHandle/targetHandle is set here — the single whole-node port ("a") is
// implicit.
function compactEdge(e: ModelEdge, relLabelMode: RelLabelMode, emphasizeMultiplicity: boolean): Edge {
  return {
    id: e.id, source: e.from, target: e.to,
    type: "rel",
    data: { kind: e.kind, fromEnd: e.fromEnd, toEnd: e.toEnd, bidirectional: e.bidirectional, modelEdgeId: e.id, relLabelMode, emphasizeMultiplicity } as unknown as Record<string, unknown>,
  };
}

// Reconnect is scoped to the SELECTED relationship only (overlapping anchors).
export function isEdgeReconnectable(modelEdgeId: string | undefined, selectedEdgeId: string | null): boolean {
  return modelEdgeId != null && modelEdgeId === selectedEdgeId;
}

// `_nodes`/`_viewMode` are retained for a stable signature (callers pass them);
// floating edges no longer need node geometry at build time.
export function buildRfEdges(edges: ModelEdge[], _nodes: ModelNode[], _viewMode: ViewMode, relLabelMode: RelLabelMode = "all", emphasizeMultiplicity = true): Edge[] {
  return edges.map(e => compactEdge(e, relLabelMode, emphasizeMultiplicity));
}

// Synthesise the dashed connectors that tie annotation elements to what they
// annotate: an association-class box to the association line it names, and a
// uml.Note to each element it annotates. RF edges attach only to nodes, so an
// edge-midpoint anchor is approximated by anchoring to the association's source
// node. Endpoints that reference missing nodes are dropped (never error).
export function buildAnchorEdges(nodes: ModelNode[], edges: ModelEdge[]): Edge[] {
  const has = new Set(nodes.map(n => n.key));
  const out: Edge[] = [];
  const anchor = (id: string, source: string, target: string): void => {
    if (has.has(source) && has.has(target)) out.push({ id, source, target, type: "anchor", selectable: false });
  };
  // Association class → the association line it names (approx: the association's source node).
  for (const e of edges) {
    if (e.name && typeof e.name === "object") anchor(`ac-${e.id}`, e.name.ref, e.from);
  }
  // uml.Note → each annotated element.
  for (const n of nodes) {
    if (n.type !== "uml.Note") continue;
    (n.annotates ?? []).forEach((a, i) => {
      const target = "targetKey" in a && !("sourceKey" in a) ? a.targetKey : (a as { sourceKey: string }).sourceKey;
      anchor(`note-${n.key}-${i}`, n.key, target);
    });
  }
  return out;
}
