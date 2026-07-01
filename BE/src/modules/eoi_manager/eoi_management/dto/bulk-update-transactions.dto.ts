import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Body for finance bulk upload of the reconciled **Transactions** sheet (PE-483).
 * Client uploads the Excel to S3 first; this DTO passes the object key (same pattern as inventory bulk-insert).
 */
export class BulkUpdateTransactionsDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  key: string;
}
