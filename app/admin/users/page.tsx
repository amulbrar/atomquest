import { requireRole } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { users, departments } from "@/lib/db/schema"
import { AppLayout } from "@/components/layout/app-layout"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  manager: "secondary",
  employee: "outline",
}

export default async function UsersPage() {
  const session = await requireRole("admin")
  const allUsers = await db.select().from(users).orderBy(users.role, users.name)
  const allDepts = await db.select().from(departments)

  const withDetails = allUsers.map((u) => ({
    ...u,
    deptName: allDepts.find((d) => d.id === u.departmentId)?.name ?? "—",
    managerName: allUsers.find((m) => m.id === u.managerId)?.name ?? "—",
  }))

  return (
    <AppLayout role={session.user.role}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground text-sm">{allUsers.length} accounts</p>
        </div>
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>SSO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withDetails.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{u.deptName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.managerName}</TableCell>
                  <TableCell>
                    {u.entraOid
                      ? <Badge variant="secondary" className="text-xs">Entra</Badge>
                      : <span className="text-xs text-muted-foreground">—</span>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  )
}
