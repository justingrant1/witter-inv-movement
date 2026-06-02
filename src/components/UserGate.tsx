"use client";

import { ReactNode, useEffect, useState } from "react";
import { useUser } from "./UserProvider";
import { Person } from "@/lib/types";
import { Card, Spinner } from "./ui";

// Wraps the app: until a person picks their name, show a roster picker.
export function UserGate({ children }: { children: ReactNode }) {
  const { user, setUser, ready } = useUser();
  const [people, setPeople] = useState<Person[] | null>(null);

  useEffect(() => {
    if (user) return;
    fetch("/api/bootstrap", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setPeople(j.people || []))
      .catch(() => setPeople([]));
  }, [user]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (user) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-bold text-emerald-400">
        Witter Inventory Movement
      </h1>
      <p className="mb-6 text-sm text-slate-400">
        Who&apos;s operating this device? Every move you log is stamped with your
        name.
      </p>
      {!people ? (
        <Spinner label="Loading roster…" />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => setUser(p)}
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-4 text-left transition hover:border-emerald-500 hover:bg-slate-800"
            >
              <div className="font-semibold text-slate-100">{p.name}</div>
              <div className="text-xs text-slate-400">{p.role || "—"}</div>
            </button>
          ))}
          {people.length === 0 && (
            <Card className="col-span-2 text-sm text-slate-400">
              No people found. Check that the Airtable token is set and the base
              has a People table.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
