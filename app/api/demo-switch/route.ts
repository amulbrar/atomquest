import { NextRequest, NextResponse } from "next/server"
import { signIn } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const DEMO_PASSWORDS: Record<string, string> = {
  "admin@atomquest.demo": "Admin@1234",
  "priya.sharma@atomquest.demo": "Manager@1234",
  "arjun.mehta@atomquest.demo": "Manager@1234",
  "ananya.iyer@atomquest.demo": "Employee@1234",
  "rohan.gupta@atomquest.demo": "Employee@1234",
  "divya.nair@atomquest.demo": "Employee@1234",
  "karan.singh@atomquest.demo": "Employee@1234",
  "meera.patel@atomquest.demo": "Employee@1234",
  "vikram.rao@atomquest.demo": "Employee@1234",
}

export async function GET(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Demo mode disabled" }, { status: 403 })
  }

  const to = request.nextUrl.searchParams.get("to")
  const redirect = request.nextUrl.searchParams.get("redirect") ?? "/"

  if (!to || !DEMO_PASSWORDS[to]) {
    return NextResponse.json({ error: "Unknown demo user" }, { status: 400 })
  }

  try {
    await signIn("credentials", {
      email: to,
      password: DEMO_PASSWORDS[to],
      redirect: false,
    })
    return NextResponse.redirect(new URL(redirect, request.url))
  } catch {
    return NextResponse.redirect(new URL(redirect, request.url))
  }
}
