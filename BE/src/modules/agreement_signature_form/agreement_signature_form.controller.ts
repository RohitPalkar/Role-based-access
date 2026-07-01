import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { AgreementSignatureFormService } from './agreement_signature_form.service';
import { AgreementSignatureDto } from './dto/create-form.dto';
import { Roles } from '../sso/decorators/roles.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { User } from '../sso/decorators/user.decorator';
import { InviteesDto } from './dto/update-invitees.dto';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { QueryAgreementSignatureDto } from './dto/query-agreement-signature.dto';
import { UserDto } from './dto/user.dto';
import { InternalSignatoriesResponseDto } from './dto/internal-signatory.dto';
import { SkipDecryption } from 'src/interceptors/decorators/skip-decryption.decorator';
import { SkipEncryption } from 'src/interceptors/decorators/skip-encryption.decorator';
import { UserActivityInterceptor } from 'src/interceptors/user_activity.interceptor';
import { UserActionsEnum } from 'src/enums/event-messages.enum';

@Controller('agreement-signature')
export class AgreementSignatureFormController {
  constructor(
    private readonly agreementSignatureFormService: AgreementSignatureFormService,
  ) {}

  // Creates a new agreement signature form
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.CRM,
    RolesEnum.RM,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
    RolesEnum.PROJECT_HEAD,
  )
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.CREATED, 'agreement-signature'),
  )
  @Post('create-form')
  createForm(
    @Body() dto: AgreementSignatureDto,
    @User() user: any,
  ): Promise<any> {
    return this.agreementSignatureFormService.createForm(dto, user.dbId);
  }

  // Updates an existing agreement signature form
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.CRM,
    RolesEnum.RM,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
    RolesEnum.PROJECT_HEAD,
  )
  @Patch('update-form/:id')
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, 'agreement-signature'),
  )
  updateForm(
    @Param('id') id: number,
    @Body() dto: AgreementSignatureDto,
  ): Promise<any> {
    return this.agreementSignatureFormService.updateForm(id, dto);
  }

  // Updates invitees and sends invitations to external signatories
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, 'agreement-signature'),
  )
  @Post('update-invitees')
  updateInvitees(@Body() dto: InviteesDto): Promise<any> {
    return this.agreementSignatureFormService.updateInvitees(dto);
  }

  // Lists agreement signatures with pagination and filtering for CRM dashboard
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.CRM,
    RolesEnum.RM,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
    RolesEnum.PROJECT_HEAD,
  )
  @Get('list')
  async listAgreementSignatures(
    @Query() query: QueryAgreementSignatureDto,
    @User() user: any,
  ): Promise<any> {
    return this.agreementSignatureFormService.listAgreementSignatures(
      query,
      user,
      false,
    );
  }

  // Fetches internal signatories for dropdown selection
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM)
  @Get('internal-signatories')
  async getInternalSignatories(): Promise<InternalSignatoriesResponseDto> {
    return this.agreementSignatureFormService.getInternalSignatories();
  }

  // Fetches both internal signatories and CRM users for dropdown filters in listing page
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM)
  @Get('dropdown-users')
  async getDropdownUsers(): Promise<any> {
    return this.agreementSignatureFormService.getDropdownUsers();
  }

  // Retrieves a specific agreement signature form by ID
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.CRM,
    RolesEnum.RM,
    RolesEnum.SALES_RSH,
    RolesEnum.SALES_TL,
    RolesEnum.PROJECT_HEAD,
  )
  @Get(':id')
  getForm(@Param('id') id: number): Promise<any> {
    return this.agreementSignatureFormService.getForm(id);
  }

  // Handles webhook notifications for internal signatory events from Leegality
  @Post('/internal-webhook')
  @SkipDecryption()
  @SkipEncryption()
  async handleInternalWebhook(@Body() webhookData: any): Promise<void> {
    return this.agreementSignatureFormService.internalWebhook(webhookData);
  }

  // Handles webhook notifications for external (customer) signatory events from Leegality
  @Post('/external-webhook')
  @SkipDecryption()
  @SkipEncryption()
  async handleExternalWebhook(@Body() webhookData: any): Promise<void> {
    return this.agreementSignatureFormService.externalWebhook(webhookData);
  }

  // Initiates the signing process for internal signatory
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM)
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, 'agreement-signature'),
  )
  @Patch('/sign-internal-signatory/:id')
  async signInternalSignatory(@Param('id') id: number): Promise<void> {
    return this.agreementSignatureFormService.signInternalSignatory(id);
  }

  // Adds a new user to the system with role and project assignments
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM)
  @Post('/add-user')
  async addUser(@Body() dto: UserDto, @User() user: any): Promise<any> {
    return this.agreementSignatureFormService.addUser(dto, user.dbId);
  }

  // Updates an existing user in the system
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM)
  @Patch('/update-user/:id')
  async updateUser(
    @Param('id') id: number,
    @Body() dto: UserDto,
  ): Promise<any> {
    return this.agreementSignatureFormService.updateUser(id, dto);
  }

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM)
  @Get('/export/agreement-list')
  async exportAgreementListing(
    @Query() query: QueryAgreementSignatureDto,
    @User() user: any,
  ): Promise<any> {
    return this.agreementSignatureFormService.exportAgreement(query, user);
  }
}
