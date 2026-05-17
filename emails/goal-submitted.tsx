import {
  Html, Head, Body, Container, Section, Text, Button, Hr, Preview,
} from "@react-email/components"

interface Props {
  managerName: string
  employeeName: string
  cycleLabel: string
  goalCount: number
  reviewUrl: string
}

export function GoalSubmittedEmail({ managerName, employeeName, cycleLabel, goalCount, reviewUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>{employeeName} has submitted their goals for {cycleLabel}</Preview>
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", backgroundColor: "#fff", borderRadius: 8, padding: "32px 40px" }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
            Goals submitted for review
          </Text>
          <Hr style={{ borderColor: "#e5e7eb", margin: "16px 0" }} />
          <Text style={{ color: "#374151" }}>Hi {managerName},</Text>
          <Text style={{ color: "#374151" }}>
            <strong>{employeeName}</strong> has submitted {goalCount} goal{goalCount !== 1 ? "s" : ""} for{" "}
            <strong>{cycleLabel}</strong> and is awaiting your approval.
          </Text>
          <Section style={{ textAlign: "center", margin: "28px 0" }}>
            <Button href={reviewUrl} style={{ backgroundColor: "#2563eb", color: "#fff", padding: "12px 24px", borderRadius: 6, fontWeight: 600, textDecoration: "none" }}>
              Review &amp; Approve
            </Button>
          </Section>
          <Text style={{ color: "#6b7280", fontSize: 13 }}>
            You can also navigate to <em>My Team → {employeeName}</em> in the portal.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default GoalSubmittedEmail
