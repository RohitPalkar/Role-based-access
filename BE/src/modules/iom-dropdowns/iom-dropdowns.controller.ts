import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { RmAdminAuthGuard } from '../sso/gaurds/rm-admin-auth.gaurd';
import { RolesGuard } from '../sso/gaurds/roles.gaurd';
import { Roles } from '../sso/decorators/roles.decorator';
import { User } from '../sso/decorators/user.decorator';
import { RolesEnum } from 'src/enums/roles.enum';

import { AuthenticatedUser } from '../iom/services/iom-validation.service';
import { DropdownQueryDto } from './dto/dropdown-query.dto';
import { IomDropdownService } from './iom-dropdowns.service';

/**
 * IOM dropdown HTTP surface.
 *
 * Single endpoint (`POST /iom-dropdowns`) returns the catalog the FE
 * needs for a given `type`. Body-discriminated rather than path /
 * query because the spec calls for it in the request payload and it
 * keeps the URL stable when new dropdown types are added later.
 *
 * Authorisation matches the IOM listing endpoint — every role that
 * can see an IOM screen also needs the dropdowns to render it.
 * Admins inherit access via the same guard list. The strict
 * `ValidationPipe` rejects extra keys so a malformed FE payload
 * cannot leak unintended fields into the service.
 */
@Controller('iom-dropdowns')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  }),
)
export class IomDropdownController {
  constructor(private readonly dropdownService: IomDropdownService) {}

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
  @Post()
  async getDropdown(
    @User() user: AuthenticatedUser,
    @Body() body: DropdownQueryDto,
  ) {
    const result =
      body.type.length === 1
        ? await this.dropdownService.resolve(body.type[0], user)
        : await this.dropdownService.resolveMany(body.type, user);
    return { data: result };
  }
}
