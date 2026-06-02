export function money(n?: number): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function when(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Maps a Game status to a color band for chips/badges.
export function statusColor(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("transit")) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  if (s.includes("checked")) return "bg-sky-500/20 text-sky-300 border-sky-500/40";
  if (s.includes("staged")) return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
  if (s.includes("ready")) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (s.includes("live")) return "bg-pink-500/20 text-pink-300 border-pink-500/40";
  if (s.includes("completed")) return "bg-teal-500/20 text-teal-300 border-teal-500/40";
  if (s.includes("booking")) return "bg-violet-500/20 text-violet-300 border-violet-500/40";
  if (s.includes("shipping") || s.includes("shipped"))
    return "bg-blue-500/20 text-blue-300 border-blue-500/40";
  if (s.includes("returned")) return "bg-orange-500/20 text-orange-300 border-orange-500/40";
  if (s.includes("hq") || s.includes("lombard"))
    return "bg-slate-500/20 text-slate-300 border-slate-500/40";
  return "bg-slate-600/20 text-slate-300 border-slate-600/40";
}
