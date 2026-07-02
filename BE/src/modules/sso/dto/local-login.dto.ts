import { IsString, MinLength, MaxLength, IsEmail, IsOptional } from 'class-validator';

export class LocalLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  usernameOrEmail: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}