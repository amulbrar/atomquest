"use client"

import { useState, useTransition } from "react"
import { saveNotificationSettings, sendTestTeamsCard } from "./actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Mail, MessageSquare } from "lucide-react"

interface Props {
  emailNotifications: boolean
  teamsNotifications: boolean
  teamsWebhookUrl: string
}

export function SettingsClient({ emailNotifications, teamsNotifications, teamsWebhookUrl }: Props) {
  const [email, setEmail] = useState(emailNotifications)
  const [teams, setTeams] = useState(teamsNotifications)
  const [webhook, setWebhook] = useState(teamsWebhookUrl)
  const [isPending, startTransition] = useTransition()
  const [isTesting, startTestTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await saveNotificationSettings({
        emailNotifications: email,
        teamsNotifications: teams,
        teamsWebhookUrl: webhook,
      })
      if (result.success) toast.success("Settings saved")
    })
  }

  function handleTest() {
    startTestTransition(async () => {
      const result = await sendTestTeamsCard(webhook)
      if (result.error) toast.error(result.error)
      else toast.success("Test card sent — check your Teams channel")
    })
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground text-sm">Control how you receive portal notifications.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4" /> Email
          </CardTitle>
          <CardDescription>Receive email notifications for goal approvals, returns, and reminders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch id="email-toggle" checked={email} onCheckedChange={setEmail} />
            <label htmlFor="email-toggle" className="text-sm cursor-pointer">
              {email ? "Email notifications on" : "Email notifications off"}
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4" /> Microsoft Teams
          </CardTitle>
          <CardDescription>
            Receive Adaptive Card notifications in a Teams channel. Create a free incoming webhook via the
            Teams <strong>Workflows</strong> app — use the{" "}
            <em>&ldquo;When a Teams webhook request is received&rdquo;</em> template.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch id="teams-toggle" checked={teams} onCheckedChange={setTeams} />
            <label htmlFor="teams-toggle" className="text-sm cursor-pointer">
              {teams ? "Teams notifications on" : "Teams notifications off"}
            </label>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Webhook URL</label>
            <Input
              placeholder="https://prod-xx.logic.azure.com/..."
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={isTesting || !webhook.trim()}
          >
            {isTesting ? "Sending…" : "Send test card"}
          </Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving…" : "Save settings"}
      </Button>
    </div>
  )
}
