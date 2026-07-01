import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  Length,
  IsDateString,
  IsArray,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  Id: string;

  @IsString({ message: 'Name must be a valid string.' })
  @Length(3, 255, { message: 'Name must be between 3 and 255 characters.' })
  Name: string;

  @IsString()
  Username: string;

  @IsEmail({}, { message: 'Invalid email format.' })
  Email: string;

  @IsString()
  empCode: string;

  @IsString()
  Company: string; // Maps to "Brand" table

  @IsString()
  @IsOptional()
  City?: string; // Maps to "City" table

  @IsString()
  profileName: string; // Maps to "Role" table

  @IsString()
  departmentName: string; // Determines "Group"

  @IsNumber()
  @IsOptional()
  role?: number; // Will be assigned dynamically

  @IsOptional()
  @IsNumber()
  groupId?: number;

  @IsOptional()
  @IsDateString()
  groupStartDate?: string;

  @IsOptional()
  @IsDateString()
  groupEndDate?: string;

  @IsOptional()
  @IsArray()
  regionIds?: number[];
}
