"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import type { AchievementRow } from "./page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Download, ArrowUpDown } from "lucide-react"
import * as XLSX from "xlsx"

const QUARTER_LABELS: Record<string, string> = {
  q1: "Q1", q2: "Q2", q3: "Q3", q4: "Q4",
}

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  on_track: "On Track",
  completed: "Completed",
}

function scoreColor(score: string | null): string {
  if (!score) return "text-muted-foreground"
  const pct = Number(score) * 100
  if (pct >= 100) return "text-green-600"
  if (pct >= 80) return "text-yellow-600"
  return "text-destructive"
}

interface Props {
  rows: AchievementRow[]
  cycles: { id: string; label: string }[]
  selectedCycleId: string
  selectedQuarter: "q1" | "q2" | "q3" | "q4"
}

const COLUMNS: ColumnDef<AchievementRow>[] = [
  {
    accessorKey: "employeeName",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Employee <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
  },
  {
    accessorKey: "departmentName",
    header: "Department",
    cell: ({ getValue }) => getValue() ?? "—",
  },
  {
    accessorKey: "managerName",
    header: "Manager",
    cell: ({ getValue }) => getValue() ?? "—",
  },
  {
    accessorKey: "thrustArea",
    header: "Thrust Area",
  },
  {
    accessorKey: "goalTitle",
    header: "Goal",
    cell: ({ getValue }) => (
      <span className="max-w-48 block truncate" title={getValue() as string}>
        {getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: "weightage",
    header: "Wt%",
    cell: ({ getValue }) => `${getValue()}%`,
  },
  {
    id: "target",
    header: "Target",
    cell: ({ row }) => {
      const r = row.original
      if (r.uomType === "timeline") return r.targetDate ? new Date(r.targetDate).toLocaleDateString("en-IN") : "—"
      if (r.uomType === "zero") return "0"
      return r.targetValue ? `${r.targetValue}${r.uomType === "percent" ? "%" : ""}` : "—"
    },
  },
  {
    id: "actual",
    header: "Actual",
    cell: ({ row }) => {
      const r = row.original
      if (r.uomType === "timeline") return r.actualDate ? new Date(r.actualDate).toLocaleDateString("en-IN") : "—"
      return r.actualValue ? `${r.actualValue}${r.uomType === "percent" ? "%" : ""}` : "—"
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const v = getValue() as string | null
      if (!v) return <span className="text-muted-foreground">—</span>
      return <Badge variant="outline">{STATUS_LABELS[v] ?? v}</Badge>
    },
  },
  {
    accessorKey: "computedScore",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Score <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: ({ getValue }) => {
      const v = getValue() as string | null
      if (!v) return <span className="text-muted-foreground">—</span>
      const pct = Math.round(Number(v) * 100)
      return <span className={scoreColor(v)}>{pct}%</span>
    },
    sortingFn: (a, b) =>
      Number(a.original.computedScore ?? 0) - Number(b.original.computedScore ?? 0),
  },
]

function rowsToCsv(rows: AchievementRow[]): string {
  const headers = ["Employee", "Department", "Manager", "Thrust Area", "Goal", "Wt%", "Target", "Actual", "Status", "Score%"]
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [headers.join(",")]
  for (const r of rows) {
    const target = r.uomType === "timeline" ? (r.targetDate ?? "") : (r.targetValue ?? "")
    const actual = r.uomType === "timeline" ? (r.actualDate ?? "") : (r.actualValue ?? "")
    const score = r.computedScore ? String(Math.round(Number(r.computedScore) * 100)) : ""
    lines.push([
      escape(r.employeeName),
      escape(r.departmentName ?? ""),
      escape(r.managerName ?? ""),
      escape(r.thrustArea),
      escape(r.goalTitle),
      String(r.weightage),
      escape(target),
      escape(actual),
      escape(r.status ? (STATUS_LABELS[r.status] ?? r.status) : ""),
      score,
    ].join(","))
  }
  return lines.join("\n")
}

function downloadCsv(rows: AchievementRow[], quarter: string) {
  const csv = rowsToCsv(rows)
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `achievement-${quarter}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadXlsx(rows: AchievementRow[], quarter: string) {
  const data = rows.map((r) => ({
    Employee: r.employeeName,
    Department: r.departmentName ?? "",
    Manager: r.managerName ?? "",
    "Thrust Area": r.thrustArea,
    Goal: r.goalTitle,
    "Wt%": r.weightage,
    Target: r.uomType === "timeline" ? (r.targetDate ?? "") : (r.targetValue ?? ""),
    Actual: r.uomType === "timeline" ? (r.actualDate ?? "") : (r.actualValue ?? ""),
    Status: r.status ? (STATUS_LABELS[r.status] ?? r.status) : "",
    "Score%": r.computedScore ? Math.round(Number(r.computedScore) * 100) : "",
    "Employee Note": r.employeeNote ?? "",
    "Manager Comment": r.managerComment ?? "",
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Achievement")
  XLSX.writeFile(wb, `achievement-${quarter}.xlsx`)
}

export function AchievementClient({ rows, cycles, selectedCycleId, selectedQuarter }: Props) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows
    if (statusFilter === "no_update") return rows.filter((r) => !r.status || r.status === "not_started")
    return rows.filter((r) => r.status === statusFilter)
  }, [rows, statusFilter])

  const table = useReactTable({
    data: filtered,
    columns: COLUMNS,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  function setParam(key: string, value: string) {
    const url = new URL(window.location.href)
    url.searchParams.set(key, value)
    router.push(url.pathname + url.search)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Achievement Report</h1>
          <p className="text-muted-foreground text-sm">
            {rows.length} goals · {QUARTER_LABELS[selectedQuarter]}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5"
            onClick={() => downloadCsv(filtered, selectedQuarter)}>
            <Download className="size-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5"
            onClick={() => downloadXlsx(filtered, selectedQuarter)}>
            <Download className="size-3.5" /> XLSX
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedCycleId} onValueChange={(v) => setParam("cycleId", v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Cycle" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedQuarter} onValueChange={(v) => setParam("quarter", v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["q1", "q2", "q3", "q4"] as const).map((q) => (
              <SelectItem key={q} value={q}>{QUARTER_LABELS[q]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="no_update">No update</SelectItem>
            <SelectItem value="on_track">On Track</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search…"
          className="w-48"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="text-center text-muted-foreground py-8">
                  No data found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
