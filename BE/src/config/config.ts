import { ConfigProps } from './config.interface';

export const config = (): ConfigProps => ({
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT, 10) || 3000,
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectionPool: parseInt(process.env.DB_CONNECTION_POOL, 10) || 10,
  },
});
