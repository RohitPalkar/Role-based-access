export function getMonthNumber(month: string): number | null {
  const date = new Date(Date.parse(`${month} 1, 2000`)); // Create a date using the month
  const monthIndex = date.getMonth(); // 0-based month index

  return isNaN(monthIndex) ? null : monthIndex + 1; // Convert to 1-based index
}
