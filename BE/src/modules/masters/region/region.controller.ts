import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { RegionService } from './region.service';
import { RolesEnum } from 'src/enums/roles.enum';
import { RmAdminAuthGuard } from 'src/modules/sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from 'src/modules/sso/gaurds/roles.gaurd';
import { Roles } from 'src/modules/sso/decorators/roles.decorator';
import { CreateUpdateRegionDto } from './dto/create-update-region.dto';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';

@Controller('regions')
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Post()
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async create(@Body() dto: CreateUpdateRegionDto) {
    return this.regionService.create(dto);
  }

  @Get()
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async findAll(@Query() query: CommonFindAllQueryDto) {
    const page = query.page ? Number(query.page) : undefined;
    const limit = query.limit ? Number(query.limit) : undefined;
    return this.regionService.findAll({
      page,
      limit,
      search: query.search,
      sortBy: query.sortBy,
    });
  }
  @Get('dropdown')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM, RolesEnum.MIS)
  async dropdown() {
    return this.regionService.getDropdown();
  }

  @Get(':id')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.regionService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateUpdateRegionDto,
  ) {
    return this.regionService.update(id, dto);
  }

  // soft delete
  @Post(':id/delete')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.regionService.softDelete(id);
  }
}
