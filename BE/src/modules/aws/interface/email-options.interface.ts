export interface EmailOptions {
  to: string | string[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  cc?: string | string[];
  bcc?: string | string[];
}
