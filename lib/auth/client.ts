"use client";
import { getSession, signOut } from "next-auth/react";

export function createClient(): any {
  return {
    auth: {
      getUser: async () => {
        const session = await getSession();
        if (!session?.user) return { data: { user: null }, error: new Error("Unauthorized") };
        return { data: { user: { id: (session.user as any).id } }, error: null };
      },
      getSession: async () => {
        const session = await getSession();
        if (!session) return { data: { session: null }, error: new Error("Unauthorized") };
        return { data: { session: { user: { id: (session.user as any).id } } }, error: null };
      },
      signOut: async () => {
        await signOut({ redirect: false });
        return { error: null };
      },
      signInWithPassword: async (credentials: any) => {
        return { data: { session: null }, error: null };
      },
      updateUser: async (attributes: any) => {
        return { data: { user: null }, error: null };
      }
    },
    removeChannel: (channel: any) => {}
  };
}
