export class EmailNotifyEvent {
  constructor(
    public readonly to: string | string[],
    public readonly subject: string,
    public readonly textBody?: string,
    public readonly htmlBody?: string,
    public readonly cc?: string | string[],
    public readonly bcc?: string | string[],
  ) {}
}

export class S3FileFetchEvent {
  constructor(public readonly key: string) {}
}
