"use server"

import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { users, departments } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { listGraphUsers, getGraphManager, getGroupMembers } from "@/lib/graph/client"

export interface SyncResult {
  synced: number
  roleUpdates: number
  errors: string[]
}

export async function syncFromGraph(groupMappings: {
  adminGroupId: string
  managerGroupId: string
}): Promise<{ result?: SyncResult; error?: string }> {
  await requireRole("admin")

  if (!process.env.AZURE_AD_CLIENT_ID) {
    return { error: "Entra ID not configured — set AZURE_AD_CLIENT_ID/SECRET/TENANT_ID" }
  }

  const errors: string[] = []
  let synced = 0
  let roleUpdates = 0

  const graphUsers = await listGraphUsers()
  if (!graphUsers.length) {
    return { error: "No users returned from Graph — check app permissions (User.Read.All)" }
  }

  // Resolve group memberships
  const adminIds = groupMappings.adminGroupId
    ? await getGroupMembers(groupMappings.adminGroupId)
    : []
  const managerIds = groupMappings.managerGroupId
    ? await getGroupMembers(groupMappings.managerGroupId)
    : []

  const adminSet = new Set(adminIds)
  const managerSet = new Set(managerIds)

  // Get or create departments
  const deptCache: Record<string, string> = {}
  async function getOrCreateDept(name: string): Promise<string> {
    if (deptCache[name]) return deptCache[name]
    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.name, name))
    if (existing) {
      deptCache[name] = existing.id
      return existing.id
    }
    const [created] = await db
      .insert(departments)
      .values({ name })
      .returning()
    deptCache[name] = created.id
    return created.id
  }

  // Build a map of entraOid → our user id for manager resolution
  const oidToUser: Record<string, { id: string }> = {}

  for (const gu of graphUsers) {
    const email = gu.mail ?? gu.userPrincipalName
    if (!email) continue

    const role = adminSet.has(gu.id) ? "admin" : managerSet.has(gu.id) ? "manager" : "employee"
    const departmentId = gu.department ? await getOrCreateDept(gu.department) : null

    try {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))

      if (existing) {
        const roleChanged = existing.role !== role
        await db
          .update(users)
          .set({
            name: gu.displayName,
            entraOid: gu.id,
            departmentId,
            ...(roleChanged && { role }),
          })
          .where(eq(users.id, existing.id))
        oidToUser[gu.id] = { id: existing.id }
        if (roleChanged) roleUpdates++
      } else {
        const [created] = await db
          .insert(users)
          .values({ email, name: gu.displayName, entraOid: gu.id, role, departmentId })
          .returning()
        oidToUser[gu.id] = { id: created.id }
      }
      synced++
    } catch (e) {
      errors.push(`${email}: ${String(e)}`)
    }
  }

  // Second pass: resolve managers
  for (const gu of graphUsers) {
    const ourUser = oidToUser[gu.id]
    if (!ourUser) continue

    try {
      const mgr = await getGraphManager(gu.id)
      if (mgr && oidToUser[mgr.id]) {
        await db
          .update(users)
          .set({ managerId: oidToUser[mgr.id].id })
          .where(eq(users.id, ourUser.id))
      }
    } catch {
      // Manager resolution failure is non-fatal
    }
  }

  return { result: { synced, roleUpdates, errors } }
}
