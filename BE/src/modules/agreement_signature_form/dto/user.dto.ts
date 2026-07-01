import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
  ArrayMinSize,
  ArrayMaxSize,
  IsPositive,
  IsInt,
} from 'class-validator';
import { IsNotEmptyTrimmed } from 'src/validations/common-validator/isNotEmptyTrimmed.validator';
import { PHONE_REGEX } from 'src/config/constants';

export class UserDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Employee code must be at least 3 characters long' })
  @MaxLength(20, { message: 'Employee code cannot exceed 20 characters' })
  empCode?: string;

  @IsNotEmptyTrimmed()
  @MaxLength(5, { message: 'Country Code is too long.' })
  countryCode: string;

  @IsNotEmptyTrimmed()
  @Matches(PHONE_REGEX, {
    message: 'Please enter a valid contact number.',
  })
  contactNumber: string;

  @IsNumber()
  @IsInt({ message: 'Role must be an integer' })
  @IsPositive({ message: 'Role must be a positive number' })
  role: number;

  @IsOptional()
  @IsNumber()
  @IsInt({ message: 'Reporting to must be an integer' })
  @IsPositive({ message: 'Reporting to must be a positive number' })
  reportingTo?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0, { message: 'Projects assigned cannot be empty array' })
  @ArrayMaxSize(10, { message: 'Cannot assign more than 10 projects' })
  @IsNumber({}, { each: true, message: 'Each project ID must be a number' })
  @IsPositive({
    each: true,
    message: 'Each project ID must be a positive number',
  })
  crmProjects?: number[];

  @IsBoolean()
  isSignatory: boolean = false;

  @IsOptional()
  @IsNumber()
  @IsInt({ message: 'Department must be an integer' })
  @IsPositive({ message: 'Department must be a positive number' })
  department?: number;

  @IsBoolean()
  getOfficeUseMail: boolean = false;
}
