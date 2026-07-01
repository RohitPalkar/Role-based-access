export function calculateTotalBatches(totalRecords: number, recordsPerBatch: number): number {
  if (recordsPerBatch <= 0) {
    return 0;
  }
  return Math.ceil(totalRecords / recordsPerBatch);
}
