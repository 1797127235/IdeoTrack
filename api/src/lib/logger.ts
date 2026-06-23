import fs from 'node:fs';
import path from 'node:path';
import pino, { type Logger, type LoggerOptions } from 'pino';
import { config } from '../config/index.js';

/**
 * 统一日志模块（基于 pino）。
 *
 * 设计要点：
 * - 开发环境：控制台彩色美化（pino-pretty），同时写文件到 LOG_FILE_DIR（默认 ./logs）。
 * - 生产环境：JSON 输出到 stdout（docker logs 可读），默认不写文件（避免容器内文件丢失），
 *             设 LOG_FILE_DIR 可强制开启文件输出（需配合卷挂载）。
 * - 日志级别由 LOG_LEVEL 控制，默认 dev=debug / prod=info。
 *
 * 日志位置：服务器上看日志的方式
 *   - 本地开发：终端直接看 + api/logs/app.log 文件
 *   - 服务器(Docker)：`docker logs ideotrack-api`（看 stdout）
 */

const isDev = config.isDev;

/** 组装多 transport：stdout + 文件（可选） */
function buildTargets(): pino.TransportTargetOptions[] {
  const targets: pino.TransportTargetOptions[] = [];

  // 控制台：开发用彩色美化，生产用纯 JSON
  targets.push({
    target: isDev ? 'pino-pretty' : 'pino/file',
    level: config.logLevel,
    options: isDev
      ? { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l', ignore: 'pid,hostname' }
      : {},
  });

  // 文件输出：开发环境默认开启；生产环境仅在显式配置 LOG_FILE_DIR 时开启
  if (isDev || config.logFileDir) {
    const dir = config.logFileDir || path.resolve(process.cwd(), 'logs');
    fs.mkdirSync(dir, { recursive: true });

    targets.push({
      target: 'pino/file',
      level: config.logLevel,
      options: {
        destination: path.join(dir, 'app.log'),
        mkdir: true,
      },
    });
  }

  return targets;
}

const transport = pino.transport({ targets: buildTargets() });

const baseOptions: LoggerOptions = {
  level: config.logLevel,
};

export const logger: Logger = pino(baseOptions, transport);

/** 启动信息：环境 + 端口 + 日志级别，便于排查“日志去哪了” */
export function logStartup(port: number): void {
  logger.info(
    {
      port,
      nodeEnv: config.nodeEnv,
      logLevel: config.logLevel,
      logFileDir: config.logFileDir || (isDev ? 'logs/ (default)' : '(stdout only)'),
    },
    'API server started'
  );
}
