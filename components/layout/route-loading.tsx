import { Skeleton } from "@/components/ui/skeleton"

interface RouteLoadingProps {
  variant?: "page" | "table" | "form" | "grid" | "charts"
  label?: string
}

export function RouteLoading({ variant = "page", label }: RouteLoadingProps) {
  return (
    <div className="mx-auto max-w-[1280px] px-5 md:px-10 py-8 md:py-10 space-y-8">
      <div className="space-y-3 max-w-2xl">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-3/4" />
        {label && (
          <p className="text-[13px] text-muted-foreground tracking-wide">
            {label}
          </p>
        )}
      </div>
      {variant === "page" && <PageVariant />}
      {variant === "table" && <TableVariant />}
      {variant === "form" && <FormVariant />}
      {variant === "grid" && <GridVariant />}
      {variant === "charts" && <ChartsVariant />}
    </div>
  )
}

function PageVariant() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-44 w-full" />
      ))}
    </div>
  )
}

function TableVariant() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

function FormVariant() {
  return (
    <div className="space-y-5 max-w-2xl">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  )
}

function GridVariant() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  )
}

function ChartsVariant() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full" />
      ))}
    </div>
  )
}
