import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ModelNode } from "@mc/okf";
import { DataMartIcon } from "../../lib/icons";

const SOURCE_COLOR: Record<string, string> = {
  SQL: "#10b981",
  CONNECTOR: "#f59e0b",
  VIEW: "#3b82f6",
  TABLE: "#8b5cf6",
};

const STATUS_TIP: Record<string, string> = {
  created: "Created in OWOX",
  pending: "Draft — not pushed yet",
  creating: "Creating in OWOX…",
  error: "Error — check details",
};

export type MartNodeData = ModelNode;

function StatusDot({ status }: { status: string }) {
  const base = "absolute top-[10px] right-[10px] w-[9px] h-[9px] rounded-full z-10";
  const colors: Record<string, string> = {
    created: "bg-[#10b981]",
    pending: "bg-slate-300",
    creating: "bg-[#4f46e5] animate-pulse",
    error: "bg-[#ef4444]",
  };
  return (
    <span
      className={`${base} ${colors[status] ?? "bg-slate-300"}`}
      title={STATUS_TIP[status] ?? status}
    />
  );
}

function MartNodeInner({ data }: NodeProps) {
  const node = data as unknown as MartNodeData;
  const color = SOURCE_COLOR[node.inputSource] ?? "#94a3b8";
  const label = node.inputSource;
  const fieldCount = node.schema?.length ?? 0;
  const fieldText = fieldCount > 0 ? `${fieldCount} field${fieldCount > 1 ? "s" : ""}` : "no fields";

  return (
    <div
      className="relative bg-white border-[1.5px] border-[#d8dee8] rounded-xl shadow-[0_2px_8px_rgba(15,23,42,0.05)] w-[200px] cursor-grab hover:border-[#c2cad8] select-none"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif" }}
    >
      <StatusDot status={node.status} />

      {/* Top section: color bar + title */}
      <div className="flex items-center gap-2 px-3 pt-[11px] pb-2">
        <span
          className="w-1 self-stretch min-h-[18px] rounded-sm flex-shrink-0"
          style={{ background: color }}
        />
        <DataMartIcon size={15} className="text-slate-400 flex-shrink-0" />
        <span className="text-[13.5px] font-semibold flex-1 leading-tight pr-3 text-slate-900 line-clamp-2">
          {node.title}
        </span>
      </div>

      {/* Meta: type chip + field count */}
      <div className="flex items-center gap-2 px-3 pb-[10px]">
        <span
          className="text-[10.5px] font-[650] uppercase tracking-[0.3px] px-[7px] py-[2px] rounded-full text-white"
          style={{ background: color }}
        >
          {label}
        </span>
        <span className="text-[11px] text-slate-500">{fieldText}</span>
      </div>

      {/* React Flow Handles */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{
          width: 13, height: 13, borderRadius: "50%",
          background: "#fff", border: "2px solid #4f46e5",
          left: -7, top: 24,
          opacity: 0, transition: "opacity 0.12s",
        }}
        className="mart-handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          width: 13, height: 13, borderRadius: "50%",
          background: "#fff", border: "2px solid #4f46e5",
          right: -7, top: 24,
          opacity: 0, transition: "opacity 0.12s",
        }}
        className="mart-handle"
      />
    </div>
  );
}

export const MartNode = memo(MartNodeInner);
