import { Client } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 api 目录下的 .env
dotenv.config({ path: resolve(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

function getMaintenanceUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = '/postgres';
  return url.toString();
}

function getDatabaseName(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  return url.pathname.slice(1) || 'ideo_track';
}

async function resetDatabase() {
  const dbName = getDatabaseName(DATABASE_URL);
  const maintenanceUrl = getMaintenanceUrl(DATABASE_URL);
  const maintenanceClient = new Client({ connectionString: maintenanceUrl });

  try {
    await maintenanceClient.connect();
    console.log(`Connected to maintenance database (postgres)`);

    // 终止对目标库的所有连接
    await maintenanceClient.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName]
    );
    console.log(`Terminated active connections to ${dbName}`);

    // 删除并重建数据库
    await maintenanceClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`Dropped database ${dbName}`);

    await maintenanceClient.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database ${dbName}`);
  } catch (error) {
    console.error('Database reset failed:', error);
    process.exit(1);
  } finally {
    await maintenanceClient.end();
  }
}

resetDatabase();
