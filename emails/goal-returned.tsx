import {
  Html, Head, Body, Container, Section, Text, Button, Hr, Preview,
} from "@react-email/components"

interface Props {
  employeeName: string
  managerName: string
  cycleLabel: string
  comment: string
  goalsUrl: string
}

export function GoalReturnedEmail({ employeeName, managerName, cycleLabel, comment, goalsUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Your goals for {cycleLabel} need revision</Preview>
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", backgroundColor: "#fff", borderRadius: 8, padding: "32px 40px" }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
            Goals returned for revision
          </Text>
          <Hr style={{ borderColor: "#e5e7eb", margin: "16px 0" }} />
          <Text style={{ color: "#374151" }}>Hi {employeeName},</Text>
          <Text style={{ color: "#374151" }}>
            <strong>{managerName}</strong> has returned your goals for <strong>{cycleLabel}</strong> with the following feedback:
          </Text>
          <Section style={{ backgroundColor: "#fef9c3", borderLeft: "4px solid #ca8a04", padding: "12px 16px", borderRadius: "0 4px 4px 0", margin: "16px 0" }}>
            <Text style={{ color: "#713f12", margin: 0, fontStyle: "italic" }}>{comment}</Text>
          </Section>
          <Text style={{ color: "#374151" }}>
            Please revise your goals and resubmit for approval.
          </Text>
          <Section style={{ textAlign: "center", margin: "28px 0" }}>
            <Button href={goalsUrl} style={{ backgroundColor: "#2563eb", color: "#fff", padding: "12px 24px", borderRadius: 6, fontWeight: 600, textDecoration: "none" }}>
              Edit My Goals
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default GoalReturnedEmail
