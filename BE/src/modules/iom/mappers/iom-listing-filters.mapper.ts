import { BadRequestException } from '@nestjs/common';

import { ExportIomExcelDto } from '../dto/export-iom-excel.dto';
import { ListIomListingDto } from '../dto/list-iom-listing.dto';
import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';
import { IomListingFilters } from '../types/iom-listing-filters.interface';
import { normalizeDate } from 'src/helpers/date.helper';

export function parseIomStatuses(values: string[]): IomStatusCodeEnum[] {
  const validStatuses = Object.values(IomStatusCodeEnum);
  const trimmed = values.map((value) => value.trim()).filter(Boolean);

  const invalid = trimmed.filter(
    (status) => !validStatuses.includes(status as IomStatusCodeEnum),
  );

  if (invalid.length) {
    throw new BadRequestException(
      `Invalid iomStatus values: ${invalid.join(', ')}. Valid values: ${validStatuses.join(', ')}`,
    );
  }

  return trimmed as IomStatusCodeEnum[];
}

function dedupeNumbers(values: number[]): number[] {
  return [...new Set(values)];
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function fromListIomListingDto(
  dto: ListIomListingDto,
): IomListingFilters {
  return {
    search: dto.search,
    sortBy: dto.sortBy,
    startDate: normalizeDate(dto.startDate as unknown as Date, 'start'),
    endDate: normalizeDate(dto.endDate as unknown as Date, 'end'),
    iomStatuses: dto.iomStatus
      ? parseIomStatuses(dto.iomStatus.split(','))
      : undefined,
    invoiceStatuses:
      dto.invoiceStatus != null ? [String(dto.invoiceStatus)] : undefined,
    projects: dto.projects?.length ? dedupeNumbers(dto.projects) : undefined,
    pointsClassification: dto.pointsClassification,
    listType: dto.listType,
  };
}

export function fromExportIomExcelDto(
  dto: ExportIomExcelDto,
): IomListingFilters {
  return {
    search: dto.search,
    sortBy: dto.sortBy,
    startDate: dto.startDate as unknown as Date | undefined,
    endDate: dto.endDate as unknown as Date | undefined,
    iomStatuses: dto.iomStatus?.length
      ? parseIomStatuses(dto.iomStatus)
      : undefined,
    invoiceStatuses: dto.invoiceStatus?.length
      ? dedupeStrings(dto.invoiceStatus)
      : undefined,
    projects: dto.projects?.length ? dedupeNumbers(dto.projects) : undefined,
    pointsClassification: dto.pointsClassification,
  };
}
