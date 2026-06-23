import type { OwoxClient } from "./client";
import type { ImportPayload, ImportRelationship } from "./types";

const MAX_IMPORT = 100;

// Resolve the chosen storage to its title+type (list items have no storage id),
// list + cap its marts at MAX_IMPORT, fetch details in parallel, then read the
// relationship graph. Each graph spans the whole connected component, so once a
// mart is seen we skip re-rooting from it; edges are deduped by directed pair.
export async function buildImportPayload(client: OwoxClient, storageId: string): Promise<ImportPayload> {
  const storages = (await client.listStorages()) as any[];
  const storage = storages.find(s => s.id === storageId);
  if (!storage) throw new Error(`Unknown storage id: ${storageId}`);

  const all = await client.listDataMartsForStorage(storage.title, storage.type);
  const total = all.length;
  const picked = all.slice(0, MAX_IMPORT);

  const marts = await Promise.all(picked.map(m => client.getImportMart(m.id)));

  const covered = new Set<string>();
  const seenPair = new Set<string>();
  const relationships: ImportRelationship[] = [];
  for (const m of picked) {
    if (covered.has(m.id)) continue;
    const rels = await client.getRelationshipGraph(m.id);
    covered.add(m.id);
    for (const r of rels) {
      covered.add(r.sourceId); covered.add(r.targetId);
      const key = `${r.sourceId}>${r.targetId}`;
      if (seenPair.has(key)) continue;
      seenPair.add(key);
      relationships.push(r);
    }
  }

  return { storageId, total, truncated: total > MAX_IMPORT, marts, relationships };
}
