import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateIncentivePolicyDto } from './dto/create_incentive_policy.dto';
import { IncentivePolicyService } from './incentive_policy.service';
import { UpdateIncentivePolicyDto } from './dto/update_incentive_policy.dto';
import { RolesEnum } from 'src/enums/roles.enum';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { User } from '../../sso/decorators/user.decorator';
import { GetAllPolicyDto } from './dto/get-all-policy.dto';

@Controller('incentive-policies')
export class IncentivePolicyController {
  constructor(
    private readonly incentivePolicyService: IncentivePolicyService,
  ) {}

  // Create a new Incentive Structure
  @Post()
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async create(@Body() createIncentivePolicyDto: CreateIncentivePolicyDto) {
    return await this.incentivePolicyService.create(createIncentivePolicyDto);
  }

  // Get projects filtered by brand and multiple city IDs
  @Get('/unmapped-projects-dropdown')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM, RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.MIS)
  async findProjectsByBrandAndCity(
    @Query('brandId') brandId?: string,
    @Query('cityIds') cityIds?: string,
  ) {
    return await this.incentivePolicyService.findProjectsByBrandAndCity(
      brandId,
      cityIds,
    );
  }

  @Get()
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
  async getAllPolicies(@Query() query: GetAllPolicyDto) {
    return this.incentivePolicyService.getAllPolicies({
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      status: query.status,
      brandId: query.brandId,
      regionIds: query.regionIds,
      startDate: query.startDate,
      endDate: query.endDate,
      groupId: query.groupId,
    });
  }

  //Retrieve a specific Incentive Structure by ID
  @Get(':id')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async findOne(@Param('id') id: number) {
    return this.incentivePolicyService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async update(
    @Param('id') id: number,
    @Body() updateIncentivePolicyDto: UpdateIncentivePolicyDto,
  ) {
    return this.incentivePolicyService.update(id, updateIncentivePolicyDto);
  }

  @Get('/incentive/slabs-boosters')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.RM)
  async getIncentiveSlabsAndBoosters(@User() user: any) {
    return await this.incentivePolicyService.getIncentiveSlabsAndBoosters(user);
  }
}
