import { auth } from "./config"
import { redirect } from "next/navigation"

export type Role = "employee" | "manager" | "admin"

export async function getSession() {
  return auth()
}

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  return session
}

export async function requireRole(...roles: Role[]) {
  const session = await requireAuth()
  if (!roles.includes(session.user.role as Role)) {
    redirect("/unauthorized")
  }
  return session
}

export async function requireManager() {
  return requireRole("manager", "admin")
}

export async function requireAdmin() {
  return requireRole("admin")
}
