class ShipperAdviseConstants {
  // Predefined Standard Failure Reasons for Pakistan & Global Logistics
  static const List<String> standardFailureReasons = [
    'Consignee Not Available / Phone Unreachable',
    'Incorrect / Incomplete Address',
    'Consignee Refused Delivery (COD Dispute)',
    'Consignee Refused (Did Not Order / Cancelled)',
    'Customer Requested Reschedule / Alternate Time',
    'Premises Closed / Restricted Security Access',
    'Customer Wants Open Box Inspection (Disallowed)',
    'Out of Delivery Area / Shift Timed Out',
  ];

  // Advice Action Statuses
  static const String statusAwaitingAdvice = 'Awaiting advice';
  static const String statusResolved = 'Resolved';
  static const String statusFailed = 'Failed';

  // Helper to determine next attempt string
  static String getAttemptLabel(int currentAttemptCount) {
    switch (currentAttemptCount) {
      case 0:
        return 'Attempt 1';
      case 1:
        return 'Attempt 2';
      case 2:
        return 'Attempt 3';
      default:
        return 'Attempt 3';
    }
  }

  // Check if max attempts reached (Rule: Max 3)
  static bool isMaxAttemptsReached(int attemptCount) {
    return attemptCount >= 3;
  }
}
