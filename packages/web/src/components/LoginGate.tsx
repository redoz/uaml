import { useState } from "react";
import { useAuth } from "../lib/auth";
export function LoginGate() {
  const { connect } = useAuth();
  const [key, setKey] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit() { setBusy(true); setErr("");
    try { await connect(key.trim()); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } }
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
      <div className="w-[440px] rounded-2xl border border-[#d8dee8] bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Connect to OWOX</h1>
        <label className="mt-6 block text-xs font-semibold uppercase tracking-wide text-slate-500">API key</label>
        <input autoFocus value={key} onChange={e => setKey(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="owox_key_..." className="mt-2 w-full rounded-lg border border-[#d8dee8] px-3 py-3 text-sm outline-none focus:border-indigo-500" />
        {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
        <button disabled={busy || !key} onClick={submit}
          className="mt-4 w-full rounded-lg bg-[#1e88e5] py-3 font-semibold text-white disabled:opacity-50">{busy ? "Connecting…" : "Connect"}</button>
      </div>
    </div>
  );
}
