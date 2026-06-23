import type { ModelNode, ModelEdge } from "@mc/okf";
import type { BusinessGoal } from "../state/goal";
import { api } from "./api";

export interface InsightQuestion {
  question: string;
  unlockedBy: string;
}

export interface FocusMart {
  title: string;
  description?: string;
  fields: { name: string; type: string; pk: boolean }[];
  role: "selected" | "neighbour";
}

export interface FocusJoin {
  from: string;
  to: string;
  on: { left: string; right: string }[];
}

export interface QuestionFocus {
  marts: FocusMart[];
  joins: FocusJoin[];
}

function martToFocus(node: ModelNode, role: "selected" | "neighbour"): FocusMart {
  return {
    title: node.title.trim() || "Untitled",
    description: node.description,
    fields: node.schema.map(f => ({ name: f.name, type: f.type, pk: f.pk })),
    role,
  };
}

// Selected mart + every mart it is directly joined to (1 hop), plus the joins
// between the selected mart and those neighbours.
export function buildFocus(nodes: ModelNode[], edges: ModelEdge[], selectedKey: string): QuestionFocus {
  const byKey = new Map(nodes.map(n => [n.key, n]));
  const selected = byKey.get(selectedKey);
  if (!selected) return { marts: [], joins: [] };

  const neighbourKeys = new Set<string>();
  const joins: FocusJoin[] = [];
  for (const e of edges) {
    if (e.from !== selectedKey && e.to !== selectedKey) continue;
    const otherKey = e.from === selectedKey ? e.to : e.from;
    const other = byKey.get(otherKey);
    if (!other) continue;
    neighbourKeys.add(otherKey);
    joins.push({
      from: byKey.get(e.from)!.title.trim() || "Untitled",
      to: byKey.get(e.to)!.title.trim() || "Untitled",
      on: e.keys.map(k => ({ left: k.left, right: k.right })),
    });
  }

  const marts: FocusMart[] = [martToFocus(selected, "selected")];
  for (const k of neighbourKeys) marts.push(martToFocus(byKey.get(k)!, "neighbour"));
  return { marts, joins };
}

export function focusCacheKey(focus: QuestionFocus, goal: BusinessGoal): string {
  return JSON.stringify({ goal, focus });
}

const cache = new Map<string, InsightQuestion[]>();

export function __clearCache(): void {
  cache.clear();
}

export async function getQuestions(
  focus: QuestionFocus,
  goal: BusinessGoal,
  opts: { force?: boolean } = {},
): Promise<InsightQuestion[]> {
  const cacheKey = focusCacheKey(focus, goal);
  if (!opts.force) {
    const hit = cache.get(cacheKey);
    if (hit) return hit;
  }
  const res = await api<{ questions: InsightQuestion[] }>("/api/questions", {
    method: "POST",
    body: JSON.stringify({ niche: goal.niche, goal: goal.goal, focus }),
  });
  cache.set(cacheKey, res.questions);
  return res.questions;
}
