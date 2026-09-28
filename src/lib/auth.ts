import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Skander Staff Credentials",
      credentials: {
        username: { label: "Username / Mobile", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Demo shop credentials (username or email)
        const u = credentials.username.toLowerCase().trim();
        const p = credentials.password;

        if ((u === "admin" || u === "admin@skanderparts.pk") && p === "admin123") {
          return {
            id: "u-1",
            name: "Skander (Owner / Admin)",
            email: "admin@skanderparts.pk",
            role: "admin",
          };
        }

        if ((u === "staff" || u === "staff@skanderparts.pk") && p === "staff123") {
          return {
            id: "u-2",
            name: "Shop Assistant",
            email: "staff@skanderparts.pk",
            role: "staff",
          };
        }

        // Allow owner Sohail login as well
        if ((u === "sohail" || u === "sohail@skanderparts.pk") && p === "sohail123") {
          return {
            id: "u-3",
            name: "Sohail Rasheed (Manager)",
            email: "sohail@skanderparts.pk",
            role: "admin",
          };
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        return baseUrl;
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "skander_spare_parts_super_secret_jwt_key_2026_xyz",
};
