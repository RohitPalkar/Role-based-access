import { IsNotEmpty, IsString } from 'class-validator';
import { CreateVoucherFormDto } from 'src/modules/eoi_manager/eoi_management/dto/create-voucher-form.dto';

export class CreateCpVoucherFormDto extends CreateVoucherFormDto {
  @IsNotEmpty()
  @IsString()
  channelPartnerLinkId: string;
}
