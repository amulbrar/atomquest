import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { DefaultSession } from "next-auth"

// Extend next-auth session/user types
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string
      role: "employee" | "manager" | "admin"
      managerId: string | null
      departmentId: string | null
    }
  }
  interface User {
    id?: string
    role: "employee" | "manager" | "admin"
    managerId?: string | null
    departmentId?: string | null
  }
}

const entraProviders =
  process.env.AZURE_AD_CLIENT_ID &&
  process.env.AZURE_AD_CLIENT_SECRET &&
  process.env.AZURE_AD_TENANT_ID
    ? [
        MicrosoftEntraID({
          clientId: process.env.AZURE_AD_CLIENT_ID,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
          issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
        }),
      ]
    : []

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))

        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          managerId: user.managerId,
          departmentId: user.departmentId,
        }
      },
    }),
    ...entraProviders,
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.managerId = user.managerId ?? null
        token.departmentId = user.departmentId ?? null
      }

      // Entra ID first login: upsert user
      if (account?.provider === "microsoft-entra-id" && profile) {
        const entraOid = String(profile.sub ?? "")
        const email = String(profile.email ?? profile.preferred_username ?? "")
        const name = String(profile.name ?? email)

        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.entraOid, entraOid))

        let dbUser = existing
        if (!dbUser && email) {
          const [byEmail] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
          if (byEmail) {
            await db.update(users).set({ entraOid }).where(eq(users.id, byEmail.id))
            dbUser = byEmail
          }
        }
        if (!dbUser && email) {
          const [created] = await db
            .insert(users)
            .values({ email, name, entraOid, role: "employee" })
            .returning()
          dbUser = created
        }
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.managerId = dbUser.managerId
          token.departmentId = dbUser.departmentId
        }
      }

      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as "employee" | "manager" | "admin"
      session.user.managerId = (token.managerId as string | null) ?? null
      session.user.departmentId = (token.departmentId as string | null) ?? null
      return session
    },
  },
})
