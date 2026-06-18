export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json", ...(opts.headers || {}) }, ...opts });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return res.status === 204 ? (undefined as T) : await res.json();
}
