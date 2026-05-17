"use client"

import { useState, useTransition } from "react"
import { saveCycle, setActiveCycle } from "./actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Pencil } from "lucide-react"

interface Cycle {
  id: string; fyLabel: string; isActive: boolean
  phase1Open: string; phase1Close: string
  q1Open: string; q1Close: string
  q2Open: string; q2Close: string
  q3Open: string; q3Close: string
  q4Open: string; q4Close: string
}

const BLANK: Omit<Cycle, "id" | "isActive"> = {
  fyLabel: "", phase1Open: "", phase1Close: "",
  q1Open: "", q1Close: "", q2Open: "", q2Close: "",
  q3Open: "", q3Close: "", q4Open: "", q4Close: "",
}

function DateField({ label, name, value, onChange }: {
  label: string; name: string; value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function CycleForm({ cycle, onSave }: { cycle?: Cycle; onSave: () => void }) {
  const [form, setForm] = useState<Omit<Cycle, "id" | "isActive">>(
    cycle ? { ...cycle } : { ...BLANK }
  )
  const [isPending, startTransition] = useTransition()

  function set(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await saveCycle({ id: cycle?.id, ...form })
      if (result.success) {
        toast.success(cycle ? "Cycle updated" : "Cycle created")
        onSave()
      }
    })
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1">
        <label className="text-sm font-medium">Cycle label</label>
        <Input placeholder="e.g. FY26" value={form.fyLabel} onChange={(e) => set("fyLabel", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DateField label="Phase 1 opens" name="phase1Open" value={form.phase1Open} onChange={(v) => set("phase1Open", v)} />
        <DateField label="Phase 1 closes" name="phase1Close" value={form.phase1Close} onChange={(v) => set("phase1Close", v)} />
      </div>

      {(["q1", "q2", "q3", "q4"] as const).map((q) => (
        <div key={q} className="grid grid-cols-2 gap-3">
          <DateField label={`${q.toUpperCase()} opens`} name={`${q}Open`} value={form[`${q}Open`]} onChange={(v) => set(`${q}Open`, v)} />
          <DateField label={`${q.toUpperCase()} closes`} name={`${q}Close`} value={form[`${q}Close`]} onChange={(v) => set(`${q}Close`, v)} />
        </div>
      ))}

      <Button onClick={handleSubmit} disabled={isPending || !form.fyLabel}>
        {isPending ? "Saving…" : cycle ? "Update cycle" : "Create cycle"}
      </Button>
    </div>
  )
}

export function CyclesClient({ cycles }: { cycles: Cycle[] }) {
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [isActivating, startActivateTransition] = useTransition()

  function handleActivate(id: string) {
    startActivateTransition(async () => {
      await setActiveCycle(id)
      toast.success("Active cycle updated")
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cycles</h1>
          <p className="text-muted-foreground text-sm">Manage performance cycles and check-in windows.</p>
        </div>
        <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditingCycle(null) }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" onClick={() => setEditingCycle(null)}>
              <Plus className="size-3.5" /> New cycle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCycle ? "Edit cycle" : "New cycle"}</DialogTitle>
            </DialogHeader>
            <CycleForm cycle={editingCycle ?? undefined} onSave={() => setFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {cycles.length === 0 ? (
        <p className="text-muted-foreground">No cycles. Create one to get started.</p>
      ) : (
        <div className="space-y-3">
          {cycles.map((c) => (
            <Card key={c.id} className={c.isActive ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {c.fyLabel}
                    {c.isActive && <Badge variant="default">Active</Badge>}
                  </CardTitle>
                  <div className="flex gap-2">
                    {!c.isActive && (
                      <Button size="sm" variant="outline" disabled={isActivating}
                        onClick={() => handleActivate(c.id)}>
                        Set active
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="size-8"
                      onClick={() => { setEditingCycle(c); setFormOpen(true) }}>
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                  {(["q1", "q2", "q3", "q4"] as const).map((q) => (
                    <div key={q}>
                      <span className="font-medium text-foreground">{q.toUpperCase()}: </span>
                      {c[`${q}Open`]} → {c[`${q}Close`]}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
