export class ComposeEmailEvent {
  constructor(
    public readonly event: string,
    public readonly variables: Record<string, string>,
    public readonly brand?: string,
    public readonly recipients?: {
      to?: string | string[];
      cc?: string | string[];
      bcc?: string | string[];
    },
  ) {}
}
