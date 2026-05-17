"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { sendTeamsCard } from "@/lib/notify/teams"

export async function saveNotificationSettings(data: {
  teamsWebhookUrl: string
  emailNotifications: boolean
  teamsNotifications: boolean
}) {
  const session = await requireRole("employee", "manager", "admin")

  await db
    .update(users)
    .set({
      teamsWebhookUrl: data.teamsWebhookUrl.trim() || null,
      emailNotifications: data.emailNotifications,
      teamsNotifications: data.teamsNotifications,
    })
    .where(eq(users.id, session.user.id))

  revalidatePath("/settings")
  return { success: true }
}

export async function sendTestTeamsCard(webhookUrl: string) {
  if (!webhookUrl.trim()) return { error: "Enter a webhook URL first" }

  const ok = await sendTeamsCard(webhookUrl, {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.5",
          body: [
            { type: "TextBlock", text: "AtomQuest Portal", weight: "Bolder", size: "Medium" },
            { type: "TextBlock", text: "Teams notifications are working correctly.", wrap: true },
          ],
        },
      },
    ],
  })

  return ok ? { success: true } : { error: "Failed to deliver card — check the webhook URL" }
}
