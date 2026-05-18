import { auth } from "@/lib/auth/config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/api/auth", "/unauthorized"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const switchTo = request.nextUrl.searchParams.get("switchTo")

  // Allow public paths through (after switchTo handling, so /login?switchTo=…
  // can't sneak in either)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) && !switchTo) {
    return NextResponse.next()
  }

  // Demo-mode role-switcher. Only fire if:
  //  - demo mode is on (env var)
  //  - request is a GET (no POST/PUT side effects)
  //  - the target email differs from the active session (so bookmarks/back-nav
  //    don't silently re-switch identity)
  if (switchTo) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true" || request.method !== "GET") {
      const url = request.nextUrl.clone()
      url.searchParams.delete("switchTo")
      return NextResponse.redirect(url)
    }
    const session = await auth()
    if (session?.user?.email === switchTo) {
      // Already this user — strip the param and continue without re-signing in
      const url = request.nextUrl.clone()
      url.searchParams.delete("switchTo")
      return NextResponse.redirect(url)
    }
    const url = request.nextUrl.clone()
    url.searchParams.delete("switchTo")
    url.pathname = `/api/demo-switch`
    url.searchParams.set("to", switchTo)
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
