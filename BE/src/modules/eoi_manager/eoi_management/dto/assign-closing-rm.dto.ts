import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class AssignClosingRmDto {
  @IsNotEmpty({ message: 'Voucher ID is required' })
  @IsNumber({}, { message: 'Voucher ID must be a valid number' })
  @IsPositive({ message: 'Voucher ID must be a positive number' })
  id: number;

  @IsNotEmpty({ message: 'Closing RM ID is required' })
  @IsNumber({}, { message: 'Closing RM ID must be a valid number' })
  @IsPositive({ message: 'Closing RM ID must be a positive number' })
  closingRmId: number;

  @IsNotEmpty({ message: 'Sourcing RM ID is required' })
  @IsNumber({}, { message: 'Sourcing RM ID must be a valid number' })
  @IsPositive({ message: 'Sourcing RM ID must be a positive number' })
  sourcingRmId: number;
}
