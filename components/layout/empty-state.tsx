import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-sm border border-dashed border-border/80 bg-card/40 px-8 py-16 text-center">
      <div className="mx-auto max-w-md space-y-3">
        {Icon && (
          <div className="mx-auto inline-flex size-11 items-center justify-center rounded-full bg-muted/60">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        )}
        <h2 className="font-serif text-xl tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  )
}
