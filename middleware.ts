import { auth } from "@/lib/auth/config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/api/auth", "/unauthorized"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Demo mode: role-switcher sets ?switchTo=email — handled in API route
  const switchTo = request.nextUrl.searchParams.get("switchTo")
  if (switchTo && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
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
