import { describe, it, expect } from "vitest";
import { buildImportPayload } from "../src/owox/import";

function fakeClient(count: number) {
  const marts = Array.from({ length: count }, (_, i) => ({ id: `m${i}`, title: `M${i}`, status: "PUBLISHED" }));
  return {
    listStorages: async () => [{ id: "st_1", title: "BQ", type: "GOOGLE_BIGQUERY" }],
    listDataMartsForStorage: async () => marts,
    getImportMart: async (id: string) => ({ id, title: id, status: "PUBLISHED", schema: [], inputSource: "SQL", definition: null }),
    getRelationshipGraph: async (id: string) => id === "m0" ? [{ sourceId: "m0", targetId: "m1", joinConditions: [] }] : [],
  } as any;
}

describe("buildImportPayload", () => {
  it("returns all marts + relationships under the cap", async () => {
    const p = await buildImportPayload(fakeClient(3), "st_1");
    expect(p.total).toBe(3);
    expect(p.truncated).toBe(false);
    expect(p.marts.map(m => m.id)).toEqual(["m0", "m1", "m2"]);
    expect(p.relationships).toEqual([{ sourceId: "m0", targetId: "m1", joinConditions: [] }]);
    expect(p.storageId).toBe("st_1");
  });

  it("caps at the first 100 and sets truncated", async () => {
    const p = await buildImportPayload(fakeClient(150), "st_1");
    expect(p.total).toBe(150);
    expect(p.truncated).toBe(true);
    expect(p.marts).toHaveLength(100);
    expect(p.marts[0].id).toBe("m0");
    expect(p.marts[99].id).toBe("m99");
  });

  it("skips roots already covered by a component and dedupes directed pairs", async () => {
    const calls: string[] = [];
    const client = {
      listStorages: async () => [{ id: "st_1", title: "BQ", type: "GOOGLE_BIGQUERY" }],
      listDataMartsForStorage: async () => [{ id: "a" }, { id: "b" }, { id: "c" }],
      getImportMart: async (id: string) => ({ id, title: id, schema: [], inputSource: "SQL", definition: null }),
      getRelationshipGraph: async (id: string) => { calls.push(id); return id === "a" ? [{ sourceId: "a", targetId: "b", joinConditions: [] }] : []; },
    } as any;
    const p = await buildImportPayload(client, "st_1");
    // a's component covers b, so b is not re-rooted; c still is.
    expect(calls).toEqual(["a", "c"]);
    expect(p.relationships).toEqual([{ sourceId: "a", targetId: "b", joinConditions: [] }]);
  });

  it("throws for an unknown storage id", async () => {
    await expect(buildImportPayload(fakeClient(1), "nope")).rejects.toThrow();
  });
});
