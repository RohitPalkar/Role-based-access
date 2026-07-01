import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { SfdcService } from '../sfdc/sfdc.service';
import { UpdateUserDTO } from './dto/update-user-dto';
import { GetAllUserDTO } from './dto/get-all-users.dto';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { User } from '../sso/decorators/user.decorator';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { Roles } from '../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { logger } from 'src/logger/logger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { File } from 'multer';
import { UPLOAD_LIMIT } from 'src/config/constants';
import * as path from 'path';
import { logsAndErrorHandling } from 'src/utils/errorLogHandler';
import { UserActivityInterceptor } from 'src/interceptors/user_activity.interceptor';
import { UserActionsEnum } from 'src/enums/event-messages.enum';
import { UserAvailabilityService } from './services/user-availability.service';
import { MarkUnavailableDto } from './dto/mark-unavailable.dto';
import { MarkAvailableDto } from './dto/mark-available.dto';
import { ListTeamAvailabilityDto } from './dto/list-team-availability.dto';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly sfdcService: SfdcService,
    private readonly userAvailabilityService: UserAvailabilityService,
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
  ) {}

  @Get('refresh')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async refreshData() {
    try {
      const cachedData = await this.cacheService.get<any>('userflag');
      if (cachedData) {
        return {
          message: 'User Processing already in progress',
        };
      }

      await this.cacheService.set('userflag', true, {
        ttl: 60 * 1000,
      } as any);
      // Call the external API to retrieve users
      const response = await this.sfdcService.getUsers();

      // Check if the response contains valid user data
      // Optional chaining + Logger
      if (!response?.data?.length) {
        logger.error('User data not found from the external API.');
        return { message: 'List updated successfully' };
      }

      const users: CreateUserDto[] = response.data;

      // Pass the retrieved users to the user service for further processing
      return await this.userService.refreshData(users);
    } catch (error) {
      logsAndErrorHandling(
        'An unexpected error occurred while refreshing data',
        error,
        null,
      );
    }
  }

  @Get('rm-dropdown')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
    RolesEnum.BIS,
    RolesEnum.RM,
    RolesEnum.FINANCE_ADMIN,
    RolesEnum.MIS,
    RolesEnum.CRM,
    RolesEnum.GRE,
    RolesEnum.SALES_BH,
    RolesEnum.PROJECT_HEAD,
  )
  async getRmUsers(@Query('search') search?: string) {
    return await this.userService.getRmUsers(search);
  }

  @Get('/exports')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async exportUsers(@Query() query: GetAllUserDTO) {
    return this.userService.exportUsers({
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      brandUserId: query.brandId,
      groupUserId: +query.groupId,
      status: query.status,
      role: +query.role,
    });
  }

  @Get()
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.BIS)
  async getAllUser(@Query() query: GetAllUserDTO) {
    return this.userService.getAllUser({
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      brandUserId: query.brandId,
      groupUserId: +query.groupId,
      status: query.status,
      role: +query.role,
    });
  }

  @Get('/group-assignments/:userId')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  async getUserGroupAssignments(
    @Param('userId') userId: number,
    @Query()
    query: { page: number; limit: number; search: string },
  ): Promise<any> {
    return this.userService.getUserGroupAssignments(userId, query);
  }

  @Get('/details')
  @UseGuards(RmAdminAuthGuard)
  async getUserDetails(@User() user: any): Promise<any> {
    return await this.userService.getLoggedInUserDetails(user);
  }
  @Patch('/update-signature')
  @UseGuards(RmAdminAuthGuard)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.UPDATED, 'users'))
  async updateUserProfile(
    @User() user: any,
    @Body('signatureImage') signatureImage: string,
  ): Promise<any> {
    return await this.userService.updateUserProfile(user, { signatureImage });
  }

  @UseGuards(RmAdminAuthGuard)
  @Get('/sfdc-users')
  async searchUserList(@Query('username') userName: string): Promise<any> {
    return this.sfdcService.searchUserList(userName);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.GRE,
    RolesEnum.RM,
    RolesEnum.MIS,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
  )
  @Get('/sales-team-dropdown')
  async getSalesTeamDropdown(
    @Query('role') role: string,
    @Query('search') search: string,
  ): Promise<any> {
    return this.userService.getSalesTeamDropdown(role, search);
  }

  @Get(':id')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.MIS, RolesEnum.CRM)
  findOne(@Param('id') id: number): Promise<any> {
    return this.userService.findOne(id);
  }

  @Get('filters/groups')
  @UseGuards(RmAdminAuthGuard)
  async findProjectGroups() {
    return await this.userService.findProjectGroups();
  }

  @Patch(':id')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN, RolesEnum.RM)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.UPDATED, 'users'))
  async updateUserDetails(
    @Param('id') id: number,
    @Body() userData: UpdateUserDTO,
  ) {
    return await this.userService.updateUserDetails(id, userData);
  }

  @Post()
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.SUPER_ADMIN)
  @UseInterceptors(UserActivityInterceptor(UserActionsEnum.CREATED, 'users'))
  async createUser(@Body() userData: CreateUserDto) {
    return await this.userService.createUser(userData);
  }

  @Post('extract-signature')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.ADMIN,
    RolesEnum.SUPER_ADMIN,
    RolesEnum.RM,
    RolesEnum.FINANCE_HEAD,
    RolesEnum.FINANCE_USER,
    RolesEnum.CRM,
    RolesEnum.CRM_TL,
    RolesEnum.CRM_HEAD,
    RolesEnum.LOYALTY,
  )
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: UPLOAD_LIMIT,
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|jpg|webp)$/)) {
          return cb(
            new BadRequestException(
              'Only image files (jpeg/png/jpg/webp) are allowed!',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async extractSignature(
    @UploadedFile('file') file: File,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.userService.extractSignature(file);
      const base64 = buffer.toString('base64');
      const originalName = file.originalname;
      const baseName = path.parse(originalName).name;
      const newFileName = `${baseName}.png`;

      return res.status(200).json({
        filename: newFileName || 'signature.png',
        success: true,
        message: 'Signature extracted successfully',
        data: base64,
      });
    } catch (error) {
      logger.error('Error extracting signature:', error);
      throw new InternalServerErrorException(
        'An error occurred while extracting the signature.',
      );
    }
  }

  @Post('availability/unavailable')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM_TL)
  async markUnavailable(
    @User() user: { dbId: number },
    @Body() dto: MarkUnavailableDto,
  ) {
    await this.userAvailabilityService.markUnavailable(user, dto);
    return { message: 'User availability updated' };
  }

  // curl -X POST "$BASE/api/users/availability/available" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"userId": 101}'
  @Post('availability/available')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM_TL)
  async markAvailable(
    @User() user: { dbId: number },
    @Body() dto: MarkAvailableDto,
  ) {
    await this.userAvailabilityService.markAvailable(user, dto);
    return { message: 'User availability updated' };
  }

  // curl -X GET "$BASE/api/users/team/availability" -H "Authorization: Bearer $TOKEN"
  @Get('team/availability')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM_TL)
  async getTeamAvailability(
    @User() user: { dbId: number },
    @Query() query: ListTeamAvailabilityDto,
  ) {
    const result = await this.userAvailabilityService.getTeamAvailability(
      user,
      query,
    );
    return { data: result };
  }

  // for export teams availability
  @Get('team/availability/export')
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM_TL)
  async exportTeamAvailability(
    @User() user: { dbId: number },
    @Query() query: ListTeamAvailabilityDto,
  ) {
    return await this.userAvailabilityService.exportTeamAvailability(
      user,
      query,
    );
  }
}
