"use client"

import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut } from "lucide-react"

const ROLE_LABEL = {
  admin: "Administrator",
  manager: "Manager",
  employee: "Contributor",
} as const

interface UserMenuProps {
  name: string
  email: string
  role: "employee" | "manager" | "admin"
  initials: string
}

export function UserMenu({ name, email, role, initials }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full size-9 hover:bg-transparent group cursor-pointer"
          aria-label={`Account menu for ${name}`}
        >
          <Avatar className="size-9 ring-1 ring-border/80 transition-all duration-200 group-hover:ring-primary/40 group-data-[state=open]:ring-primary/50">
            <AvatarFallback className="text-[11px] font-medium tracking-wide bg-surface-2 text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-2">
        <div className="flex flex-col gap-0.5 px-2.5 pt-2 pb-2.5">
          <span className="font-serif text-[15px] tracking-tight leading-tight">{name}</span>
          <span className="text-[11.5px] text-muted-foreground/90 truncate font-mono">{email}</span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-primary mt-2 font-medium">
            {ROLE_LABEL[role]}
          </span>
        </div>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem
          onSelect={() => signOut({ callbackUrl: "/login" })}
          className="px-2.5 py-2 flex items-center gap-2.5 text-[13.5px]"
        >
          <LogOut className="size-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
