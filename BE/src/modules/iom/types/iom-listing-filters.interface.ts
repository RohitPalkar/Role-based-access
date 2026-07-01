import { IomStatusCodeEnum } from '../enums/iom-status-code.enum';

export interface IomListingFilters {
  search?: string;
  sortBy?: string;
  startDate?: Date;
  endDate?: Date;
  iomStatuses?: IomStatusCodeEnum[];
  invoiceStatuses?: string[];
  projects?: number[];
  pointsClassification?: string;
  listType?: string;
}
