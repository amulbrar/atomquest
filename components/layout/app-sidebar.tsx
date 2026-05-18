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

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  roles: Array<"employee" | "manager" | "admin">
  section: "main" | "work" | "admin"
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["employee", "manager", "admin"], section: "main" },
  { label: "My Goals", href: "/goals", icon: Target, roles: ["employee"], section: "work" },
  { label: "Check-in", href: "/checkin", icon: CalendarCheck, roles: ["employee"], section: "work" },
  { label: "My Team", href: "/team", icon: Users, roles: ["manager"], section: "work" },
  { label: "Team Check-ins", href: "/team/checkin", icon: ClipboardList, roles: ["manager"], section: "work" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, roles: ["manager", "admin"], section: "work" },
  { label: "Reports", href: "/reports", icon: FileText, roles: ["manager", "admin"], section: "work" },
  { label: "Admin", href: "/admin", icon: ShieldCheck, roles: ["admin"], section: "admin" },
  { label: "Escalations", href: "/admin/escalations", icon: Bell, roles: ["admin"], section: "admin" },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["employee", "manager", "admin"], section: "admin" },
]

const SECTION_LABELS = {
  main: "",
  work: "Work",
  admin: "System",
} as const

interface AppSidebarProps {
  role: "employee" | "manager" | "admin"
  className?: string
}

export function AppSidebar({ role, className }: AppSidebarProps) {
  const pathname = usePathname()

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role))

  const grouped = items.reduce<Record<string, NavItem[]>>((acc, item) => {
    acc[item.section] = acc[item.section] ?? []
    acc[item.section].push(item)
    return acc
  }, {})

  return (
    <nav className={cn("flex flex-col gap-7 px-3 py-7", className)}>
      {(["main", "work", "admin"] as const).map((section) => {
        const sectionItems = grouped[section]
        if (!sectionItems || sectionItems.length === 0) return null
        return (
          <div key={section} className="space-y-0.5">
            {SECTION_LABELS[section] && (
              <div className="px-3 mb-2.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 font-medium">
                {SECTION_LABELS[section]}
              </div>
            )}
            {sectionItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-sm px-3 py-[7px] text-[13.5px] transition-colors duration-150",
                    isActive
                      ? "text-foreground bg-primary/[0.06] font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary transition-opacity duration-200",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <item.icon
                    className={cn(
                      "size-[15px] shrink-0 transition-colors duration-150",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground/60 group-hover:text-foreground/80"
                    )}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                  <span className="leading-none">{item.label}</span>
                </Link>
              )
            })}
          </div>
        )
      })}

      <div className="mt-auto px-3 pt-6 border-t border-sidebar-border/70">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 font-medium">
          AtomQuest
        </p>
        <p className="font-serif text-[13px] italic text-muted-foreground/85 mt-1.5 leading-relaxed">
          &ldquo;Set deliberately. Review honestly.&rdquo;
        </p>
      </div>
    </nav>
  )
}
