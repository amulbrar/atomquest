import { defineConfig } from "drizzle-kit"
import { config } from "dotenv"
import dns from "dns"

config({ path: ".env.local" })
// WSL2 defaults to IPv6 for hostnames that have both — force IPv4
dns.setDefaultResultOrder("ipv4first")

// URL-encode the password segment so special chars (%, [, ], !) don't break parsing
function sanitizeUrl(url: string): string {
  return url.replace(
    /^(postgresql:\/\/[^:@]+:)([^@]*)(@.+)$/,
    (_, prefix, password, suffix) => prefix + encodeURIComponent(password) + suffix
  )
}

const rawUrl = (process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? "")
  .replace("?pgbouncer=true", "")

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: sanitizeUrl(rawUrl),
    ssl: true,
  },
})
