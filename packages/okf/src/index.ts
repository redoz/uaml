export * from "./types";
export { slugify, parseFrontmatter, renderFrontmatter } from "./slug";
export {
  isValidMultiplicity, parseAttributeLine, parseValueLine, parseRelationshipLine,
  renderAttributeLine, renderRelationshipLine,
} from "./grammar";
// WASM core entry points — the bundle-as-truth build/edit surface, the SOLE source
// of truth now that the TS parse/serialize/migrate bodies are retired. `initWasm()`
// is async + memoized; the rest are sync after init.
export { initWasm, apply_ops, build_bundle, build_model, fmt, split_bundle, validate } from "./wasm/index";
