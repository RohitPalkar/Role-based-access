export class WhatsappNotifyEvent {
  constructor(
    public readonly mobileNumber: string,
    public readonly customerName: string,
    public readonly rmName: string,
    public readonly voucherLink: string,
  ) {}
}
