import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Body,
  Patch,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { User } from '../../sso/decorators/user.decorator';
import { UpdateBrandDto } from './dto/update_brand.dto';
import { CommonFindAllQueryDto } from 'src/helpers/dto/commonFindAll.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.RM,
    RolesEnum.MIS,
    RolesEnum.BIS,
  )
  @Get()
  async findAllBrands(
    @User() user: any,
    @Query() queryDto: CommonFindAllQueryDto,
  ) {
    const { page, limit, search, sortBy } = queryDto;
    return this.brandsService.findAll(user, page, limit, search, sortBy);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM, RolesEnum.MIS)
  @Get('/findAll')
  async findAllBrandsAdmin() {
    return this.brandsService.findAllBrands();
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM, RolesEnum.MIS)
  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.brandsService.getBrandById(id);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM, RolesEnum.MIS)
  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    return this.brandsService.updateBrand(id, updateBrandDto);
  }
}
