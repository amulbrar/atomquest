"use client"

import { useState, useTransition } from "react"
import { saveManagerComment, markManagerCheckinComplete } from "./actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import { CheckCircle2, Clock, AlertCircle, User } from "lucide-react"

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

interface UpdateRow {
  goalId: string
  quarter: string
  actualValue: string | null
  actualDate: string | null
  status: string
  computedScore: string | null
  employeeNote: string | null
  managerComment: string | null
  managerCheckinAt: string | null
}

interface ThrustArea { id: string; name: string }

interface EmployeeData {
  employee: { id: string; name: string; email: string }
  hasLockedSheet: boolean
  goals: GoalRow[]
  updates: UpdateRow[]
}

interface Props {
  cycleLabel: string
  activeQuarter: "q1" | "q2" | "q3" | "q4" | null
  teamData: EmployeeData[]
  thrustAreas: ThrustArea[]
}

const QUARTER_LABELS: Record<string, string> = {
  q1: "Q1 (July)",
  q2: "Q2 (October)",
  q3: "Q3 (January)",
  q4: "Q4 / Annual (March–April)",
}

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  on_track: "On Track",
  completed: "Completed",
}

function scoreColor(score: number): string {
  if (score >= 100) return "text-green-600"
  if (score >= 80) return "text-yellow-600"
  return "text-destructive"
}

function EmployeeCheckin({
  data,
  activeQuarter,
  thrustAreas,
}: {
  data: EmployeeData
  activeQuarter: "q1" | "q2" | "q3" | "q4" | null
  thrustAreas: ThrustArea[]
}) {
  const { employee, goals, updates } = data
  const [isPending, startTransition] = useTransition()
  const [comments, setComments] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const u of updates) {
      init[u.goalId] = u.managerComment ?? ""
    }
    return init
  })
  const [savingGoalId, setSavingGoalId] = useState<string | null>(null)
  const [markingComplete, setMarkingComplete] = useState(false)

  const checkinDoneGoalIds = new Set(
    updates.filter((u) => u.managerCheckinAt).map((u) => u.goalId)
  )
  const allCheckedIn = goals.length > 0 && goals.every((g) => checkinDoneGoalIds.has(g.id))

  function handleSaveComment(goalId: string) {
    if (!activeQuarter) return
    setSavingGoalId(goalId)
    startTransition(async () => {
      const result = await saveManagerComment(goalId, activeQuarter, comments[goalId] ?? "")
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Comment saved")
      }
      setSavingGoalId(null)
    })
  }

  function handleMarkComplete() {
    if (!activeQuarter) return
    setMarkingComplete(true)
    startTransition(async () => {
      const result = await markManagerCheckinComplete(employee.id, activeQuarter)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Check-in marked complete")
      }
      setMarkingComplete(false)
    })
  }

  if (!data.hasLockedSheet) {
    return (
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
        <AlertCircle className="size-5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Goals not yet approved — check-in not available.
        </p>
      </div>
    )
  }

  if (goals.length === 0) {
    return <p className="text-sm text-muted-foreground">No goals found for this employee.</p>
  }

  return (
    <div className="space-y-4">
      {/* Check-in status bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          {allCheckedIn ? (
            <CheckCircle2 className="size-4 text-green-600" />
          ) : (
            <Clock className="size-4 text-muted-foreground" />
          )}
          <span className={allCheckedIn ? "text-green-600 font-medium" : "text-muted-foreground"}>
            {allCheckedIn ? "Check-in complete" : `${checkinDoneGoalIds.size}/${goals.length} goals reviewed`}
          </span>
        </div>
        {activeQuarter && (
          <Button
            size="sm"
            variant={allCheckedIn ? "outline" : "default"}
            onClick={handleMarkComplete}
            disabled={isPending || markingComplete}
            className="gap-1.5"
          >
            <CheckCircle2 className="size-3.5" />
            {markingComplete ? "Saving…" : "Mark check-in complete"}
          </Button>
        )}
      </div>

      {/* Goal rows: planned vs achieved */}
      <div className="space-y-3">
        {goals.map((goal) => {
          const update = updates.find((u) => u.goalId === goal.id)
          const ta = thrustAreas.find((t) => t.id === goal.thrustAreaId)
          const scorePct = update?.computedScore
            ? Math.min(Math.round(Number(update.computedScore) * 100), 150)
            : null
          const reviewed = checkinDoneGoalIds.has(goal.id)

          return (
            <Card key={goal.id} className={reviewed ? "border-green-200" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {goal.title}
                      {goal.sourceGoalId && (
                        <Badge variant="outline" className="text-xs">Shared</Badge>
                      )}
                      {reviewed && (
                        <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {ta?.name}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="font-mono shrink-0">
                    {goal.weightage}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Planned vs Achieved table */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Planned
                    </p>
                    {goal.uomType === "timeline" ? (
                      <p>
                        {goal.targetDate
                          ? new Date(goal.targetDate).toLocaleDateString("en-IN")
                          : "—"}
                      </p>
                    ) : goal.uomType === "zero" ? (
                      <p>0 incidents</p>
                    ) : (
                      <p>
                        {goal.targetValue ?? "—"}
                        {goal.uomType === "percent" ? "%" : ""}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Achieved
                    </p>
                    {update ? (
                      goal.uomType === "timeline" ? (
                        <p>
                          {update.actualDate
                            ? new Date(update.actualDate).toLocaleDateString("en-IN")
                            : "Not entered"}
                        </p>
                      ) : (
                        <p>
                          {update.actualValue != null && update.actualValue !== ""
                            ? `${update.actualValue}${goal.uomType === "percent" ? "%" : ""}`
                            : "Not entered"}
                        </p>
                      )
                    ) : (
                      <p className="text-muted-foreground">No update yet</p>
                    )}
                  </div>
                </div>

                {/* Score + status */}
                {update && (
                  <div className="space-y-2">
                    {scorePct !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Score</span>
                          <span className={scoreColor(scorePct)}>
                            {scorePct}%{scorePct > 100 ? " ✨" : ""}
                          </span>
                        </div>
                        <Progress value={Math.min(scorePct, 100)} className="h-1.5" />
                      </div>
                    )}
                    {update.status !== "not_started" && (
                      <p className="text-xs text-muted-foreground">
                        Status:{" "}
                        <span className="font-medium text-foreground">
                          {STATUS_LABELS[update.status]}
                        </span>
                      </p>
                    )}
                    {update.employeeNote && (
                      <div className="bg-muted/50 rounded px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Employee note: </span>
                        {update.employeeNote}
                      </div>
                    )}
                  </div>
                )}

                {/* Manager comment */}
                {activeQuarter && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Manager comment
                    </label>
                    <Textarea
                      rows={2}
                      placeholder="Add feedback or coaching note…"
                      value={comments[goal.id] ?? ""}
                      onChange={(e) =>
                        setComments((prev) => ({ ...prev, [goal.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveComment(goal.id)}
                      disabled={isPending || savingGoalId === goal.id}
                      className="gap-1.5"
                    >
                      {savingGoalId === goal.id ? "Saving…" : "Save comment"}
                    </Button>
                  </div>
                )}

                {/* Read-only comment when window closed */}
                {!activeQuarter && update?.managerComment && (
                  <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-800">
                    <span className="font-medium">Your comment: </span>
                    {update.managerComment}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function ManagerCheckinClient({
  cycleLabel,
  activeQuarter,
  teamData,
  thrustAreas,
}: Props) {
  const lockedTeam = teamData.filter((d) => d.hasLockedSheet)

  if (lockedTeam.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Team Check-in</h1>
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <AlertCircle className="size-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            None of your direct reports have approved goal sheets yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Team Check-in</h1>
          <p className="text-muted-foreground">
            {cycleLabel}
            {activeQuarter && ` · ${QUARTER_LABELS[activeQuarter]}`}
          </p>
        </div>
        {activeQuarter ? (
          <Badge variant="default">{QUARTER_LABELS[activeQuarter]} — Window Open</Badge>
        ) : (
          <Badge variant="secondary">No window open — read only</Badge>
        )}
      </div>

      <Tabs defaultValue={lockedTeam[0].employee.id}>
        <TabsList className="flex-wrap h-auto gap-1">
          {lockedTeam.map(({ employee }) => (
            <TabsTrigger key={employee.id} value={employee.id} className="gap-1.5">
              <User className="size-3.5" />
              {employee.name.split(" ")[0]}
            </TabsTrigger>
          ))}
        </TabsList>

        {lockedTeam.map((data) => (
          <TabsContent key={data.employee.id} value={data.employee.id} className="mt-4">
            <div className="mb-3">
              <p className="font-medium">{data.employee.name}</p>
              <p className="text-sm text-muted-foreground">{data.employee.email}</p>
            </div>
            <EmployeeCheckin
              data={data}
              activeQuarter={activeQuarter}
              thrustAreas={thrustAreas}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
