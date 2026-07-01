export type IOpportunityListTableFilters = {
  name: string;
  id: string;
};
export interface UploadDocumentsValues {
  // Applicant 1
  applicant1pan: string;
  applicant1panImage: File | null | string;
  applicant1aadhaar: string;
  applicant1aadhaarImage: File | null | string;
  applicant1aadhaarbackImage: File | null | string;
  applicant1passport: string;
  applicant1passportImage: File | null | string;
  applicant1passportbackImage: File | null | string;
  applicant1oci: string;
  applicant1ociImage: File | null | string;
  applicant1ocibackImage: File | null | string;
  applicant1photoImage: File | null | string;
  applicant1AddressProof: File | null | string;
  applicant1AddressProofImage: File | null | string;
  applicant1GST: string;
  applicant1GSTImage: File | null | string;
  applicant1LegalGuardianImage: File | null | string;

  // Applicant 1 Physical Flags
  isPhysicalApplicant1Aadhaar?: boolean;
  isPhysicalApplicant1Pan?: boolean;
  isPhysicalApplicant1Passport?: boolean;
  isPhysicalApplicant1OCI?: boolean;
  isPhysicalApplicant1Image?: boolean;
  isPhysicalApplicant1AddressProof?: boolean;
  isPhysicalApplicant1GST: boolean;
  isPhysicalApplicant1LegalGuardianDoc?: boolean;

  // Applicant 2
  applicant2pan: string;
  applicant2panImage: File | null | string;
  applicant2aadhaar: string;
  applicant2aadhaarImage: File | null | string;
  applicant2aadhaarbackImage: File | null | string;
  applicant2passport: string;
  applicant2passportImage: File | null | string;
  applicant2passportbackImage: File | null | string;
  applicant2oci: string;
  applicant2ociImage: File | null | string;
  applicant2ocibackImage: File | null | string;
  applicant2photoImage: File | null | string;
  applicant2AddressProof: File | null | string;
  applicant2AddressProofImage: File | null | string;
  applicant2GST: string;
  applicant2GSTImage: File | null | string;
  applicant2LegalGuardianImage: File | null | string;

  // Applicant 2 Physical Flags
  isPhysicalApplicant2Aadhaar?: boolean;
  isPhysicalApplicant2Pan?: boolean;
  isPhysicalApplicant2Passport?: boolean;
  isPhysicalApplicant2OCI?: boolean;
  isPhysicalApplicant2Image?: boolean;
  isPhysicalApplicant2AddressProof?: boolean;
  isPhysicalApplicant2GST: boolean;
  isPhysicalApplicant2LegalGuardianDoc?: boolean;

  // Applicant 3
  applicant3pan: string;
  applicant3panImage: File | null | string;
  applicant3aadhaar: string;
  applicant3aadhaarImage: File | null | string;
  applicant3aadhaarbackImage: File | null | string;
  applicant3passport: string;
  applicant3passportImage: File | null | string;
  applicant3passportbackImage: File | null | string;
  applicant3oci: string;
  applicant3ociImage: File | null | string;
  applicant3ocibackImage: File | null | string;
  applicant3photoImage: File | null | string;
  applicant3AddressProof: File | null | string;
  applicant3AddressProofImage: File | null | string;
  applicant3GST: string;
  applicant3GSTImage: File | null | string;
  applicant3LegalGuardianImage: File | null | string;

  // Applicant 3 Physical Flags
  isPhysicalApplicant3Aadhaar?: boolean;
  isPhysicalApplicant3Pan?: boolean;
  isPhysicalApplicant3Passport?: boolean;
  isPhysicalApplicant3OCI?: boolean;
  isPhysicalApplicant3Image?: boolean;
  isPhysicalApplicant3AddressProof?: boolean;
  isPhysicalApplicant3GST: boolean;
  isPhysicalApplicant3LegalGuardianDoc?: boolean;

  // Applicant 4
  applicant4pan: string;
  applicant4panImage: File | null | string;
  applicant4aadhaar: string;
  applicant4aadhaarImage: File | null | string;
  applicant4aadhaarbackImage: File | null | string;
  applicant4passport: string;
  applicant4passportImage: File | null | string;
  applicant4passportbackImage: File | null | string;
  applicant4oci: string;
  applicant4ociImage: File | null | string;
  applicant4ocibackImage: File | null | string;
  applicant4photoImage: File | null | string;
  applicant4AddressProof: File | null | string;
  applicant4AddressProofImage: File | null | string;
  applicant4GST: string;
  applicant4GSTImage: File | null | string;
  applicant4LegalGuardianImage: File | null | string;

  // Applicant 4 Physical Flags
  isPhysicalApplicant4Aadhaar?: boolean;
  isPhysicalApplicant4Pan?: boolean;
  isPhysicalApplicant4Passport?: boolean;
  isPhysicalApplicant4OCI?: boolean;
  isPhysicalApplicant4Image?: boolean;
  isPhysicalApplicant4AddressProof?: boolean;
  isPhysicalApplicant4GST: boolean;
  isPhysicalApplicant4LegalGuardianDoc?: boolean;

  applicant1isAadhaarVerified: boolean;
  applicant2isAadhaarVerified: boolean;
  applicant3isAadhaarVerified: boolean;
  applicant4isAadhaarVerified: boolean;

  // Common Fields
  signedPdf: string;
  transactions: any;
}
