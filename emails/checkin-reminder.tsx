import {
  Html, Head, Body, Container, Section, Text, Button, Hr, Preview,
} from "@react-email/components"

interface Props {
  employeeName: string
  quarter: string
  cycleLabel: string
  daysLeft: number
  checkinUrl: string
}

export function CheckinReminderEmail({ employeeName, quarter, cycleLabel, daysLeft, checkinUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>{`Reminder: ${quarter} check-in window closes in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}</Preview>
      <Body style={{ backgroundColor: "#f9fafb", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", backgroundColor: "#fff", borderRadius: 8, padding: "32px 40px" }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
            Check-in reminder
          </Text>
          <Hr style={{ borderColor: "#e5e7eb", margin: "16px 0" }} />
          <Text style={{ color: "#374151" }}>Hi {employeeName},</Text>
          <Text style={{ color: "#374151" }}>
            The <strong>{quarter}</strong> check-in window for <strong>{cycleLabel}</strong> closes in{" "}
            <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong>. Please log your achievements before it closes.
          </Text>
          <Section style={{ textAlign: "center", margin: "28px 0" }}>
            <Button href={checkinUrl} style={{ backgroundColor: "#2563eb", color: "#fff", padding: "12px 24px", borderRadius: 6, fontWeight: 600, textDecoration: "none" }}>
              Log Achievements
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default CheckinReminderEmail
