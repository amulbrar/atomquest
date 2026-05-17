"use client"

import { useState, useTransition } from "react"
import { approveGoalSheet, returnGoalSheet, managerEditGoal } from "../actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, RotateCcw, Pencil, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface GoalRow {
  id: string
  thrustAreaId: string
  title: string
  description: string | null
  uomType: "numeric" | "percent" | "timeline" | "zero"
  uomDirection: "min" | "max" | "na"
  targetValue: string | null
  targetDate: string | null
  weightage: number
  lockedFields: string[]
  sourceGoalId: string | null
}

interface ThrustArea { id: string; name: string }

interface Props {
  emp: { id: string; name: string; email: string }
  sheet: { id: string; status: string; returnComment?: string | null; submittedAt?: Date | null } | null
  goals: GoalRow[]
  thrustAreas: ThrustArea[]
  cycleLabel: string
}

const UOM_LABEL: Record<string, string> = {
  numeric: "Numeric",
  percent: "Percentage (%)",
  timeline: "Timeline",
  zero: "Zero-based",
}

export function TeamMemberReviewClient({ emp, sheet, goals, thrustAreas, cycleLabel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnComment, setReturnComment] = useState("")
  const [editingGoal, setEditingGoal] = useState<GoalRow | null>(null)
  const [editValues, setEditValues] = useState<{ targetValue?: string; targetDate?: string; weightage?: number }>({})

  function handleApprove() {
    if (!sheet) return
    startTransition(async () => {
      const result = await approveGoalSheet(sheet.id)
      if (result.error) toast.error(result.error)
      else toast.success("Goals approved and locked!")
    })
  }

  function handleReturn() {
    if (!sheet) return
    startTransition(async () => {
      const result = await returnGoalSheet(sheet.id, returnComment)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Sheet returned for revision")
        setReturnOpen(false)
        setReturnComment("")
      }
    })
  }

  function openEdit(goal: GoalRow) {
    setEditingGoal(goal)
    setEditValues({
      targetValue: goal.targetValue ?? "",
      targetDate: goal.targetDate ?? "",
      weightage: goal.weightage,
    })
  }

  function handleSaveEdit() {
    if (!editingGoal) return
    startTransition(async () => {
      const result = await managerEditGoal(editingGoal.id, editValues)
      if (result.error) toast.error(result.error)
      else {
        toast.success("Goal updated")
        setEditingGoal(null)
      }
    })
  }

  const totalWeightage = goals.reduce((acc, g) => acc + g.weightage, 0)
  const isSubmitted = sheet?.status === "submitted"
  const isLocked = sheet?.status === "locked"

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/team"><ArrowLeft className="size-4 mr-1" />Team</Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div>
          <h1 className="text-xl font-bold">{emp.name}</h1>
          <p className="text-sm text-muted-foreground">{emp.email} · {cycleLabel}</p>
        </div>
        {sheet && (
          <Badge
            variant={
              sheet.status === "submitted" ? "outline" :
              sheet.status === "locked" ? "default" :
              sheet.status === "reopened" ? "destructive" : "secondary"
            }
            className="ml-auto"
          >
            {sheet.status === "submitted" ? "Awaiting Approval" :
             sheet.status === "locked" ? "Approved & Locked" :
             sheet.status === "reopened" ? "Returned for Revision" :
             sheet.status}
          </Badge>
        )}
      </div>

      {!sheet && (
        <p className="text-muted-foreground">No goal sheet submitted for {cycleLabel}.</p>
      )}

      {sheet && (
        <>
          {/* Weightage summary */}
          <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-lg text-sm">
            <span className="text-muted-foreground">{goals.length} goals</span>
            <span className={totalWeightage === 100 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
              {totalWeightage}% total weightage
            </span>
            {sheet.submittedAt && (
              <span className="text-muted-foreground ml-auto">
                Submitted {new Date(sheet.submittedAt).toLocaleDateString("en-IN")}
              </span>
            )}
          </div>

          {/* Goals list */}
          <div className="space-y-3">
            {goals.map((goal) => {
              const ta = thrustAreas.find((t) => t.id === goal.thrustAreaId)
              return (
                <Card key={goal.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base">{goal.title}</CardTitle>
                        {ta && <CardDescription className="text-xs">{ta.name}</CardDescription>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="font-mono">{goal.weightage}%</Badge>
                        {goal.sourceGoalId && <Badge variant="outline" className="text-xs">Shared</Badge>}
                        {isSubmitted && (
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(goal)}>
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-4 text-sm flex-wrap">
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">UoM:</span>{" "}
                        {UOM_LABEL[goal.uomType]}
                        {goal.uomDirection === "min" && " · ↑ Higher is better"}
                        {goal.uomDirection === "max" && " · ↓ Lower is better"}
                      </span>
                      {goal.targetValue !== null && (
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">Target:</span>{" "}
                          {goal.targetValue}{goal.uomType === "percent" ? "%" : ""}
                        </span>
                      )}
                      {goal.targetDate && (
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">Deadline:</span>{" "}
                          {new Date(goal.targetDate).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Approval actions */}
          {isSubmitted && (
            <div className="flex gap-3 pt-2 flex-wrap">
              <Button
                onClick={handleApprove}
                disabled={isPending || totalWeightage !== 100}
                className="gap-2"
              >
                <CheckCircle2 className="size-4" />
                Approve &amp; Lock
              </Button>
              <Button
                variant="outline"
                onClick={() => setReturnOpen(true)}
                disabled={isPending}
                className="gap-2"
              >
                <RotateCcw className="size-4" />
                Return for Revision
              </Button>
              {totalWeightage !== 100 && (
                <p className="text-sm text-destructive self-center">
                  Cannot approve: total weightage is {totalWeightage}% (must be 100%)
                </p>
              )}
            </div>
          )}

          {isLocked && (
            <p className="text-sm text-muted-foreground border rounded-md p-3">
              These goals are locked. Any changes after this point are tracked in the audit log.
              Contact admin to unlock.
            </p>
          )}
        </>
      )}

      {/* Return for revision dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return goals for revision</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Provide feedback so {emp.name} knows what to change.
            </p>
            <Textarea
              placeholder="e.g. Please increase the weightage on the revenue goal and clarify the Q3 target."
              rows={4}
              value={returnComment}
              onChange={(e) => setReturnComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReturn}
              disabled={isPending || !returnComment.trim()}
            >
              Return sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline edit dialog */}
      <Dialog open={!!editingGoal} onOpenChange={(o) => !o && setEditingGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit goal (manager)</DialogTitle>
          </DialogHeader>
          {editingGoal && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>{editingGoal.title}</strong> — you can adjust target and weightage.
              </p>
              {editingGoal.uomType !== "zero" && editingGoal.uomType !== "timeline" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Target Value{editingGoal.uomType === "percent" ? " (%)" : ""}
                  </label>
                  <Input
                    type="number"
                    value={editValues.targetValue ?? ""}
                    onChange={(e) => setEditValues((v) => ({ ...v, targetValue: e.target.value }))}
                  />
                </div>
              )}
              {editingGoal.uomType === "timeline" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Target Date</label>
                  <Input
                    type="date"
                    value={editValues.targetDate ?? ""}
                    onChange={(e) => setEditValues((v) => ({ ...v, targetDate: e.target.value }))}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Weightage (%)</label>
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={editValues.weightage ?? ""}
                  onChange={(e) => setEditValues((v) => ({ ...v, weightage: Number(e.target.value) }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGoal(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isPending}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
