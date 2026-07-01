// Utility functions for file upload and compression

/**
 * Get compression dimensions based on document type or field name
 */
export const getCompressionDimensions = (fieldName: string) => {
  const lowerFieldName = (fieldName ?? '').toLowerCase();
  
  if (lowerFieldName.includes('aadhaar')) {
    return { width: 1200, height: 800 };
  }
  if (lowerFieldName.includes('pan')) {
    return { width: 1000, height: 700 };
  }
  if (lowerFieldName.includes('passport')) {
    return { width: 1200, height: 900 };
  }
  if (lowerFieldName.includes('oci')) {
    return { width: 1200, height: 900 };
  }
  if (lowerFieldName.includes('photo') || lowerFieldName.includes('image')) {
    return { width: 600, height: 800 };
  }
  if (lowerFieldName.includes('alternatedoc') || lowerFieldName.includes('other')) {
    return { width: 1000, height: 700 };
  }
  if (lowerFieldName.includes('transaction') || lowerFieldName.includes('payment')) {
    return { width: 1300, height: 600 };
  }
  if (lowerFieldName.includes('gst')) {
    return { width: 1000, height: 700 };
  }
  if (lowerFieldName.includes('cost') || lowerFieldName.includes('sheet')) {
    return { width: 1000, height: 700 };
  }
  if (lowerFieldName.includes('approval') || lowerFieldName.includes('proof')) {
    return { width: 1000, height: 700 };
  }
  if (lowerFieldName.includes('salary') || lowerFieldName.includes('payroll')) {
    return { width: 1000, height: 700 };
  }
  if (lowerFieldName.includes('booking') || lowerFieldName.includes('date')) {
    return { width: 1000, height: 700 };
  }
  
  // Default dimensions for general documents
  return { width: 800, height: 600 };
};

/**
 * Check if file is a PDF
 */
export const isNotImangeFile = (file: File): boolean => file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Get appropriate success message based on file type
 */
export const getUploadSuccessMessage = (file: File): string => isNotImangeFile(file) 
    ? 'PDF uploaded successfully.' 
    : 'File compressed and uploaded successfully.';