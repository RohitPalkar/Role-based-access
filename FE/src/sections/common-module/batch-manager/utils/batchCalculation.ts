export interface BatchCalculationParams {
  totalRecords: number;
  alreadyBatched: number;
  recordPerBatch: number;
  durationMinutes: number; // Duration of each batch
  startTimeHours: number; // e.g. 9 for 9AM
  endTimeHours: number;   // e.g. 18 for 6PM
}

export function calculateBatchRequirements(params: BatchCalculationParams) {
  const { 
    totalRecords, 
    alreadyBatched, 
    recordPerBatch, 
    durationMinutes, 
    startTimeHours, 
    endTimeHours 
  } = params;
  
  const remainingRecords = Math.max(0, totalRecords - alreadyBatched);
  const batchesRequired = recordPerBatch > 0 ? Math.ceil(remainingRecords / recordPerBatch) : 0;
  
  const dailyWorkingMinutes = Math.max(0, (endTimeHours - startTimeHours) * 60);
  const slotsPerDay = durationMinutes > 0 ? Math.floor(dailyWorkingMinutes / durationMinutes) : 0;
  
  const totalSlots = slotsPerDay;
  const exceedsCapacity = batchesRequired > totalSlots;

  return {
    remainingRecords,
    batchesRequired,
    slotsPerDay,
    totalSlots,
    exceedsCapacity
  };
}
