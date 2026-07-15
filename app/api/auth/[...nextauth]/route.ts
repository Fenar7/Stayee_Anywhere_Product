import NextAuth, { NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID || "",
      clientSecret: process.env.COGNITO_CLIENT_SECRET || "",
      issuer: process.env.COGNITO_ISSUER || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      
      // Inject DB role into token if not present
      if (token.sub && !token.role) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { supabaseAuthId: token.sub },
            select: { role: true, passwordSetAt: true }
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.passwordSetAt = dbUser.passwordSetAt ? dbUser.passwordSetAt.toISOString() : null;
          }
        } catch (e) {
          console.error("Failed to fetch user role for JWT", e);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).passwordSetAt = token.passwordSetAt;
      }
      return session;
    },

  },
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
