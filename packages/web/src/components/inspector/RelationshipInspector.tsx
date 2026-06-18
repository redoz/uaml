import type { ModelEdge, ModelNode, JoinKey } from "@mc/okf";

interface RelationshipInspectorProps {
  edge: ModelEdge;
  fromNode: ModelNode | undefined;
  toNode: ModelNode | undefined;
  onUpdate: (patch: Partial<ModelEdge>) => void;
}

export function RelationshipInspector({ edge, fromNode, toNode, onUpdate }: RelationshipInspectorProps) {
  function updateKey(i: number, patch: Partial<JoinKey>) {
    onUpdate({
      keys: edge.keys.map((k, idx) => idx === i ? { ...k, ...patch } : k),
    });
  }

  function removeKey(i: number) {
    onUpdate({ keys: edge.keys.filter((_, idx) => idx !== i) });
  }

  function addKey() {
    onUpdate({ keys: [...edge.keys, { left: "", right: "" }] });
  }

  const fromTitle = fromNode?.title ?? "Source";
  const toTitle = toNode?.title ?? "Target";

  return (
    <div className="flex flex-col gap-[15px]">
      {/* Status pill */}
      <div className="text-[12px] px-[11px] py-[9px] rounded-lg flex items-center gap-2 bg-[#f1f5f9] text-[#475569]">
        🔗 Joinable · same storage ✓
      </div>

      {/* Direction */}
      <div className="text-[13px] text-slate-500">
        <strong className="text-slate-900">{fromTitle}</strong>
        {" → "}
        <strong className="text-slate-900">{toTitle}</strong>
      </div>

      {/* Join keys */}
      <div>
        <label className="flex items-center gap-[5px] text-[11px] font-semibold text-slate-500 uppercase tracking-[0.3px] mb-[6px]">
          Join keys
          <span
            className="w-[14px] h-[14px] rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold inline-flex items-center justify-center cursor-help normal-case tracking-normal"
            title="Columns matched between the two marts (left = right). This is what makes the marts joinable in OWOX."
          >
            i
          </span>
        </label>

        {edge.keys.map((k, i) => (
          <div key={i} className="flex gap-[6px] items-center mb-[6px]">
            <input
              type="text"
              value={k.left}
              onChange={e => updateKey(i, { left: e.target.value })}
              placeholder={`${fromTitle} field`}
              className="flex-1 text-[13px] px-[10px] py-[8px] border border-[#d8dee8] rounded-lg text-slate-900 focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#eef0fe]"
            />
            <span className="text-slate-500 font-bold">=</span>
            <input
              type="text"
              value={k.right}
              onChange={e => updateKey(i, { right: e.target.value })}
              placeholder={`${toTitle} field`}
              className="flex-1 text-[13px] px-[10px] py-[8px] border border-[#d8dee8] rounded-lg text-slate-900 focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#eef0fe]"
            />
            <button
              onClick={() => removeKey(i)}
              title="Remove"
              className="border-none bg-transparent text-slate-300 cursor-pointer text-[16px] p-0 hover:text-[#ef4444]"
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={addKey}
          className="text-[12px] px-[10px] py-[5px] border border-[#d8dee8] bg-white text-slate-900 rounded-lg cursor-pointer hover:bg-[#f1f3f7] font-[550]"
        >
          + Add key
        </button>
      </div>

      {/* Bidirectional checkbox */}
      <label
        className="flex items-start gap-[9px] p-[11px] border border-[#d8dee8] rounded-[9px] cursor-pointer"
        title={`One-way: ${fromTitle} can pull fields from ${toTitle}. Bidirectional also lets ${toTitle} pull from ${fromTitle} — shown as a double-headed arrow.`}
      >
        <input
          type="checkbox"
          checked={edge.bidirectional}
          onChange={e => onUpdate({ bidirectional: e.target.checked })}
          className="w-4 h-4 mt-[1px] accent-[#4f46e5] cursor-pointer"
        />
        <span className="text-[12.5px]">
          <strong className="text-[13px] block">Bidirectional relationship</strong>
          <span className="text-slate-500 mt-[2px] leading-[1.4] block">
            Define the join from both sides, not just {fromTitle} → {toTitle}.
          </span>
        </span>
      </label>
    </div>
  );
}
