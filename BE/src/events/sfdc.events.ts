export class SFDCLogEvent {
  constructor(
    public readonly opportunityId: string,
    public readonly logEvent: string,
    public readonly payload: any,
    public readonly response: any,
    public readonly status: string,
  ) {}
}
