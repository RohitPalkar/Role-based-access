import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { ProjectUserMapping } from 'src/entities';
import { IomStatus } from '../iom/entities/iom-status.entity';
import { AuthenticatedUser } from '../iom/services/iom-validation.service';

import { DropdownTypeEnum } from './enums/dropdown-type.enum';

/**
 * One item in any dropdown response. Shape is intentionally uniform
 * across all `type`s so a single FE component can render any list.
 *
 *  - `value` is the canonical machine code the FE should send back on
 *    submit (status `code`, adjustment slug, invoice status slug,
 *    or numeric `project.id`). `string | number` because project ids
 *    are numeric primary keys in the DB and the FE treats them as
 *    numbers everywhere else (see `IomListItem.projectId`).
 *  - `label` is the human-readable text.
 *  - `sequence` is only populated for ordered DB-driven dropdowns
 *    (`IomStatus`); it lets the FE render the workflow in deterministic
 *    order without re-sorting.
 */
export interface DropdownItem {
  value: string | number;
  label: string;
  sequence?: number;
}

export interface DropdownResponse {
  type: DropdownTypeEnum;
  items: DropdownItem[];
}

/**
 * Static catalog for `adjustmentType`. The IOM workflow does not have
 * a DB master for this today; the values come from the business spec
 * (1:1 / 2:0 / 0:2 / Other). Listed here so adding a new option is a
 * one-file change and the values are version-controlled with the API.
 */
const ADJUSTMENT_TYPE_ITEMS: ReadonlyArray<DropdownItem> = [
  { value: '1:1', label: '1:1' },
  { value: '2:0', label: '2:0' },
  { value: '0:2', label: '0:2' },
  { value: 'Other', label: 'Other' },
];

/**
 * Static catalog for `InvoiceStatus`. `iom_invoice_details.status` is
 * a free-text column today, so the canonical labels for the dropdown
 * live here. Order matches the invoice lifecycle (Pending → Created
 * → Submitted) so the FE can render it as a progress strip.
 */
const INVOICE_STATUS_ITEMS: ReadonlyArray<DropdownItem> = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Invoice Created', label: 'Invoice Created' },
  { value: 'Invoice Submitted', label: 'Invoice Submitted' },
];

/**
 * Service for the IOM dropdown endpoint.
 *
 * Single public method (`resolve`) dispatches on the `type`
 * discriminator. `IomStatus` and `projects` are read live from the
 * DB so they always match the workflow seed / project master; the
 * other two types are returned from in-memory catalogs.
 *
 * The `default` branch exists purely as defence-in-depth — the DTO's
 * `@IsEnum` already rejects unknown types — and throws `BadRequest`
 * rather than `InternalServerError` so a stale FE build sees a clean
 * 400.
 */
@Injectable()
export class IomDropdownService {
  constructor(
    @InjectRepository(IomStatus)
    private readonly iomStatusRepo: Repository<IomStatus>,
    @InjectRepository(ProjectUserMapping)
    private readonly projectUserMappingRepo: Repository<ProjectUserMapping>,
  ) {}

  async resolve(
    type: DropdownTypeEnum,
    user: AuthenticatedUser,
  ): Promise<DropdownResponse> {
    switch (type) {
      case DropdownTypeEnum.IOM_STATUS:
        return { type, items: await this.getIomStatuses() };
      case DropdownTypeEnum.ADJUSTMENT_TYPE:
        return { type, items: [...ADJUSTMENT_TYPE_ITEMS] };
      case DropdownTypeEnum.INVOICE_STATUS:
        return { type, items: [...INVOICE_STATUS_ITEMS] };
      case DropdownTypeEnum.PROJECTS:
        return { type, items: await this.getProjects(user) };
      default:
        throw new BadRequestException(
          `Unsupported dropdown type: ${type as string}`,
        );
    }
  }

  async resolveMany(
    types: DropdownTypeEnum[],
    user: AuthenticatedUser,
  ): Promise<DropdownResponse[]> {
    const uniqueTypes = [...new Set(types)];

    return Promise.all(uniqueTypes.map((type) => this.resolve(type, user)));
  }

  /**
   * Reads non-deleted IOM statuses from the master, ordered by
   * `sequence` so the FE renders them in workflow order
   * (IOM_TO_BE_CREATED → IOM_CLOSED). Soft-deleted rows
   * (`is_deleted = 1`) are excluded.
   */
  private async getIomStatuses(): Promise<DropdownItem[]> {
    const rows = await this.iomStatusRepo.find({
      where: { isDeleted: 0 },
      order: { sequence: 'ASC' },
    });

    return rows.map((row) => ({
      value: row.code,
      label: row.label,
      sequence: row.sequence,
    }));
  }

  /**
   * Returns the projects the authenticated user has access to via
   * `project_user_mapping`. Active rows are those with
   * `removed_at IS NULL`. The same user may map to the same project
   * under multiple roles (e.g. CRM + CRM TL); rows are de-duplicated
   * by project id before being returned.
   *
   * Mirrors `IomListingService.resolveUserProjects` so the dropdown
   * always offers exactly the project set the listing / filter API
   * will return for the same caller. No special-casing for ADMIN -
   * the IOM module already requires admins to be mapped via the same
   * table, and this dropdown stays consistent with that contract.
   *
   * Returning an empty array is a valid outcome (caller has no
   * project mappings) and is preferred over a 403 so the FE can
   * render an empty-state without a broken filter.
   */
  private async getProjects(user: AuthenticatedUser): Promise<DropdownItem[]> {
    if (user?.dbId == null) {
      return [];
    }

    const mappings = await this.projectUserMappingRepo.find({
      where: {
        user: { id: user.dbId },
        removedAt: IsNull(),
      },
      relations: ['project'],
    });

    const seen = new Map<number, DropdownItem>();
    for (const mapping of mappings) {
      const project = mapping.project;
      if (project?.id == null || !project.name) {
        continue;
      }
      const id = Number(project.id);
      if (!seen.has(id)) {
        seen.set(id, { value: id, label: project.name });
      }
    }

    return Array.from(seen.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }
}
