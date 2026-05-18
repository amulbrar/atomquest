"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface ErrorFallbackProps {
  error: Error & { digest?: string }
  reset: () => void
  scope?: string
}

export function ErrorFallback({ error, reset, scope }: ErrorFallbackProps) {
  return (
    <div className="mx-auto max-w-[1280px] px-5 md:px-10 py-12 md:py-16">
      <div className="max-w-xl space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-destructive">
            <AlertCircle className="size-3" />
            Error
          </div>
          <h1 className="font-serif text-3xl md:text-4xl leading-[1.05] tracking-tight">
            Something went wrong{scope ? ` in ${scope}` : ""}.
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed">
            {error.message || "An unexpected error interrupted the request."}
            {error.digest && (
              <span className="block mt-2 text-xs font-mono opacity-60">
                ref: {error.digest}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
