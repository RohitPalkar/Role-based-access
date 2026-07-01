import { PaymentEnums, unitStatuses } from "src/sections/admin/admin-reports/users/components/reports-common";

export function formatDateRange(dateString: string): string {
  const today = new Date();
  const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());

  // Handle "Till Now" case
  if (dateString === 'Till Now') {
    return formatDateToDDMMYYYY(today);
  }

  // Handle "Month YYYY" format
  if (/^[A-Za-z]+\s\d{4}$/.test(dateString)) {
    const date = new Date(dateString);
    date.setDate(1); // Set day to 1 to avoid missing day issues
    return restrictDateToRange(date, tenYearsAgo, today);
  }

  // Handle date range
  if (dateString?.includes(' - ')) {
    const [startDateStr, endDateStr] = dateString.split(' - ');
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    return `${restrictDateToRange(startDate, tenYearsAgo, today)} - ${restrictDateToRange(endDate, tenYearsAgo, today)}`;
  }

  // Handle single date
  const date = new Date(dateString);
  return restrictDateToRange(date, tenYearsAgo, today);
}

// Utility function to format date to DD-MM-YYYY
function formatDateToDDMMYYYY(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  return `${day}/${month}/${year}`;
}

// Utility function to restrict the date range
function restrictDateToRange(date: Date, minDate: Date, maxDate: Date): string {
  if (date < minDate) {
    return formatDateToDDMMYYYY(minDate); // Return min date if input date is too old
  }
  if (date > maxDate) {
    return formatDateToDDMMYYYY(maxDate); // Return today's date if input date is in the future
  }
  return formatDateToDDMMYYYY(date);
}


export const isCheckable = ({ unitStatus, paymentStatus }: any) => {
  let finalVal: boolean = false;
  if (unitStatus === unitStatuses.qualified) {
    if (paymentStatus === PaymentEnums.hold || paymentStatus === PaymentEnums.payable) {
      finalVal = true;
    } 
  }
  return finalVal;
};