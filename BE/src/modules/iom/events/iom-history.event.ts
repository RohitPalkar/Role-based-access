import { IomHistoryActionEnum } from '../constants';

export class IomHistoryEvent {
  constructor(
    public readonly iomId: number,
    public readonly toStatusId: number,
    public readonly changedBy: number,
    public readonly action: IomHistoryActionEnum,
    public readonly fromStatusId: number | null = null,
    public readonly remarks: string | null = null,
    public readonly prevValue: Record<string, unknown> | null = null,
    public readonly updatedValue: Record<string, unknown> | null = null,
  ) {}
}
