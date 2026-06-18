import type { SchemaField } from "@mc/okf";

const FIELD_TYPES = ["STRING", "INTEGER", "FLOAT", "NUMERIC", "BOOLEAN", "DATE", "DATETIME", "TIMESTAMP"];

interface SchemaEditorProps {
  schema: SchemaField[];
  onChange: (schema: SchemaField[]) => void;
}

export function SchemaEditor({ schema, onChange }: SchemaEditorProps) {
  function updateField(i: number, patch: Partial<SchemaField>) {
    onChange(schema.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  }

  function removeField(i: number) {
    onChange(schema.filter((_, idx) => idx !== i));
  }

  function addField() {
    onChange([...schema, { name: "", type: "STRING", pk: false }]);
  }

  return (
    <div className="border border-[#d8dee8] rounded-[10px] overflow-hidden">
      {/* Header */}
      <div
        className="grid bg-[#f8fafc] px-[10px] py-[7px] text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.3px] border-b border-[#d8dee8]"
        style={{ gridTemplateColumns: "1fr 100px 34px 26px" }}
      >
        <span>Name</span>
        <span>Type</span>
        <span>PK</span>
        <span />
      </div>

      {/* Rows */}
      {schema.map((field, i) => (
        <div
          key={i}
          className="grid px-[10px] py-[6px] border-b border-[#eef1f5] last:border-b-0 items-center gap-[6px]"
          style={{ gridTemplateColumns: "1fr 100px 34px 26px" }}
        >
          <input
            type="text"
            value={field.name}
            onChange={e => updateField(i, { name: e.target.value })}
            placeholder="field name"
            className="w-full text-[12.5px] px-[7px] py-[5px] border border-[#d8dee8] rounded-lg text-slate-900 focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#eef0fe]"
          />
          <select
            value={field.type}
            onChange={e => updateField(i, { type: e.target.value })}
            className="w-full text-[11.5px] px-[6px] py-[5px] border border-[#d8dee8] rounded-lg text-slate-900 focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#eef0fe]"
          >
            {FIELD_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="checkbox"
            checked={field.pk}
            onChange={e => updateField(i, { pk: e.target.checked })}
            title="Primary key"
            className="w-4 h-4 mx-auto block cursor-pointer accent-[#4f46e5]"
          />
          <button
            onClick={() => removeField(i)}
            title="Remove field"
            className="border-none bg-transparent text-slate-300 cursor-pointer text-[15px] p-0 hover:text-[#ef4444] flex items-center justify-center"
          >
            ×
          </button>
        </div>
      ))}

      {/* Add field */}
      <button
        onClick={addField}
        className="w-full border-none bg-white px-2 py-[8px] text-[12.5px] font-semibold text-[#4f46e5] cursor-pointer hover:bg-[#f8fafc] transition-colors"
      >
        + Add field
      </button>
    </div>
  );
}
