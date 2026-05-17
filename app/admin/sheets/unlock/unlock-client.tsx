"use client"

import { useState, useTransition } from "react"
import { unlockSheet } from "./actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { RefreshCw } from "lucide-react"

interface SheetOption {
  id: string
  status: string
  employeeName: string
}

interface Props {
  sheets: SheetOption[]
  cycleLabel: string
}

export function UnlockClient({ sheets, cycleLabel }: Props) {
  const [selectedId, setSelectedId] = useState("")
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleUnlock() {
    startTransition(async () => {
      const result = await unlockSheet(selectedId, reason.trim())
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Sheet unlocked — employee can now revise their goals")
        setSelectedId("")
        setReason("")
      }
    })
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Unlock Goal Sheet</h1>
        <p className="text-muted-foreground text-sm">
          {cycleLabel} · Reopens a locked sheet for employee revision. Requires a reason.
        </p>
      </div>

      {sheets.length === 0 ? (
        <p className="text-muted-foreground">No locked sheets in the active cycle.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="size-4" />
              Select sheet to unlock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Employee</label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee…" />
                </SelectTrigger>
                <SelectContent>
                  {sheets.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.employeeName}
                      <Badge variant="secondary" className="ml-2 text-xs">{s.status}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Reason <span className="font-normal text-muted-foreground">(required, logged in audit trail)</span>
              </label>
              <Textarea
                rows={3}
                placeholder="e.g. Employee needs to adjust targets after org restructure"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <Button
              onClick={handleUnlock}
              disabled={isPending || !selectedId || !reason.trim()}
              className="gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              {isPending ? "Unlocking…" : "Unlock sheet"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
