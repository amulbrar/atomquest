import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { MobileMenu } from "./mobile-menu"
import type { Role } from "@/lib/auth/guards"

interface AppLayoutProps {
  children: React.ReactNode
  role: Role
}

export function AppLayout({ children, role }: AppLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-60 lg:w-64 border-r border-border/70 flex-col bg-sidebar shrink-0">
          <AppSidebar role={role} />
        </aside>

        {/* Mobile sidebar */}
        <MobileMenu role={role} />

        {/* Main content */}
        <main id="main-content" className="flex-1 overflow-auto" tabIndex={-1}>
          <div className="mx-auto max-w-[1280px] px-5 md:px-10 py-8 md:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
