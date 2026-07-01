import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';

import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { Roles } from '../sso/decorators/roles.decorator';
import { User } from '../sso/decorators/user.decorator';
import { RolesEnum } from 'src/enums/roles.enum';
import { UserActivityInterceptor } from 'src/interceptors/user_activity.interceptor';
import { UserActionsEnum } from 'src/enums/event-messages.enum';

import { IomCrmService } from './services/iom-crm.service';
import { IomEligibilityService } from './services/iom-eligibility.service';
import { IomRejectService } from './services/iom-reject.service';
import { IomApproveService } from './services/iom-approve.service';
import { IomCancelService } from './services/iom-cancel.service';
import { IomListingService } from './services/iom-listing.service';
import { IomAssignmentService } from './services/iom-assignment.service';
import { IomExportService } from './services/iom-export.service';
import { IomLoyaltyDetailsService } from './services/iom-loyalty-details.service';
import { IomLoyaltyUploadService } from './services/iom-loyalty-upload.service';
import { IomAgeingService } from './services/iom-ageing.service';
import { AuthenticatedUser } from './services/iom-validation.service';

import { ListIomListingDto } from './dto/list-iom-listing.dto';
import { ExportIomExcelDto } from './dto/export-iom-excel.dto';
import { GenerateIomDto } from './dto/generate-iom.dto';
import { EditIomDto } from './dto/edit-iom.dto';
import { SubmitIomDto } from './dto/submit-iom.dto';
import { RejectIomDto } from './dto/reject-iom.dto';
import { ApproveIomDto } from './dto/approve-iom.dto';
import { CancelIomDto } from './dto/cancel-iom.dto';
import { UploadLoyaltyPointsDto } from './dto/upload-loyalty-points.dto';

/**
 * IOM activity-log entity name. Matches the DB table `ioms` and the
 */
const IOM_ACTIVITY_ENTITY = 'IOM_ACTIVITY';

/**
 * IOM HTTP surface.
 *
 * Routes are role-scoped per-handler via `@Roles(...)`, not at the
 * class level. The majority belong to the CRM author flow; the
 * approval + rejection routes are open to the four reviewer roles
 * (CRM TL, CRM Head, Finance User, Finance Head) - the active stage
 * is derived from the caller's role inside the relevant service.
 * Project-level authorisation happens inside the services - the
 * controller never trusts caller-supplied ids without re-checking
 * against `req.user.crmProjects`.
 *
 * Validation pipe is scoped to the controller with the strict settings
 * the spec requires (`whitelist` + `forbidNonWhitelisted`). The
 * IomValidationService re-checks the whitelist in the service layer
 * for defence in depth.
 
 */
@Controller('iom')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  }),
)
export class IomController {
  constructor(
    private readonly crmService: IomCrmService,
    private readonly eligibilityService: IomEligibilityService,
    private readonly rejectService: IomRejectService,
    private readonly approveService: IomApproveService,
    private readonly cancelService: IomCancelService,
    private readonly iomListingService: IomListingService,
    private readonly assignmentService: IomAssignmentService,
    private readonly iomExportService: IomExportService,
    private readonly loyaltyDetailsService: IomLoyaltyDetailsService,
    private readonly loyaltyUploadService: IomLoyaltyUploadService,
    private readonly ageingService: IomAgeingService,
  ) {}

  // ---- 1. Listing (eligible bookings or persisted IOMs) -----------------
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.CRM,
    RolesEnum.CRM_TL,
    RolesEnum.CRM_HEAD,
    RolesEnum.FINANCE_USER,
    RolesEnum.FINANCE_HEAD,
    RolesEnum.LOYALTY,
    RolesEnum.ADMIN,
  )
  @Get('listing')
  async list(
    @User() user: AuthenticatedUser,
    @Query() query: ListIomListingDto,
  ) {
    const iomList = await this.iomListingService.findIoms(user, query);
    return { data: iomList };
  }

  // ---- 1b. Export IOM list to Excel ------------------------------------
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.CRM,
    RolesEnum.CRM_TL,
    RolesEnum.CRM_HEAD,
    RolesEnum.FINANCE_USER,
    RolesEnum.FINANCE_HEAD,
    RolesEnum.LOYALTY,
    RolesEnum.ADMIN,
  )
  @Post('export/excel')
  async exportExcel(
    @User() user: AuthenticatedUser,
    @Body() dto: ExportIomExcelDto,
  ) {
    return this.iomExportService.exportToExcel(user, dto);
  }

  // ---- 2. Assign eligible IOMs (round-robin) ----------------------------
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.ADMIN)
  @Post('assign')
  async assignEligibleIoms() {
    const result = await this.assignmentService.assignEligibleIoms();
    return { data: result };
  }

  // ---- 3. View IOM ------------------------------------------------------
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.CRM,
    RolesEnum.CRM_TL,
    RolesEnum.CRM_HEAD,
    RolesEnum.FINANCE_USER,
    RolesEnum.FINANCE_HEAD,
    RolesEnum.LOYALTY,
    RolesEnum.ADMIN,
  )
  @Get(':id')
  async getIom(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const result = await this.crmService.getIom(user, id);
    return { data: result };
  }

  // ---- 3. View IOM PDF --------------------------------------------------
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.CRM,
    RolesEnum.CRM_TL,
    RolesEnum.CRM_HEAD,
    RolesEnum.FINANCE_USER,
    RolesEnum.FINANCE_HEAD,
    RolesEnum.LOYALTY,
    RolesEnum.ADMIN,
  )
  @Get(':id/pdf')
  async getIomPdf(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const resp = await this.crmService.getIomPdf(id, user);
    return { data: resp };
  }

  // ---- 3c. Loyalty details (Pinelab verification + payment breakdown) -----
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.CRM,
    RolesEnum.CRM_TL,
    RolesEnum.CRM_HEAD,
    RolesEnum.FINANCE_USER,
    RolesEnum.FINANCE_HEAD,
    RolesEnum.LOYALTY,
    RolesEnum.ADMIN,
  )
  @Get(':id/loyalty-details')
  async getLoyaltyDetails(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const result = await this.loyaltyDetailsService.getLoyaltyDetails(user, id);
    return { data: result };
  }

  // Upload loyalty points to Pinelab — restricted to Loyalty / Admin / Super Admin only.
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.LOYALTY, RolesEnum.ADMIN, RolesEnum.SUPER_ADMIN)
  @Post(':id/loyalty-points/upload')
  async uploadLoyaltyPoints(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadLoyaltyPointsDto,
  ) {
    const result = await this.loyaltyUploadService.uploadLoyaltyPoints(
      user,
      id,
      dto,
    );
    return { data: result };
  }
  // ---- 3d. IOM Ageing / Workflow Timeline --------------------------------
  // Returns the per-IOM summary + ordered transition timeline used by the
  // workflow visualisation on the IOM detail screen. Read-only; thin
  // controller defers all sourcing/sorting/duration math to
  // `IomAgeingService`. The service re-checks project access via
  // `IomValidationService.assertProjectAccess`, so the RolesGuard list
  // mirrors the other viewer endpoints (`GET /:id`, `GET /:id/pdf`).
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.CRM,
    RolesEnum.CRM_TL,
    RolesEnum.CRM_HEAD,
    RolesEnum.FINANCE_USER,
    RolesEnum.FINANCE_HEAD,
    RolesEnum.LOYALTY,
    RolesEnum.ADMIN,
  )
  @Get(':id/ageing')
  async getAgeingTimeline(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const result = await this.ageingService.getAgeingTimeline(user, id);
    return { data: result };
  }

  // ---- 4. Generate IOM --------------------------------------------------
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM, RolesEnum.ADMIN)
  @Post('generate')
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.CREATED, IOM_ACTIVITY_ENTITY),
  )
  async generate(@User() user: AuthenticatedUser, @Body() dto: GenerateIomDto) {
    return this.crmService.generateIom(user, dto);
  }

  // ---- 5. Edit IOM (draft / submit / resubmit) --------------------------
  // Restricted to CRM authors (plus ADMIN as a backdoor for ops).
  // The service additionally enforces project-level access via
  // `IomValidationService.assertProjectAccess`, so a CRM user who
  // isn't mapped to the IOM's project cannot edit it even though
  // their role passes the guard.
  //
  // `dto.action` controls the lifecycle outcome:
  //   - `submit`   – edit + transition to CRM_TL_APPROVAL_PENDING (first submit).
  //   - `draft`    – save without submitting; status becomes DRAFT.
  //   - `resubmit` – edit + resubmit from DRAFT or a rejection state.
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM, RolesEnum.ADMIN, RolesEnum.CRM_TL)
  @Patch(':id')
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, IOM_ACTIVITY_ENTITY),
  )
  async editIom(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditIomDto,
    @Req() req: Request,
  ) {
    const iom = await this.crmService.editIom(user, id, dto, req.body ?? {});
    const messages: Record<typeof dto.action, string> = {
      submit: 'IOM updated and submitted for TL approval successfully',
      draft: 'IOM saved as draft successfully',
      resubmit: 'IOM updated and resubmitted for TL approval successfully',
    };
    return { data: iom, message: messages[dto.action] };
  }

  // ---- 6. Submit IOM (CRM → TL) ----------------------------------------
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM, RolesEnum.ADMIN)
  @Post(':id/submit')
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, IOM_ACTIVITY_ENTITY),
  )
  async submitIom(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitIomDto,
  ) {
    return this.crmService.submitIom(user, id, dto);
  }

  // ---- 7. Resubmit IOM (after rejection) -------------------------------
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM, RolesEnum.ADMIN)
  @Post(':id/resubmit')
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, IOM_ACTIVITY_ENTITY),
  )
  async resubmitIom(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitIomDto,
  ) {
    return this.crmService.resubmitIom(user, id, dto);
  }

  // ---- 7. Reject IOM (reviewer stages) ----------------------------------
  // Stage is derived from the caller's role inside IomRejectService.
  // RolesGuard only gates *who may attempt the call*; the service is
  // the authoritative gate on *what they may do* (via the DB-driven
  // WorkflowValidationService and maker-checker rules).
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.CRM_TL,
    RolesEnum.CRM_HEAD,
    RolesEnum.FINANCE_USER,
    RolesEnum.FINANCE_HEAD,
  )
  @Post(':id/reject')
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, IOM_ACTIVITY_ENTITY),
  )
  async rejectIom(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectIomDto,
  ) {
    return this.rejectService.rejectIom(user, id, dto);
  }

  // ---- 8. Approve IOM (reviewer stages) --------------------------------
  // Mirrors `rejectIom`: stage is derived from the caller's role inside
  // `IomApproveService`. RolesGuard only gates *who may attempt the
  // call*; the service is the authoritative gate on *what they may do*
  // (via the DB-driven WorkflowValidationService and maker-checker
  // rules). On success, the service fires an in-app + email
  // notification to the next approver (creator + prior approvers in
  // CC), or to the creator at the final stage.
  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(
    RolesEnum.CRM_TL,
    RolesEnum.CRM_HEAD,
    RolesEnum.FINANCE_USER,
    RolesEnum.FINANCE_HEAD,
  )
  @Post(':id/approve')
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, IOM_ACTIVITY_ENTITY),
  )
  async approveIom(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveIomDto,
  ) {
    return this.approveService.approveIom(user, id, dto);
  }

  // ---- 9. Delete IOM (CRM only, before TL action) -----------------------

  @UseGuards(RmAdminAuthGuard, RolesGuard)
  @Roles(RolesEnum.CRM, RolesEnum.CRM_TL, RolesEnum.ADMIN)
  @Post(':id/delete')
  @UseInterceptors(
    UserActivityInterceptor(UserActionsEnum.UPDATED, IOM_ACTIVITY_ENTITY),
  )
  async deleteIom(
    @User() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelIomDto,
  ) {
    const iom = await this.cancelService.deleteIom(user, id, dto);
    return { data: iom, message: 'IOM deleted successfully' };
  }
}
