"use client"

import { useState, useTransition } from "react"
import { syncFromGraph } from "./actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react"

export default function SSOPage() {
  const [adminGroupId, setAdminGroupId] = useState("")
  const [managerGroupId, setManagerGroupId] = useState("")
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{
    synced?: number; roleUpdates?: number; errors?: string[]
  } | null>(null)

  const entraConfigured = typeof window !== "undefined" &&
    document.cookie.includes("__Secure") // proxy: if app loaded it's fine; real check is server-side

  function handleSync() {
    startTransition(async () => {
      const res = await syncFromGraph({ adminGroupId, managerGroupId })
      if (res.error) {
        toast.error(res.error)
      } else if (res.result) {
        setResult(res.result)
        toast.success(`Synced ${res.result.synced} users from Entra ID`)
      }
    })
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Entra ID / SSO</h1>
        <p className="text-muted-foreground text-sm">
          Sync users, managers, departments, and roles from Microsoft Graph.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="size-4" />
            Graph Sync
          </CardTitle>
          <CardDescription>
            Pulls all users, resolves manager chains, assigns roles by group membership.
            Requires <code className="text-xs bg-muted px-1 rounded">User.Read.All</code> and{" "}
            <code className="text-xs bg-muted px-1 rounded">GroupMember.Read.All</code> app permissions in Azure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Admin group ID <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              placeholder="Azure AD group object ID for admins"
              value={adminGroupId}
              onChange={(e) => setAdminGroupId(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Manager group ID <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              placeholder="Azure AD group object ID for managers"
              value={managerGroupId}
              onChange={(e) => setManagerGroupId(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded text-sm">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
            <p className="text-muted-foreground">
              Sync is additive — existing users are updated, missing users are created.
              Passwords are not touched. Credentials login still works post-sync.
            </p>
          </div>

          <Button onClick={handleSync} disabled={isPending} className="gap-1.5">
            <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Syncing…" : "Sync from Graph"}
          </Button>

          {result && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-600" />
                <span className="text-sm font-medium">Sync complete</span>
              </div>
              <div className="flex gap-3 text-sm">
                <Badge variant="secondary">{result.synced} users synced</Badge>
                {result.roleUpdates !== undefined && result.roleUpdates > 0 && (
                  <Badge variant="outline">{result.roleUpdates} role updates</Badge>
                )}
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-destructive">Errors:</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-destructive font-mono">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p><strong>1.</strong> Azure Portal → App registrations → New registration</p>
          <p><strong>2.</strong> Redirect URI: <code className="bg-muted px-1 rounded text-xs">{"{your-domain}"}/api/auth/callback/microsoft-entra-id</code></p>
          <p><strong>3.</strong> API permissions → Add <code className="bg-muted px-1 rounded text-xs">User.Read.All</code> and <code className="bg-muted px-1 rounded text-xs">GroupMember.Read.All</code> → Grant admin consent</p>
          <p><strong>4.</strong> Certificates &amp; secrets → New client secret → copy to <code className="bg-muted px-1 rounded text-xs">AZURE_AD_CLIENT_SECRET</code></p>
          <p><strong>5.</strong> Set <code className="bg-muted px-1 rounded text-xs">AZURE_AD_CLIENT_ID</code> and <code className="bg-muted px-1 rounded text-xs">AZURE_AD_TENANT_ID</code> in your deployment env</p>
        </CardContent>
      </Card>
    </div>
  )
}
