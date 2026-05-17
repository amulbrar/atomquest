const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

function adaptiveCard(body: object[], actions: object[] = []) {
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.5",
          body,
          actions,
        },
      },
    ],
  }
}

export async function sendTeamsCard(webhookUrl: string, card: object): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    })
    return res.ok
  } catch {
    return false
  }
}

export function goalSubmittedCard(employeeName: string, cycleLabel: string, employeeId: string) {
  return adaptiveCard(
    [
      { type: "TextBlock", text: "Goals submitted for review", weight: "Bolder", size: "Medium" },
      { type: "TextBlock", text: `**${employeeName}** submitted goals for **${cycleLabel}**`, wrap: true },
    ],
    [
      {
        type: "Action.OpenUrl",
        title: "Review & Approve",
        url: `${APP_URL}/team/${employeeId}`,
        style: "positive",
      },
    ]
  )
}

export function goalApprovedCard(cycleLabel: string) {
  return adaptiveCard(
    [
      { type: "TextBlock", text: "Goals approved ✓", weight: "Bolder", size: "Medium", color: "Good" },
      { type: "TextBlock", text: `Your goals for **${cycleLabel}** have been approved. You can now log quarterly achievements.`, wrap: true },
    ],
    [
      { type: "Action.OpenUrl", title: "Go to Check-in", url: `${APP_URL}/checkin` },
    ]
  )
}

export function goalReturnedCard(comment: string, cycleLabel: string) {
  return adaptiveCard(
    [
      { type: "TextBlock", text: "Goals returned for revision", weight: "Bolder", size: "Medium", color: "Warning" },
      { type: "TextBlock", text: `Your goals for **${cycleLabel}** need revision.`, wrap: true },
      { type: "TextBlock", text: `> ${comment}`, wrap: true, isSubtle: true },
    ],
    [
      { type: "Action.OpenUrl", title: "Edit My Goals", url: `${APP_URL}/goals` },
    ]
  )
}

export function escalationCard(subjectName: string, ruleName: string, message: string) {
  return adaptiveCard(
    [
      { type: "TextBlock", text: "Escalation notice", weight: "Bolder", size: "Medium", color: "Attention" },
      { type: "TextBlock", text: `**${ruleName}** — ${subjectName}`, wrap: true },
      { type: "TextBlock", text: message, wrap: true, isSubtle: true },
    ],
    [
      { type: "Action.OpenUrl", title: "View in Portal", url: `${APP_URL}/admin/escalations`, style: "destructive" },
    ]
  )
}
