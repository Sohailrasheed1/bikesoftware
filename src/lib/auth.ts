import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db, DEFAULT_SHOP_ID } from "./server/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Software Credentials",
      credentials: {
        username: { label: "Username / Mobile", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const u = credentials.username.toLowerCase().trim();
        const p = credentials.password;

        try {
          // Look up user from database
          const user = await db.getUserByUsernameOrEmail(u);

          if (!user || !user.passwordHash || typeof user.passwordHash !== "string") {
            return null;
          }

          let isMatch = false;
          try {
            isMatch = await bcrypt.compare(p, user.passwordHash);
          } catch (hashErr) {
            console.error("Password hash comparison error:", hashErr);
            return null;
          }

          if (!isMatch) {
            return null;
          }
          // If user is a shop owner or staff, verify that their shop is active & not expired
          let shopName = "Jilani Autos";
          if (user.role !== "superadmin") {
            const shopId = user.shopId || DEFAULT_SHOP_ID;
            const shop = await db.getShop(shopId);

            if (shop) {
              shopName = shop.name;
              if (shop.status === "suspended") {
                throw new Error("Aapki dukan ka account suspend kar diya gaya hai. Service provider se rabta karein.");
              }
              if (
                shop.status === "expired" ||
                (shop.subscriptionEnd && new Date(shop.subscriptionEnd).getTime() < Date.now())
              ) {
                throw new Error("Aapka software subscription cycle expire ho chuka hai. Software dobara activate karwane ke liye service provider se rabta karein.");
              }
            }
          } else {
            shopName = "Platform Super Admin";
          }

          const permissions = user.permissions || (user.role === "admin" || user.role === "superadmin" ? {
            pos: true, workshop: true, inventory: true, customers: true, bills: true, mechanics: true, suppliers: true, reports: true, viewSalesAndProfit: true
          } : {
            pos: true, workshop: true, inventory: true, customers: true, bills: true, mechanics: true, suppliers: false, reports: false, viewSalesAndProfit: false
          });

          return {
            id: user.id || (user as any)._id?.toString() || user.username,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            shopId: user.shopId || (user.role === "superadmin" ? undefined : DEFAULT_SHOP_ID),
            shopName,
            permissions,
          };
        } catch (err: any) {
          console.error("Auth authorize error:", err);
          throw new Error(err.message || "Invalid credentials");
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
        token.id = user.id;
        token.username = (user as any).username || (user as any).email?.split("@")[0];
        token.role = (user as any).role;
        token.shopId = (user as any).shopId;
        token.shopName = (user as any).shopName;
        token.permissions = (user as any).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).username = token.username || (session.user as any).email?.split("@")[0];
        (session.user as any).role = token.role || "staff";
        (session.user as any).shopId = token.shopId;
        (session.user as any).shopName = token.shopName;
        (session.user as any).permissions = token.permissions;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "skander_spare_parts_super_secret_jwt_key_2026_xyz",
};
