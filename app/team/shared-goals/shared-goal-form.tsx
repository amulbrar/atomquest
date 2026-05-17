"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { pushSharedGoal } from "./actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"

interface Report { id: string; name: string; email: string }
interface ThrustArea { id: string; name: string }

interface Props {
  reports: Report[]
  thrustAreas: ThrustArea[]
}

const UOM_DIRECTION_OPTIONS = {
  numeric: [
    { value: "min", label: "↑ Higher is better (e.g. Revenue)" },
    { value: "max", label: "↓ Lower is better (e.g. TAT)" },
  ],
  percent: [
    { value: "min", label: "↑ Higher % is better" },
    { value: "max", label: "↓ Lower % is better" },
  ],
  timeline: [{ value: "na", label: "Date-based completion" }],
  zero: [{ value: "na", label: "Zero = Success" }],
}

export function SharedGoalForm({ reports, thrustAreas }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [form, setForm] = useState({
    title: "",
    description: "",
    thrustAreaId: "",
    uomType: "numeric" as "numeric" | "percent" | "timeline" | "zero",
    uomDirection: "min" as "min" | "max" | "na",
    targetValue: "",
    targetDate: "",
    weightage: 10,
  })

  function toggleRecipient(id: string) {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  function handleUomTypeChange(v: typeof form.uomType) {
    setForm((f) => ({
      ...f,
      uomType: v,
      uomDirection: v === "timeline" || v === "zero" ? "na" : "min",
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRecipients.length) {
      toast.error("Select at least one recipient")
      return
    }
    startTransition(async () => {
      const result = await pushSharedGoal({
        ...form,
        recipientIds: selectedRecipients,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Shared goal pushed to ${result.count} team member${result.count !== 1 ? "s" : ""}`)
        router.push("/team")
      }
    })
  }

  const directions = UOM_DIRECTION_OPTIONS[form.uomType] ?? []

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Goal details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="thrustArea">Thrust Area</Label>
            <Select
              value={form.thrustAreaId}
              onValueChange={(v) => setForm((f) => ({ ...f, thrustAreaId: v }))}
            >
              <SelectTrigger id="thrustArea">
                <SelectValue placeholder="Select thrust area" />
              </SelectTrigger>
              <SelectContent>
                {thrustAreas.map((ta) => (
                  <SelectItem key={ta.id} value={ta.id}>{ta.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Goal Title (read-only for recipients)</Label>
            <Input
              id="title"
              placeholder="e.g. Reduce support TAT below 8 hours"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              id="desc"
              rows={2}
              placeholder="Additional context…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>UoM Type</Label>
              <Select
                value={form.uomType}
                onValueChange={(v) => handleUomTypeChange(v as typeof form.uomType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numeric">Numeric</SelectItem>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                  <SelectItem value="timeline">Timeline</SelectItem>
                  <SelectItem value="zero">Zero-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select
                value={form.uomDirection}
                onValueChange={(v) => setForm((f) => ({ ...f, uomDirection: v as typeof form.uomDirection }))}
                disabled={form.uomType === "timeline" || form.uomType === "zero"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {directions.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.uomType === "timeline" ? (
            <div className="space-y-1.5">
              <Label>Target Date (read-only for recipients)</Label>
              <Input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                required
              />
            </div>
          ) : form.uomType !== "zero" ? (
            <div className="space-y-1.5">
              <Label>Target Value (read-only for recipients)</Label>
              <Input
                type="number"
                placeholder="e.g. 8"
                value={form.targetValue}
                onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
                required
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">
              Zero-based: success = 0 occurrences
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="weightage">Default Weightage (%) — recipients can adjust</Label>
            <Input
              id="weightage"
              type="number"
              min={10}
              max={100}
              step={5}
              value={form.weightage}
              onChange={(e) => setForm((f) => ({ ...f, weightage: Number(e.target.value) }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4" />
            Select Recipients
            {selectedRecipients.length > 0 && (
              <Badge variant="secondary">{selectedRecipients.length} selected</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No direct reports.</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                <Checkbox
                  id={`rec-${r.id}`}
                  checked={selectedRecipients.includes(r.id)}
                  onCheckedChange={() => toggleRecipient(r.id)}
                />
                <label htmlFor={`rec-${r.id}`} className="flex flex-col cursor-pointer flex-1">
                  <span className="text-sm font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.email}</span>
                </label>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending || !selectedRecipients.length || !form.title.trim()}>
          {isPending ? "Pushing…" : `Push to ${selectedRecipients.length || 0} member${selectedRecipients.length !== 1 ? "s" : ""}`}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
