"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Target,
  CalendarCheck,
  Users,
  BarChart3,
  FileText,
  ShieldCheck,
  Settings,
  Bell,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  roles: Array<"employee" | "manager" | "admin">
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["employee", "manager", "admin"],
  },
  {
    label: "My Goals",
    href: "/goals",
    icon: Target,
    roles: ["employee"],
  },
  {
    label: "Check-in",
    href: "/checkin",
    icon: CalendarCheck,
    roles: ["employee"],
  },
  {
    label: "My Team",
    href: "/team",
    icon: Users,
    roles: ["manager"],
  },
  {
    label: "Team Check-ins",
    href: "/team/checkin",
    icon: ClipboardList,
    roles: ["manager"],
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["manager", "admin"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
    roles: ["manager", "admin"],
  },
  {
    label: "Admin",
    href: "/admin",
    icon: ShieldCheck,
    roles: ["admin"],
  },
  {
    label: "Escalations",
    href: "/admin/escalations",
    icon: Bell,
    roles: ["admin"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["employee", "manager", "admin"],
  },
]

interface AppSidebarProps {
  role: "employee" | "manager" | "admin"
  className?: string
}

export function AppSidebar({ role, className }: AppSidebarProps) {
  const pathname = usePathname()

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <nav className={cn("flex flex-col gap-1 p-3", className)}>
      {items.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span>{item.label}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {item.badge}
              </Badge>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
