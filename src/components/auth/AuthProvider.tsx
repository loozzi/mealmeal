"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getFirebase } from "@/lib/firebase";

/** `undefined` until Firebase has reported the sign-in state once. */
const AuthContext = createContext<{ user: User | null | undefined }>({ user: undefined });

export function useAuth(): { user: User | null | undefined } {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  // Firebase runs only in the browser, so it is first touched here, never during server render.
  useEffect(() => onAuthStateChanged(getFirebase().auth, setUser), []);

  return <AuthContext value={{ user }}>{children}</AuthContext>;
}
