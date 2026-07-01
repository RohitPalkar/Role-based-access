import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Submit endpoint takes no editable body fields (the edit endpoint owns
 * mutations). An optional remark is accepted purely to enrich the
 * history-log entry written by IomHistoryListener.
 */
export class SubmitIomDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
