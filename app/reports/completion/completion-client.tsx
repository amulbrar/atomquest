"use client"

import { useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import type { EmployeeCompletion } from "./page"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle2, Clock, Minus } from "lucide-react"

interface Props {
  cycleLabel: string
  employees: EmployeeCompletion[]
  supabaseUrl: string
  supabaseAnonKey: string
}

type CellStatus = "none" | "partial" | "manager_done"

const CELL_CONFIG: Record<CellStatus, {
  bg: string
  icon: React.ElementType
  iconClass: string
  label: string
}> = {
  none: {
    bg: "bg-red-50 border-red-200",
    icon: Minus,
    iconClass: "text-red-400",
    label: "No check-in yet",
  },
  partial: {
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
    iconClass: "text-amber-500",
    label: "Employee updated — awaiting manager review",
  },
  manager_done: {
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle2,
    iconClass: "text-green-600",
    label: "Manager check-in complete",
  },
}

function Cell({ status }: { status: CellStatus }) {
  const cfg = CELL_CONFIG[status]
  const Icon = cfg.icon
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center justify-center rounded border size-8 ${cfg.bg}`}>
            <Icon className={`size-4 ${cfg.iconClass}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent>{cfg.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function CompletionClient({ cycleLabel, employees, supabaseUrl, supabaseAnonKey }: Props) {
  const router = useRouter()

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return
    const client = createClient(supabaseUrl, supabaseAnonKey)
    const channel = client
      .channel("quarter_updates_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quarter_updates" },
        () => refresh()
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [supabaseUrl, supabaseAnonKey, refresh])

  // Group by department
  const grouped = employees.reduce<Record<string, EmployeeCompletion[]>>((acc, e) => {
    const key = e.departmentName ?? "No Department"
    ;(acc[key] ??= []).push(e)
    return acc
  }, {})

  // Summary stats
  const total = employees.length * 4
  const done = employees.reduce(
    (n, e) => n + Object.values(e.quarters).filter((v) => v === "manager_done").length,
    0
  )

  const deptStats = Object.entries(grouped).map(([dept, emps]) => {
    const deptTotal = emps.length * 4
    const deptDone = emps.reduce(
      (n, e) => n + Object.values(e.quarters).filter((v) => v === "manager_done").length,
      0
    )
    return { dept, emps, deptTotal, deptDone }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Completion Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {cycleLabel} · Live · {done}/{total} quarter check-ins complete
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {Object.entries(CELL_CONFIG).map(([status, cfg]) => {
            const Icon = cfg.icon
            return (
              <span key={status} className="flex items-center gap-1.5">
                <Icon className={`size-3.5 ${cfg.iconClass}`} />
                {cfg.label.split("—")[0].trim()}
              </span>
            )
          })}
        </div>
      </div>

      {employees.length === 0 ? (
        <p className="text-muted-foreground">No employees with approved goals yet.</p>
      ) : (
        <div className="space-y-6">
          {deptStats.map(({ dept, emps, deptTotal, deptDone }) => (
            <div key={dept}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {dept}
                </h2>
                <Badge variant={deptDone === deptTotal ? "default" : "secondary"}>
                  {deptDone}/{deptTotal}
                </Badge>
              </div>

              <div className="rounded-md border overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">Employee</th>
                      <th className="text-left px-4 py-2 font-medium">Manager</th>
                      <th className="text-left px-4 py-2 font-medium">Goals</th>
                      <th className="px-4 py-2 font-medium text-center">Q1</th>
                      <th className="px-4 py-2 font-medium text-center">Q2</th>
                      <th className="px-4 py-2 font-medium text-center">Q3</th>
                      <th className="px-4 py-2 font-medium text-center">Q4</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emps.map((e) => (
                      <tr key={e.employeeId} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{e.employeeName}</td>
                        <td className="px-4 py-2 text-muted-foreground">{e.managerName ?? "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{e.goalCount}</td>
                        {(["q1", "q2", "q3", "q4"] as const).map((q) => (
                          <td key={q} className="px-4 py-2">
                            <div className="flex justify-center">
                              <Cell status={e.quarters[q]} />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
