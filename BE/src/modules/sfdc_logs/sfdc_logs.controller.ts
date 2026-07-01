import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventMessagesEnum } from 'src/enums/event-messages.enum';
import { SfdcLogsService } from './sfdc_logs.service';
import { ExposeFields } from 'src/interceptors/decorators/expose-fields-from-response.decorator';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { RolesEnum } from 'src/enums/roles.enum';
import { Roles } from '../sso/decorators/roles.decorator';
import { LogFindAllQueryDto } from './dto/logs_filter.dto';

@Controller('sfdc-logs')
export class SfdcLogsController {
  constructor(private readonly sfdcLogsService: SfdcLogsService) {}

  @OnEvent(EventMessagesEnum.CREATE_SFDC_LOG)
  async handleLogsCreatedEvent(data) {
    this.sfdcLogsService.saveSFDCLogs(data);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @ExposeFields('createdAt')
  @Get()
  async getSfdcLogs(@Query() queryDto: LogFindAllQueryDto): Promise<any> {
    return this.sfdcLogsService.getSfdcLogs(queryDto);
  }

  @UseGuards(RmAdminAuthGuard)
  @Roles(RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @ExposeFields('createdAt')
  @Get(':id')
  async getSfdcLogById(@Param('id') logId: number): Promise<any> {
    return this.sfdcLogsService.getSfdcLogById(logId);
  }
}
