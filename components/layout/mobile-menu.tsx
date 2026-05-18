"use client"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { AppSidebar } from "./app-sidebar"
import type { Role } from "@/lib/auth/guards"

export function MobileMenu({ role }: { role: Role }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="md:hidden fixed bottom-5 right-5 z-50 size-12 rounded-full shadow-lg"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-sidebar">
        <AppSidebar role={role} className="pt-4" />
      </SheetContent>
    </Sheet>
  )
}
