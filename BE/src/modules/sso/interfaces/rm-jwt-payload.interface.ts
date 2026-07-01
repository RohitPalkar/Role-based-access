export interface RmAdminJwtPayload {
  sub: string;
  dbId?: number; // new optional field for DB id
  name: string;
  email: string;
  role: string;
}
