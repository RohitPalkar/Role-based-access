export interface DBProps {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  connectionPool: number;
}

export interface ConfigProps {
  nodeEnv: string;
  port: number;
  db: DBProps;
}
