import type { ModelGraph, ModelNode, ModelEdge, InputSource } from "./types";
import { parseFrontmatter, slugify } from "./slug";

export function parseBundle(files: Record<string, string>): ModelGraph {
  const docs = Object.entries(files).filter(([p]) => p.endsWith(".md") && !p.endsWith("index.md"));
  const nodes: ModelNode[] = []; const slugToKey = new Map<string, string>();
  for (const [path, text] of docs) {
    const { data, body } = parseFrontmatter(text);
    const owox = data.owox || {};
    const title = data.title || "Untitled";
    const key = owox.key || slugify(title, path);
    const fileSlug = path.split("/").pop()!.replace(/\.md$/, "");
    slugToKey.set(fileSlug, key);
    nodes.push({
      key, title, inputSource: (owox.inputSource || "SQL") as InputSource,
      description: data.description || undefined, definition: parseDefinition(body), schema: parseSchema(body),
      position: owox.position || { x: 0, y: 0 },
      status: owox.id ? "created" : "pending", owoxId: owox.id ?? null,
    });
  }
  const raw: { from: string; to: string; keys: { left: string; right: string }[] }[] = [];
  for (const [path, text] of docs) {
    const { data, body } = parseFrontmatter(text);
    const fromKey = (data.owox && data.owox.key) || slugify(data.title || "", path);
    for (const ln of body.split("\n")) {
      const m = ln.match(/^- \[.*?\]\(\.\/(.+?)\.md\)\s*(?:—|--)?\s*(.*)$/);
      if (!m) continue;
      const toKey = slugToKey.get(m[1]); if (!toKey) continue;
      const keys = [...m[2].matchAll(/`([^`]+?)\s*=\s*([^`]+?)`/g)].map(g => ({ left: g[1].trim(), right: g[2].trim() }));
      raw.push({ from: fromKey, to: toKey, keys });
    }
  }
  const edges: ModelEdge[] = []; const seen = new Map<string, ModelEdge>();
  for (const r of raw) {
    const pairKey = [r.from, r.to].sort().join("|");
    const ex = seen.get(pairKey);
    if (ex) { ex.bidirectional = true; continue; }
    const e: ModelEdge = { id: `e${edges.length + 1}`, from: r.from, to: r.to, keys: r.keys, bidirectional: false };
    seen.set(pairKey, e); edges.push(e);
  }
  const storageId = (docs[0] && (parseFrontmatter(docs[0][1]).data.owox || {}).storageId) || null;
  return { storageId, nodes, edges };
}

function parseSchema(body: string): import("./types").SchemaField[] {
  const out: import("./types").SchemaField[] = [];
  const lines = body.split("\n"); let inSchema = false;
  for (const ln of lines) {
    if (/^##?\s+Schema/i.test(ln)) { inSchema = true; continue; }
    if (!inSchema) continue;
    if (/^##?\s+/.test(ln)) break;
    if (!/^\s*\|/.test(ln)) continue;                       // not a table row
    // Cells: | name | type | pk | alias | description | (alias/description optional).
    const cells = ln.split("|").slice(1, -1).map(c => c.trim());
    if (cells.length < 2) continue;
    const name = cells[0].replace(/`/g, "").trim();
    if (!name || name === "Column" || /^:?-+:?$/.test(name)) continue; // header / separator
    const field: import("./types").SchemaField = {
      name,
      type: (cells[1] || "STRING").replace(/`/g, "").trim() || "STRING",
      pk: /^(✓|x|X)$/.test((cells[2] || "").trim()),
    };
    const alias = (cells[3] || "").trim();
    const description = (cells[4] || "").trim();
    if (alias) field.alias = alias;
    if (description) field.description = description;
    out.push(field);
  }
  return out;
}

// Extract the fenced code block under a "## Definition" heading, if present.
function parseDefinition(body: string): string | null {
  const m = body.match(/^##?\s+Definition\s*\n+```[^\n]*\n([\s\S]*?)\n```/im);
  return m ? m[1].trim() : null;
}
