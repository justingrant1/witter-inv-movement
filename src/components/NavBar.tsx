"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "./UserProvider";

const links = [
  { href: "/", label: "Move" },
  { href: "/checkin", label: "Check-in" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/safes", label: "Safes" },
  { href: "/shows", label: "Shows" },
  { href: "/returns", label: "Returns" },
  { href: "/log", label: "Log" },
];

export function NavBar() {
  const pathname = usePathname();
  const { user, setUser } = useUser();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold text-emerald-400">Witter</span>
          <span className="text-sm text-slate-400">Inventory Movement</span>
        </Link>
        {user && (
          <button
            onClick={() => setUser(null)}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            {user.name} · switch
          </button>
        )}
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 pb-2">
        {links.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
