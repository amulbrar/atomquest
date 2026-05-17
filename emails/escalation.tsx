import {
  Html, Head, Body, Container, Section, Text, Button, Hr, Preview,
} from "@react-email/components"

interface Props {
  targetName: string
  subjectName: string
  ruleName: string
  message: string
  portalUrl: string
}

export function EscalationEmail({ targetName, subjectName, ruleName, message, portalUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Action required: {ruleName} — {subjectName}</Preview>
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", backgroundColor: "#fff", borderRadius: 8, padding: "32px 40px" }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
            Escalation notice
          </Text>
          <Hr style={{ borderColor: "#e5e7eb", margin: "16px 0" }} />
          <Text style={{ color: "#374151" }}>Hi {targetName},</Text>
          <Section style={{ backgroundColor: "#fef2f2", borderLeft: "4px solid #dc2626", padding: "12px 16px", borderRadius: "0 4px 4px 0", margin: "16px 0" }}>
            <Text style={{ color: "#991b1b", margin: 0, fontWeight: 600 }}>{ruleName}</Text>
            <Text style={{ color: "#7f1d1d", margin: "6px 0 0", fontSize: 13 }}>{message}</Text>
          </Section>
          <Text style={{ color: "#374151" }}>
            This escalation has been raised for <strong>{subjectName}</strong>. Please take action promptly.
          </Text>
          <Section style={{ textAlign: "center", margin: "28px 0" }}>
            <Button href={portalUrl} style={{ backgroundColor: "#dc2626", color: "#fff", padding: "12px 24px", borderRadius: 6, fontWeight: 600, textDecoration: "none" }}>
              View in Portal
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default EscalationEmail
