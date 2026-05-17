"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { goalSchema, type GoalInput } from "@/lib/validation/goal"
import { saveGoal, deleteGoal, submitGoalSheet } from "./actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Plus, Pencil, Trash2, Lock, SendHorizonal, AlertTriangle } from "lucide-react"

// Need AlertDialog
import "@/components/ui/alert-dialog"

interface ThrustArea {
  id: string
  name: string
}

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
  sortOrder: number
}

interface GoalsClientProps {
  cycleLabel: string
  sheetStatus: string | null
  goals: GoalRow[]
  thrustAreas: ThrustArea[]
  totalWeightage: number
  isEditable: boolean
  isPhase1Open: boolean
  returnComment: string | null
}

const SHEET_STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "secondary" },
  submitted: { label: "Pending Approval", variant: "outline" },
  approved: { label: "Approved", variant: "secondary" },
  locked: { label: "Locked", variant: "default" },
  reopened: { label: "Reopened — please resubmit", variant: "destructive" },
}

const UOM_DIRECTION_OPTIONS = {
  numeric: [
    { value: "min", label: "Min (higher is better, e.g. Revenue)" },
    { value: "max", label: "Max (lower is better, e.g. TAT)" },
  ],
  percent: [
    { value: "min", label: "Min (higher % is better)" },
    { value: "max", label: "Max (lower % is better)" },
  ],
  timeline: [{ value: "na", label: "Date-based completion" }],
  zero: [{ value: "na", label: "Zero = Success" }],
}

export function GoalsClient({
  cycleLabel,
  sheetStatus,
  goals,
  thrustAreas,
  totalWeightage,
  isEditable,
  isPhase1Open,
  returnComment,
}: GoalsClientProps) {
  const [open, setOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      thrustAreaId: "",
      title: "",
      description: "",
      uomType: "numeric",
      uomDirection: "min",
      targetValue: "",
      targetDate: "",
      weightage: 10,
    },
  })

  const uomType = form.watch("uomType")

  function openAddDialog() {
    form.reset()
    setEditingGoal(null)
    setOpen(true)
  }

  function openEditDialog(goal: GoalRow) {
    setEditingGoal(goal)
    form.reset({
      thrustAreaId: goal.thrustAreaId,
      title: goal.title,
      description: goal.description ?? "",
      uomType: goal.uomType,
      uomDirection: goal.uomDirection,
      targetValue: goal.targetValue ?? "",
      targetDate: goal.targetDate ?? "",
      weightage: goal.weightage,
    })
    setOpen(true)
  }

  function onSubmit(data: GoalInput) {
    startTransition(async () => {
      const result = await saveGoal({ ...data, goalId: editingGoal?.id })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(editingGoal ? "Goal updated" : "Goal added")
        setOpen(false)
      }
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteGoal(deleteTarget)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Goal deleted")
        setDeleteTarget(null)
      }
    })
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitGoalSheet()
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Goals submitted for approval!")
      }
    })
  }

  const statusInfo = sheetStatus ? SHEET_STATUS_BADGE[sheetStatus] : null
  const canSubmit =
    isEditable &&
    totalWeightage === 100 &&
    goals.length >= 1 &&
    (sheetStatus === "draft" || sheetStatus === "reopened" || !sheetStatus)
  const remaining = 100 - totalWeightage

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">My Goals</h1>
            <p className="text-muted-foreground">
              {cycleLabel} · {goals.length}/8 goals
            </p>
          </div>
          <div className="flex items-center gap-2">
            {statusInfo && (
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            )}
            {isEditable && goals.length < 8 && (
              <Button size="sm" onClick={openAddDialog} className="gap-1.5">
                <Plus className="size-4" />
                Add goal
              </Button>
            )}
            {canSubmit && (
              <Button size="sm" onClick={handleSubmit} disabled={isPending} className="gap-1.5">
                <SendHorizonal className="size-4" />
                Submit for approval
              </Button>
            )}
          </div>
        </div>

        {/* Return comment */}
        {sheetStatus === "reopened" && returnComment && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
            <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-destructive">Manager feedback: </span>
              {returnComment}
            </div>
          </div>
        )}

        {/* Weightage tracker */}
        <Card>
          <CardContent className="pt-4 pb-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total weightage</span>
              <span className={totalWeightage === 100 ? "text-green-600 font-semibold" : "font-semibold"}>
                {totalWeightage}%
                {totalWeightage < 100 && (
                  <span className="text-muted-foreground font-normal ml-1">
                    · {remaining}% remaining
                  </span>
                )}
                {totalWeightage > 100 && (
                  <span className="text-destructive font-normal ml-1">
                    · {-remaining}% over
                  </span>
                )}
              </span>
            </div>
            <Progress
              value={Math.min(totalWeightage, 100)}
              className="h-2"
            />
            {!isPhase1Open && (
              <p className="text-xs text-muted-foreground">
                Goal setting window is closed. Goals are read-only.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Goal list */}
        {goals.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground space-y-2">
            <p className="font-medium">No goals yet</p>
            <p className="text-sm">Add up to 8 goals. Total weightage must equal 100%.</p>
            {isEditable && (
              <Button onClick={openAddDialog} className="mt-2 gap-1.5">
                <Plus className="size-4" />
                Add your first goal
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const isShared = !!goal.sourceGoalId
              const isLocked = goal.lockedFields?.length > 0
              const ta = thrustAreas.find((t) => t.id === goal.thrustAreaId)
              return (
                <Card key={goal.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base leading-snug">{goal.title}</CardTitle>
                          {isShared && (
                            <Badge variant="outline" className="text-xs">Shared</Badge>
                          )}
                        </div>
                        {ta && (
                          <p className="text-xs text-muted-foreground mt-0.5">{ta.name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {goal.weightage}%
                        </Badge>
                        {isEditable && (
                          <>
                            {isLocked ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-7" onClick={() => openEditDialog(goal)}>
                                    <Lock className="size-3.5 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Some fields are locked (shared goal)</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button variant="ghost" size="icon" className="size-7" onClick={() => openEditDialog(goal)}>
                                <Pencil className="size-3.5" />
                              </Button>
                            )}
                            {!isShared && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(goal.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-4 text-sm flex-wrap">
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">UoM:</span>{" "}
                        {goal.uomType === "timeline"
                          ? "Timeline"
                          : goal.uomType === "zero"
                          ? "Zero-based"
                          : `${goal.uomType === "percent" ? "%" : "Numeric"} (${goal.uomDirection === "min" ? "↑ Higher is better" : "↓ Lower is better"})`}
                      </span>
                      {goal.targetValue !== null && (
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">Target:</span> {goal.targetValue}
                          {goal.uomType === "percent" ? "%" : ""}
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
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {goal.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Add/Edit goal dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Edit goal" : "Add goal"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Thrust Area */}
                <FormField
                  control={form.control}
                  name="thrustAreaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thrust Area</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select thrust area" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {thrustAreas.map((ta) => (
                            <SelectItem key={ta.id} value={ta.id}>{ta.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Increase NPS by 15 points"
                          {...field}
                          disabled={editingGoal?.lockedFields?.includes("title")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional context or success criteria"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  {/* UoM Type */}
                  <FormField
                    control={form.control}
                    name="uomType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UoM Type</FormLabel>
                        <Select
                          onValueChange={(v) => {
                            field.onChange(v)
                            // auto-set direction for timeline/zero
                            if (v === "timeline" || v === "zero") {
                              form.setValue("uomDirection", "na")
                            } else {
                              form.setValue("uomDirection", "min")
                            }
                          }}
                          defaultValue={field.value}
                          disabled={editingGoal?.lockedFields?.includes("uom_type")}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="numeric">Numeric</SelectItem>
                            <SelectItem value="percent">Percentage (%)</SelectItem>
                            <SelectItem value="timeline">Timeline (date)</SelectItem>
                            <SelectItem value="zero">Zero-based</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Direction */}
                  <FormField
                    control={form.control}
                    name="uomDirection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Direction</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger disabled={uomType === "timeline" || uomType === "zero"}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(UOM_DIRECTION_OPTIONS[uomType] ?? []).map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Target */}
                {uomType === "timeline" ? (
                  <FormField
                    control={form.control}
                    name="targetDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            disabled={editingGoal?.lockedFields?.includes("target_date")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : uomType !== "zero" ? (
                  <FormField
                    control={form.control}
                    name="targetValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Target Value
                          {uomType === "percent" && " (%)"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 100"
                            {...field}
                            disabled={editingGoal?.lockedFields?.includes("target_value")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">
                    Zero-based goal: success = 0 occurrences (e.g. safety incidents)
                  </p>
                )}

                {/* Weightage */}
                <FormField
                  control={form.control}
                  name="weightage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weightage (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={10}
                          max={100}
                          step={5}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving…" : editingGoal ? "Update" : "Add goal"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
