import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ChannelPartnerService } from './channel_partner.service';
import { CreateChannelPartnerDto } from './dto/create-channel-partner.dto';
import { QueryChannelPartnerDto } from './dto/query-channel-partner.dto';
import { CpDropdownQueryDto } from './dto/cp-dropdown-query.dto';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { RolesEnum } from 'src/enums/roles.enum';
import { User } from '../../sso/decorators/user.decorator';
import { ExposeFields } from 'src/interceptors/decorators/expose-fields-from-response.decorator';

@Controller('channel-partners')
export class ChannelPartnerController {
  constructor(private readonly channelPartnerService: ChannelPartnerService) {}

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.RM,
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
  )
  @ExposeFields('createdAt')
  @Get()
  async getAll(
    @User() user: any,
    @Query() queryDto: QueryChannelPartnerDto = {},
  ) {
    return this.channelPartnerService.findAll(user, queryDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Post('/create-link')
  async create(
    @Body() dto: CreateChannelPartnerDto,
    @User() user: any,
  ): Promise<any> {
    return this.channelPartnerService.create(dto, user.dbId);
  }

  @Get('/get-by-link')
  async getChannelPartnerByLink(@Query('linkId') linkId: string) {
    return this.channelPartnerService.findByLinkId(linkId);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Get('dropdown')
  async cpDropdown(@User() user: any, @Query() queryDto: CpDropdownQueryDto) {
    return await this.channelPartnerService.cpDropdown(user, queryDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  @Get(':id')
  async getById(@Param('id') id: number) {
    return this.channelPartnerService.findOne(id);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.RM,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
  )
  @Get('export/cp-listing')
  async exportCPListing(
    @User() user: any,
    @Query() queryDto: QueryChannelPartnerDto = {},
  ) {
    return await this.channelPartnerService.exportChannelPartners(
      user,
      queryDto,
    );
  }
}
