// Notification stubs — fully implemented in M9/M10

export async function sendGoalSubmittedNotification(
  _employeeId: string,
  _sheetId: string
): Promise<void> {
  // TODO: M9 — send email + Teams card
}

export async function sendGoalApprovedNotification(
  _employeeId: string,
  _sheetId: string
): Promise<void> {
  // TODO: M9
}

export async function sendGoalReturnedNotification(
  _employeeId: string,
  _sheetId: string,
  _comment: string
): Promise<void> {
  // TODO: M9
}

export async function sendCheckinReminderNotification(
  _employeeId: string,
  _quarter: string
): Promise<void> {
  // TODO: M9
}

export async function sendEscalationNotification(
  _targetUserId: string,
  _ruleId: string,
  _subjectUserId: string
): Promise<void> {
  // TODO: M9
}
