"use client"

import { useState, useTransition } from "react"
import {
  saveEscalationRule,
  deleteEscalationRule,
  resolveEscalationEvent,
  triggerEscalationsNow,
} from "./actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, Trash2, Play, CheckCircle2 } from "lucide-react"

interface Rule {
  id: string
  name: string
  trigger: "no_submit" | "no_approve" | "no_checkin"
  thresholdDays: number
  chain: string[]
  enabled: boolean
}

interface EscalationEvent {
  id: string
  ruleId: string
  ruleName: string
  subjectName: string
  targetName: string
  triggeredAt: string
  resolvedAt: string | null
  status: string
}

const TRIGGER_LABELS: Record<string, string> = {
  no_submit: "No submission",
  no_approve: "No approval",
  no_checkin: "No check-in",
}

interface RuleFormProps {
  rule?: Rule
  onSave: () => void
}

function RuleForm({ rule, onSave }: RuleFormProps) {
  const [name, setName] = useState(rule?.name ?? "")
  const [trigger, setTrigger] = useState<Rule["trigger"]>(rule?.trigger ?? "no_submit")
  const [days, setDays] = useState(String(rule?.thresholdDays ?? 7))
  const [enabled, setEnabled] = useState(rule?.enabled ?? true)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!name.trim() || !days) return
    startTransition(async () => {
      const result = await saveEscalationRule({
        id: rule?.id,
        name: name.trim(),
        trigger,
        thresholdDays: Number(days),
        chain: [],
        enabled,
      })
      if (result.success) {
        toast.success(rule ? "Rule updated" : "Rule created")
        onSave()
      }
    })
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Goals not submitted" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Trigger</label>
        <Select value={trigger} onValueChange={(v) => setTrigger(v as Rule["trigger"])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="no_submit">No submission (days since cycle open)</SelectItem>
            <SelectItem value="no_approve">No approval (days since submission)</SelectItem>
            <SelectItem value="no_checkin">No check-in (days into window)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Threshold (days)</label>
        <Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <Switch id="enabled-toggle" checked={enabled} onCheckedChange={setEnabled} />
        <label htmlFor="enabled-toggle" className="text-sm">{enabled ? "Enabled" : "Disabled"}</label>
      </div>
      <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
        {isPending ? "Saving…" : rule ? "Update rule" : "Create rule"}
      </Button>
    </div>
  )
}

export function EscalationsClient({ rules, events }: { rules: Rule[]; events: EscalationEvent[] }) {
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [isRunning, startRunTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isResolving, startResolveTransition] = useTransition()

  function handleDelete(id: string) {
    startDeleteTransition(async () => {
      await deleteEscalationRule(id)
      toast.success("Rule deleted")
    })
  }

  function handleResolve(eventId: string) {
    startResolveTransition(async () => {
      await resolveEscalationEvent(eventId)
      toast.success("Event resolved")
    })
  }

  function handleRunNow() {
    startRunTransition(async () => {
      const result = await triggerEscalationsNow()
      if ("errors" in result && result.errors?.length) {
        toast.error(`${result.fired} fired, ${result.errors.length} errors`)
      } else {
        toast.success(`Escalation run complete — ${result.fired} events fired`)
      }
    })
  }

  const openEvents = events.filter((e) => e.status === "open")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Escalations</h1>
          <p className="text-muted-foreground text-sm">
            {rules.filter((r) => r.enabled).length} active rules · {openEvents.length} open events
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleRunNow} disabled={isRunning} className="gap-1.5">
            <Play className="size-3.5" />
            {isRunning ? "Running…" : "Run now"}
          </Button>
          <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditingRule(null) }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" onClick={() => setEditingRule(null)}>
                <Plus className="size-3.5" /> New rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRule ? "Edit rule" : "New escalation rule"}</DialogTitle>
              </DialogHeader>
              <RuleForm rule={editingRule ?? undefined} onSave={() => setFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="log">
            Event log
            {openEvents.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{openEvents.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4 space-y-3">
          {rules.length === 0 ? (
            <p className="text-muted-foreground">No rules configured. Create one to start.</p>
          ) : (
            rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {rule.name}
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => { setEditingRule(rule); setFormOpen(true) }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(rule.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {TRIGGER_LABELS[rule.trigger]} · after <strong>{rule.thresholdDays}</strong> days
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Notified</TableHead>
                  <TableHead>Triggered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No escalation events yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{e.ruleName}</TableCell>
                      <TableCell className="text-sm">{e.subjectName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.targetName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(e.triggeredAt).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.status === "open" ? "destructive" : "secondary"}>
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {e.status === "open" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 h-7"
                            onClick={() => handleResolve(e.id)}
                            disabled={isResolving}
                          >
                            <CheckCircle2 className="size-3.5" />
                            Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
