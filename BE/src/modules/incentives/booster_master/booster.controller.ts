import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { CreateBoosterDto } from './dto/create-booster.dto';
import { BoosterService } from './booster.service';
import { UpdateBoosterDTO } from './dto/update-booster.dto';
import { FilterBoosterDTO } from './dto/filter-booster.dto';
import { RmAdminAuthGuard } from '../../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../../sso/gaurds/roles.gaurd';
import { Roles } from '../../sso/decorators/roles.decorator';
import { RolesEnum } from '../../../enums/roles.enum';

@Controller('boosters')
export class BoosterController {
  constructor(private readonly boosterService: BoosterService) {}

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Post()
  async create(@Body() createBoosterDto: CreateBoosterDto) {
    return await this.boosterService.createBooster(createBoosterDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
  @Get()
  async findBoosters(@Query() filterBoosterDto: FilterBoosterDTO) {
    return await this.boosterService.findBoosters(filterBoosterDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Get('/rewards')
  async getAllRewards() {
    return await this.boosterService.findAllRewards();
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
  @Get('/status')
  async filterStatus() {
    return await this.boosterService.filterStatus();
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Get(':id')
  async findBoosterById(@Param('id') boosterId: number) {
    if (isNaN(boosterId)) {
      throw new BadRequestException('Invalid boosterId. It must be a number.');
    }
    return await this.boosterService.findBoosterById(boosterId);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Put(':id')
  async updateBooster(
    @Param('id') boosterId: number,
    @Body() updateBoosterDto: UpdateBoosterDTO,
  ) {
    if (!boosterId || isNaN(boosterId as any) || boosterId <= 0) {
      throw new BadRequestException('Invalid boosterId. It must be a number.');
    }
    return await this.boosterService.updateBooster(boosterId, updateBoosterDto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Delete(':id')
  async deleteBooster(@Param('id') boosterId: number) {
    if (isNaN(boosterId)) {
      throw new BadRequestException('Invalid boosterId. It must be a number.');
    }
    return await this.boosterService.deleteBooster(boosterId);
  }
}
