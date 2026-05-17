"use client"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from "recharts"
import type { QoQPoint, ThrustSlice, UomBar, ManagerRow } from "./page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"]

const UOM_LABELS: Record<string, string> = {
  numeric: "Numeric",
  percent: "Percent",
  timeline: "Timeline",
  zero: "Zero-based",
}

interface Props {
  cycleLabel: string
  isAdmin: boolean
  qoqData: QoQPoint[]
  thrustData: ThrustSlice[]
  uomData: UomBar[]
  managerRows: ManagerRow[]
  totalGoals: number
  totalEmployees: number
}

function pct(done: number, total: number) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

export function AnalyticsClient({
  cycleLabel, isAdmin, qoqData, thrustData, uomData, managerRows, totalGoals, totalEmployees,
}: Props) {
  const mgEffData = managerRows.map((r) => ({
    name: r.managerName.split(" ")[0],
    Q1: pct(r.q1Done, r.q1Total),
    Q2: pct(r.q2Done, r.q2Total),
    Q3: pct(r.q3Done, r.q3Total),
    Q4: pct(r.q4Done, r.q4Total),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          {cycleLabel} · {isAdmin ? "Organisation-wide" : "Your team"} ·{" "}
          {totalEmployees} employees · {totalGoals} goals
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{totalEmployees}</p>
            <p className="text-sm text-muted-foreground">Employees with approved goals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{totalGoals}</p>
            <p className="text-sm text-muted-foreground">Active goals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">
              {qoqData.length ? `${qoqData[qoqData.length - 1].score}%` : "—"}
            </p>
            <p className="text-sm text-muted-foreground">Latest quarter avg score</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* QoQ Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quarter-on-Quarter Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {qoqData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No check-in data yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={qoqData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 150]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Thrust-area distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goals by Thrust Area</CardTitle>
          </CardHeader>
          <CardContent>
            {thrustData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No goals found.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={thrustData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) =>
                      `${name} ${Math.round((percent ?? 0) * 100)}%`
                    }
                    labelLine={false}
                  >
                    {thrustData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v} goals`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* UoM breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goal Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {uomData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No goals found.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={uomData.map((d) => ({ ...d, type: UOM_LABELS[d.type] ?? d.type }))}
                  margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Goals" fill="#2563eb" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Manager effectiveness */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manager Check-in Completion (%)</CardTitle>
          </CardHeader>
          <CardContent>
            {mgEffData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No managers found.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mgEffData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  {["Q1", "Q2", "Q3", "Q4"].map((q, i) => (
                    <Bar key={q} dataKey={q} stackId="a" fill={COLORS[i]} radius={i === 3 ? [3, 3, 0, 0] : undefined} />
                  ))}
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manager detail table */}
      {managerRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manager Effectiveness Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Manager</th>
                    {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                      <th key={q} className="pb-2 font-medium text-center">{q}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {managerRows.map((r) => {
                    const qs = [
                      pct(r.q1Done, r.q1Total),
                      pct(r.q2Done, r.q2Total),
                      pct(r.q3Done, r.q3Total),
                      pct(r.q4Done, r.q4Total),
                    ]
                    return (
                      <tr key={r.managerName} className="border-b last:border-0">
                        <td className="py-2 font-medium">{r.managerName}</td>
                        {qs.map((p, i) => (
                          <td key={i} className="py-2 text-center">
                            <Badge
                              variant={p === 100 ? "default" : p >= 50 ? "secondary" : "outline"}
                              className="font-mono"
                            >
                              {p}%
                            </Badge>
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
