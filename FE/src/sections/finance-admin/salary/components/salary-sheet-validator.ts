const EXPECTED_COLUMNS = ['email', 'salary'];

const EMAIL_REGEX = /^[^\s@]{1,256}@[^\s@]{1,256}\.[^\s@]{1,256}$/;

function toNumberSalary(raw: unknown): number | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  const s = String(raw).trim();
  if (s === '') {
    return null;
  }
  const n = Number(s.replaceAll(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function validateSalarySheet(jsonData: any[][]): string | null {
  if (!jsonData.length) {
    return 'Invalid file.';
  }

  const headerRow = jsonData[0] as string[];
  const normalizedHeaderRow = headerRow.map((col) => col?.toString().toLowerCase().trim());

  if (normalizedHeaderRow.length !== EXPECTED_COLUMNS.length) {
    return `File must contain exactly ${EXPECTED_COLUMNS.length} columns: ${EXPECTED_COLUMNS.join(', ')}`;
  }

  const missingColumns = EXPECTED_COLUMNS.filter((col) => !normalizedHeaderRow.includes(col));

  if (missingColumns.length > 0) {
    return `Missing expected columns: ${missingColumns.join(', ')}`;
  }

  const dataRows = jsonData.slice(1);

  const hasDataRow = dataRows.some(
    (row) =>
      Array.isArray(row) &&
      row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '')
  );

  if (!hasDataRow) {
    return 'Excel file must contain at least one data row with values.';
  }

  const salaryByEmail = new Map<string, number>();

  return dataRows.reduce<string | null>((found, row, index) => {
    if (found) {
      return found;
    }

    const rowNum = index + 2;
    const email = Array.isArray(row) ? String(row[0] ?? '').trim() : '';
    const salaryRaw = Array.isArray(row) ? row[1] : undefined;

    const salaryEmpty =
      salaryRaw === undefined || salaryRaw === null || String(salaryRaw).trim() === '';

    if (!email && salaryEmpty) {
      return `Row ${rowNum} is completely empty.`;
    }

    if (!email) {
      return `Row ${rowNum}: Email is missing.`;
    }

    if (salaryEmpty) {
      return `Row ${rowNum}: Salary is missing.`;
    }

    const salaryNum = toNumberSalary(salaryRaw);
    if (salaryNum === null) {
      return `Invalid salary format in row ${rowNum}. Salary must be a valid number.`;
    }

    if (salaryNum <= 0) {
      return `Row ${rowNum}: Salary must be a positive number.`;
    }

    if (!EMAIL_REGEX.test(email)) {
      return `Row ${rowNum}: Invalid email format.`;
    }

    if (salaryByEmail.has(email) && salaryByEmail.get(email) !== salaryNum) {
      return `Row ${rowNum}: Duplicate email found with a different salary.`;
    }

    salaryByEmail.set(email, salaryNum);
    return null;
  }, null);
}
