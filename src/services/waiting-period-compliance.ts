export type ComplianceStatus = 'compliant' | 'exceeded' | 'unknown';

export type UrgencyValues = {
  regular: number | null;
  fast: number | null;
  veryFast: number | null;
};

export type WaitingPeriodCompliance = {
  regular: ComplianceStatus;
  fast: ComplianceStatus;
  veryFast: ComplianceStatus;
};

export function getWaitingPeriodCompliance(
  waitingPeriod: UrgencyValues,
  maxAllowedDays: UrgencyValues
): WaitingPeriodCompliance {
  return {
    regular: getUrgencyCompliance(
      waitingPeriod.regular,
      maxAllowedDays.regular
    ),
    fast: getUrgencyCompliance(waitingPeriod.fast, maxAllowedDays.fast),
    veryFast: getUrgencyCompliance(
      waitingPeriod.veryFast,
      maxAllowedDays.veryFast
    ),
  };
}

export function isAnyExceeded(compliance: WaitingPeriodCompliance): boolean {
  return Object.values(compliance).some((status) => status === 'exceeded');
}

function getUrgencyCompliance(
  waitingDays: number | null,
  maxAllowedDays: number | null
): ComplianceStatus {
  if (waitingDays === null || maxAllowedDays === null) {
    return 'unknown';
  }

  return waitingDays > maxAllowedDays ? 'exceeded' : 'compliant';
}
