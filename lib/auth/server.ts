import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function createClient(): Promise<any> {
  const session = await getServerSession(authOptions);

  return {
    auth: {
      getUser: async () => {
        if (!session?.user) return { data: { user: null }, error: new Error("Unauthorized") };
        return { data: { user: { id: (session.user as any).id } }, error: null };
      },
      getSession: async () => {
        if (!session) return { data: { session: null }, error: new Error("Unauthorized") };
        return { data: { session: { user: { id: (session.user as any).id } } }, error: null };
      },
      signOut: async () => {
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

export function createAdminClient(): any {
  return {
    auth: {
      admin: {
        updateUserById: async (id: string, attributes: any) => {
          return { data: { user: { id } }, error: null };
        },
        createUser: async (attributes: any) => {
          return { data: { user: { id: "mock-cognito-id" } }, error: null };
        },
        deleteUser: async (id: string) => {
          return { data: null, error: null };
        },
        listUsers: async () => {
          return { data: { users: [] }, error: null };
        },
        getUserById: async (id: string) => {
          return { data: { user: { id } }, error: null };
        }
      },
      signInWithPassword: async (credentials: any) => {
        return { data: { session: null }, error: null };
      }
    },
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: async (path: string, expiresIn: number) => {
          return { data: { signedUrl: "mock-url" }, error: null };
        }
      })
    }
  };
}
