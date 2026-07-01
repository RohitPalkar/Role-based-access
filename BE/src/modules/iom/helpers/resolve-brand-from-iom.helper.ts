import { Iom } from '../entities/iom.entity';
import { IomErrorCodeEnum } from '../enums/iom-error-code.enum';
import { throwIomError } from '../utils/iom-error.util';

export function resolveBrandIdFromIom(iom: Iom): number {
  const brandId = iom.project?.brandId;
  if (!brandId) {
    throwIomError(
      IomErrorCodeEnum.MANDATORY_FIELDS_MISSING,
      { iomId: iom.id, field: 'brandId' },
      'Unable to resolve brand for this IOM.',
    );
  }
  return brandId;
}
