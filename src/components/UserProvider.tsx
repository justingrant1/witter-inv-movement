"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Person } from "@/lib/types";

/**
 * Lightweight "who's operating" context. This is NOT security — it's an
 * accountability stamp so every movement records who did it. Staff pick their
 * name once on the device and it sticks in localStorage.
 */
interface UserContextValue {
  user: Person | null;
  setUser: (p: Person | null) => void;
  ready: boolean;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  setUser: () => {},
  ready: false,
});

const KEY = "wcm.currentUser";

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Person | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUserState(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setUser = (p: Person | null) => {
    setUserState(p);
    try {
      if (p) localStorage.setItem(KEY, JSON.stringify(p));
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, ready }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
