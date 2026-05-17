"use client"

import { useState, useTransition } from "react"
import { saveQuarterUpdate } from "./actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import { AlertCircle, Lock, CheckCircle2 } from "lucide-react"

interface GoalRow {
  id: string
  title: string
  description: string | null
  uomType: "numeric" | "percent" | "timeline" | "zero"
  uomDirection: "min" | "max" | "na"
  targetValue: string | null
  targetDate: string | null
  weightage: number
  thrustAreaId: string
  sourceGoalId: string | null
}

interface ExistingUpdate {
  goalId: string
  quarter: string
  actualValue: string | null
  actualDate: string | null
  status: string
  computedScore: string | null
  employeeNote: string | null
  managerComment: string | null
}

interface ThrustArea { id: string; name: string }

interface Props {
  cycleLabel: string
  activeQuarter: "q1" | "q2" | "q3" | "q4" | null
  closedWindowMsg: string | null
  sheetStatus: string | null
  goals: GoalRow[]
  thrustAreas: ThrustArea[]
  existingUpdates: ExistingUpdate[]
}

const QUARTER_LABELS: Record<string, string> = {
  q1: "Q1 (July)",
  q2: "Q2 (October)",
  q3: "Q3 (January)",
  q4: "Q4 / Annual (March–April)",
}

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "on_track", label: "On Track" },
  { value: "completed", label: "Completed" },
]

function scoreToPercent(score: string | null): number | null {
  if (!score) return null
  return Math.min(Number(score) * 100, 150)
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground"
  if (score >= 100) return "text-green-600"
  if (score >= 80) return "text-yellow-600"
  return "text-destructive"
}

export function CheckinClient({
  cycleLabel,
  activeQuarter,
  closedWindowMsg,
  sheetStatus,
  goals,
  thrustAreas,
  existingUpdates,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [localUpdates, setLocalUpdates] = useState<Record<string, Partial<ExistingUpdate>>>(() => {
    const init: Record<string, Partial<ExistingUpdate>> = {}
    for (const u of existingUpdates) {
      init[u.goalId] = {
        actualValue: u.actualValue ?? "",
        actualDate: u.actualDate ?? "",
        status: u.status,
        employeeNote: u.employeeNote ?? "",
        computedScore: u.computedScore,
        managerComment: u.managerComment,
      }
    }
    return init
  })
  const [savingGoalId, setSavingGoalId] = useState<string | null>(null)

  function handleChange(goalId: string, field: string, value: string) {
    setLocalUpdates((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], [field]: value },
    }))
  }

  function handleSave(goal: GoalRow) {
    const data = localUpdates[goal.id] ?? {}
    if (!activeQuarter) return
    setSavingGoalId(goal.id)
    startTransition(async () => {
      const result = await saveQuarterUpdate({
        goalId: goal.id,
        quarter: activeQuarter,
        actualValue: data.actualValue ?? undefined,
        actualDate: data.actualDate ?? undefined,
        status: (data.status as "not_started" | "on_track" | "completed") ?? "not_started",
        employeeNote: data.employeeNote ?? undefined,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        const pct = result.score !== null && result.score !== undefined
          ? Math.round(Number(result.score) * 100)
          : null
        toast.success(
          `Saved${pct !== null ? ` · Score: ${pct}%` : ""}`
        )
        // Update computed score in local state
        if (result.score !== null && result.score !== undefined) {
          setLocalUpdates((prev) => ({
            ...prev,
            [goal.id]: {
              ...prev[goal.id],
              computedScore: String(result.score!.toFixed(4)),
            },
          }))
        }
      }
      setSavingGoalId(null)
    })
  }

  const isEditable = !!activeQuarter && sheetStatus === "locked"

  if (sheetStatus !== "locked") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Quarterly Check-in</h1>
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <AlertCircle className="size-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Goals not yet approved</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your goal sheet must be approved by your manager before you can log quarterly achievements.
              {!sheetStatus && " No goals submitted yet."}
              {sheetStatus === "draft" && " Your goals are still in draft."}
              {sheetStatus === "submitted" && " Awaiting manager approval."}
              {sheetStatus === "reopened" && " Your sheet was returned for revision."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Quarterly Check-in</h1>
          <p className="text-muted-foreground">
            {cycleLabel}
            {activeQuarter && ` · ${QUARTER_LABELS[activeQuarter]}`}
          </p>
        </div>
        {activeQuarter && (
          <Badge variant="default">{QUARTER_LABELS[activeQuarter]} — Window Open</Badge>
        )}
        {!activeQuarter && closedWindowMsg && (
          <Badge variant="secondary">{closedWindowMsg}</Badge>
        )}
      </div>

      {!activeQuarter && (
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
          <Lock className="size-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Check-in window is closed</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {closedWindowMsg ?? "No check-in window is currently open."} Achievements below are read-only.
            </p>
          </div>
        </div>
      )}

      {goals.length === 0 && (
        <p className="text-muted-foreground">No approved goals found.</p>
      )}

      <div className="space-y-4">
        {goals.map((goal) => {
          const local = localUpdates[goal.id] ?? {}
          const scoreRaw = local.computedScore
          const scorePct = scoreToPercent(scoreRaw ?? null)
          const ta = thrustAreas.find((t) => t.id === goal.thrustAreaId)
          const isSharedRecipient = !!goal.sourceGoalId

          return (
            <Card key={goal.id} className={isSharedRecipient ? "border-dashed" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {goal.title}
                      {isSharedRecipient && (
                        <Badge variant="outline" className="text-xs">Shared — read-only actuals</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {ta?.name}
                      {goal.uomType !== "timeline" && goal.uomType !== "zero" && goal.targetValue && (
                        <> · Target: {goal.targetValue}{goal.uomType === "percent" ? "%" : ""}</>
                      )}
                      {goal.uomType === "timeline" && goal.targetDate && (
                        <> · Deadline: {new Date(goal.targetDate).toLocaleDateString("en-IN")}</>
                      )}
                      {goal.uomType === "zero" && " · Target: 0"}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="font-mono shrink-0">
                    {goal.weightage}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Score display */}
                {scorePct !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress score</span>
                      <span className={scoreColor(scorePct)}>
                        {Math.round(scorePct)}%{scorePct > 100 ? " ✨" : ""}
                      </span>
                    </div>
                    <Progress value={Math.min(scorePct, 100)} className="h-1.5" />
                  </div>
                )}

                {/* Manager comment */}
                {local.managerComment && (
                  <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-800">
                    <span className="font-medium">Manager comment: </span>
                    {local.managerComment}
                  </div>
                )}

                {/* Input fields — disabled for shared goal recipients */}
                {!isSharedRecipient && isEditable && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {goal.uomType === "timeline" ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Completion Date
                        </label>
                        <Input
                          type="date"
                          value={local.actualDate ?? ""}
                          onChange={(e) => handleChange(goal.id, "actualDate", e.target.value)}
                        />
                      </div>
                    ) : goal.uomType === "zero" ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Actual (incidents)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={local.actualValue ?? ""}
                          onChange={(e) => handleChange(goal.id, "actualValue", e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Actual Value{goal.uomType === "percent" ? " (%)" : ""}
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g. 85"
                          value={local.actualValue ?? ""}
                          onChange={(e) => handleChange(goal.id, "actualValue", e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Status</label>
                      <Select
                        value={local.status ?? "not_started"}
                        onValueChange={(v) => handleChange(goal.id, "status", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Note <span className="font-normal">(optional)</span>
                      </label>
                      <Textarea
                        rows={2}
                        placeholder="What did you accomplish this quarter?"
                        value={local.employeeNote ?? ""}
                        onChange={(e) => handleChange(goal.id, "employeeNote", e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Read-only display when window closed */}
                {(!isEditable || isSharedRecipient) && (
                  <div className="flex gap-4 text-sm flex-wrap">
                    {local.actualValue !== undefined && local.actualValue !== "" && (
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">Actual:</span> {local.actualValue}
                        {goal.uomType === "percent" ? "%" : ""}
                      </span>
                    )}
                    {local.actualDate && (
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">Completed:</span>{" "}
                        {new Date(local.actualDate).toLocaleDateString("en-IN")}
                      </span>
                    )}
                    {local.status && local.status !== "not_started" && (
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">Status:</span>{" "}
                        {STATUS_OPTIONS.find((s) => s.value === local.status)?.label}
                      </span>
                    )}
                  </div>
                )}

                {isEditable && !isSharedRecipient && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave(goal)}
                    disabled={isPending || savingGoalId === goal.id}
                    className="gap-1.5"
                  >
                    {savingGoalId === goal.id ? (
                      "Saving…"
                    ) : (
                      <>
                        <CheckCircle2 className="size-3.5" />
                        Save
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
