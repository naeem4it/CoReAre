/**
 * Utility functions for local date formatting without UTC skew.
 */

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toLocalDateString(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return typeof dateInput === 'string' ? dateInput.split('T')[0] : '';
  }
  return getLocalDateString(d);
}

export function getDefaultDateRange(daysBack: number = 30): { fromDate: string; toDate: string } {
  const now = new Date();
  const past = new Date();
  past.setDate(past.getDate() - daysBack);
  return {
    fromDate: getLocalDateString(past),
    toDate: getLocalDateString(now),
  };
}
