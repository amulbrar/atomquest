"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { cycles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function saveCycle(data: {
  id?: string
  fyLabel: string
  phase1Open: string
  phase1Close: string
  q1Open: string; q1Close: string
  q2Open: string; q2Close: string
  q3Open: string; q3Close: string
  q4Open: string; q4Close: string
}) {
  await requireRole("admin")

  if (data.id) {
    await db.update(cycles).set({
      fyLabel: data.fyLabel,
      phase1Open: data.phase1Open,
      phase1Close: data.phase1Close,
      q1Open: data.q1Open, q1Close: data.q1Close,
      q2Open: data.q2Open, q2Close: data.q2Close,
      q3Open: data.q3Open, q3Close: data.q3Close,
      q4Open: data.q4Open, q4Close: data.q4Close,
    }).where(eq(cycles.id, data.id))
  } else {
    await db.insert(cycles).values({
      fyLabel: data.fyLabel,
      phase1Open: data.phase1Open,
      phase1Close: data.phase1Close,
      q1Open: data.q1Open, q1Close: data.q1Close,
      q2Open: data.q2Open, q2Close: data.q2Close,
      q3Open: data.q3Open, q3Close: data.q3Close,
      q4Open: data.q4Open, q4Close: data.q4Close,
    })
  }

  revalidatePath("/admin/cycles")
  return { success: true }
}

export async function setActiveCycle(cycleId: string) {
  await requireRole("admin")
  await db.update(cycles).set({ isActive: false })
  await db.update(cycles).set({ isActive: true }).where(eq(cycles.id, cycleId))
  revalidatePath("/admin/cycles")
  revalidatePath("/")
  return { success: true }
}
