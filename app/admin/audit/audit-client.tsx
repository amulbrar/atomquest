"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { AuditEntry } from "./page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ChevronDown, ChevronRight } from "lucide-react"

interface Props {
  rows: AuditEntry[]
  page: number
  hasMore: boolean
  users: { id: string; name: string }[]
  filters: { entityType: string; actorId: string; from: string; to: string }
}

function JsonDiff({ before, after }: { before: string | null; after: string | null }) {
  function parseJson(s: string | null) {
    if (!s) return null
    try { return JSON.parse(s) } catch { return s }
  }

  const b = parseJson(before)
  const a = parseJson(after)

  if (!b && !a) return <p className="text-xs text-muted-foreground">No data</p>

  const allKeys = new Set([
    ...Object.keys(b ?? {}),
    ...Object.keys(a ?? {}),
  ])

  return (
    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
      <div>
        <p className="font-sans font-medium text-muted-foreground mb-1">Before</p>
        <div className="bg-red-50 rounded p-2 space-y-0.5">
          {b
            ? Array.from(allKeys).map((k) => (
                <p key={k} className={a && JSON.stringify((a as Record<string, unknown>)[k]) !== JSON.stringify((b as Record<string, unknown>)[k]) ? "text-red-700 font-medium" : ""}>
                  <span className="text-muted-foreground">{k}:</span>{" "}
                  {JSON.stringify((b as Record<string, unknown>)[k])}
                </p>
              ))
            : <p className="text-muted-foreground italic">—</p>
          }
        </div>
      </div>
      <div>
        <p className="font-sans font-medium text-muted-foreground mb-1">After</p>
        <div className="bg-green-50 rounded p-2 space-y-0.5">
          {a
            ? Array.from(allKeys).map((k) => (
                <p key={k} className={b && JSON.stringify((a as Record<string, unknown>)[k]) !== JSON.stringify((b as Record<string, unknown>)[k]) ? "text-green-700 font-medium" : ""}>
                  <span className="text-muted-foreground">{k}:</span>{" "}
                  {JSON.stringify((a as Record<string, unknown>)[k])}
                </p>
              ))
            : <p className="text-muted-foreground italic">—</p>
          }
        </div>
      </div>
    </div>
  )
}

export function AuditClient({ rows, page, hasMore, users, filters }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [localFilters, setLocalFilters] = useState(filters)

  function applyFilters() {
    const url = new URL(window.location.href)
    url.searchParams.set("page", "1")
    if (localFilters.entityType) url.searchParams.set("entityType", localFilters.entityType)
    else url.searchParams.delete("entityType")
    if (localFilters.actorId) url.searchParams.set("actorId", localFilters.actorId)
    else url.searchParams.delete("actorId")
    if (localFilters.from) url.searchParams.set("from", localFilters.from)
    else url.searchParams.delete("from")
    if (localFilters.to) url.searchParams.set("to", localFilters.to)
    else url.searchParams.delete("to")
    router.push(url.pathname + url.search)
  }

  function setPage(p: number) {
    const url = new URL(window.location.href)
    url.searchParams.set("page", String(p))
    router.push(url.pathname + url.search)
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground text-sm">All system changes with before/after diffs</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Entity type (e.g. goal_sheet)"
          className="w-48"
          value={localFilters.entityType}
          onChange={(e) => setLocalFilters((p) => ({ ...p, entityType: e.target.value }))}
        />
        <Select
          value={localFilters.actorId || "all"}
          onValueChange={(v) => setLocalFilters((p) => ({ ...p, actorId: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Actor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actors</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="w-36"
          value={localFilters.from}
          onChange={(e) => setLocalFilters((p) => ({ ...p, from: e.target.value }))}
        />
        <Input
          type="date"
          className="w-36"
          value={localFilters.to}
          onChange={(e) => setLocalFilters((p) => ({ ...p, to: e.target.value }))}
        />
        <Button size="sm" onClick={applyFilters}>Apply</Button>
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Time</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No audit entries found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <>
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(row.id)}
                  >
                    <TableCell>
                      {expanded.has(row.id)
                        ? <ChevronDown className="size-4" />
                        : <ChevronRight className="size-4" />
                      }
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="outline" className="w-fit text-xs">{row.entityType}</Badge>
                        <span className="text-xs text-muted-foreground font-mono">{row.entityId.slice(0, 8)}…</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.action.includes("delete") ? "destructive" : row.action.includes("create") ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {row.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{row.actorName ?? "system"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-32 truncate">
                      {row.reason ?? "—"}
                    </TableCell>
                  </TableRow>
                  {expanded.has(row.id) && (
                    <TableRow key={`${row.id}-expand`}>
                      <TableCell colSpan={6} className="bg-muted/30 px-8 py-4">
                        <JsonDiff before={row.before} after={row.after} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <Button size="sm" variant="outline" disabled={!hasMore} onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}
