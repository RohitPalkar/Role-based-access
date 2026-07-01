export class InternalSignatoryDto {
  id: number;
  name: string;
  email: string;
  contactNumber: string | null;
}

export class InternalSignatoriesResponseDto {
  success: boolean;
  message: string;
  data: InternalSignatoryDto[];
}
