import {
  Html, Head, Body, Container, Section, Text, Button, Hr, Preview,
} from "@react-email/components"

interface Props {
  employeeName: string
  managerName: string
  cycleLabel: string
  checkinUrl: string
}

export function GoalApprovedEmail({ employeeName, managerName, cycleLabel, checkinUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Your goals for {cycleLabel} have been approved</Preview>
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", backgroundColor: "#fff", borderRadius: 8, padding: "32px 40px" }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
            Goals approved ✓
          </Text>
          <Hr style={{ borderColor: "#e5e7eb", margin: "16px 0" }} />
          <Text style={{ color: "#374151" }}>Hi {employeeName},</Text>
          <Text style={{ color: "#374151" }}>
            Your goals for <strong>{cycleLabel}</strong> have been approved by{" "}
            <strong>{managerName}</strong>. You can now log your quarterly achievements during each check-in window.
          </Text>
          <Section style={{ textAlign: "center", margin: "28px 0" }}>
            <Button href={checkinUrl} style={{ backgroundColor: "#16a34a", color: "#fff", padding: "12px 24px", borderRadius: 6, fontWeight: 600, textDecoration: "none" }}>
              Go to Check-in
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default GoalApprovedEmail
