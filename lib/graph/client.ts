const TENANT_ID = process.env.AZURE_AD_TENANT_ID ?? ""
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID ?? ""
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET ?? ""

async function getAccessToken(): Promise<string | null> {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) return null

  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
    }),
  })

  if (!res.ok) return null
  const data = await res.json() as { access_token?: string }
  return data.access_token ?? null
}

interface GraphUser {
  id: string
  displayName: string
  mail: string | null
  userPrincipalName: string
  department: string | null
  jobTitle: string | null
}

interface GraphManager {
  id: string
  displayName: string
  mail: string | null
  userPrincipalName: string
}

export async function listGraphUsers(): Promise<GraphUser[]> {
  const token = await getAccessToken()
  if (!token) return []

  const res = await fetch(
    "https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,department,jobTitle&$top=999",
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return []
  const data = await res.json() as { value?: GraphUser[] }
  return data.value ?? []
}

export async function getGraphManager(userId: string): Promise<GraphManager | null> {
  const token = await getAccessToken()
  if (!token) return null

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userId}/manager?$select=id,displayName,mail,userPrincipalName`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return null
  const data = await res.json() as GraphManager & { "@odata.type"?: string }
  return data["@odata.type"] ? data : null
}

export async function getGroupMembers(groupId: string): Promise<string[]> {
  const token = await getAccessToken()
  if (!token) return []

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/groups/${groupId}/members?$select=id&$top=999`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return []
  const data = await res.json() as { value?: { id: string }[] }
  return (data.value ?? []).map((m) => m.id)
}
