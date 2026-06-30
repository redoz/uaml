import { ChevronRight } from "lucide-react";

export interface EnableControlProps {
  /** True when a Supabase account is active (accountEmail is set). */
  signedIn: boolean;
  /** Current model name — shown as subtext when signed in, truncated. */
  modelName?: string;
  onClick(): void;
}

/**
 * Top-bar "Enable / Enabled" button.
 *
 * Unsigned-out: gray dot · "Enable" · "History, Saves and more"
 * Signed-in:    green dot · "Enabled" · <modelName truncated>
 */
export function EnableControl({ signedIn, modelName, onClick }: EnableControlProps) {
  const label = signedIn ? "Enabled" : "Enable";
  const subtext = signedIn && modelName ? modelName : "History, Saves and more";

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={signedIn ? `Account — ${modelName ?? ""}` : "Enable saves and version history"}
      className="flex items-center gap-[7px] max-w-[230px] rounded-lg border border-[#d8dee8] bg-white px-[10px] py-[6px] cursor-pointer hover:bg-[#f1f3f7]"
    >
      {/* Status dot: gray when signed-out, green when signed-in */}
      <span
        className={`h-[8px] w-[8px] flex-shrink-0 rounded-full ${
          signedIn ? "bg-[#10b981]" : "bg-slate-400"
        }`}
      />
      {/* Label + subtext stack */}
      <span className="flex min-w-0 flex-col items-start">
        <span className="text-[13px] font-[550] leading-tight text-slate-900">{label}</span>
        <span className="w-full truncate text-[11px] leading-tight text-slate-400">{subtext}</span>
      </span>
      <ChevronRight size={14} className="flex-shrink-0 text-slate-400" />
    </button>
  );
}
