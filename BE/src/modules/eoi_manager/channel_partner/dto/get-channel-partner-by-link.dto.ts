import { IsString, IsNotEmpty } from 'class-validator';

export class GetChannelPartnerByLinkQueryDto {
  @IsString()
  @IsNotEmpty()
  linkId: string;
}
