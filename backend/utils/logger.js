import winston from 'winston';
import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';

dotenv.config();

// ログディレクトリの作成
const logDir = path.dirname(process.env.LOG_FILE_PATH || './logs/app.log');
fs.ensureDirSync(logDir);

// カスタムフォーマット
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // メタデータがある場合は追加
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    // スタックトレースがある場合は追加
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// ロガーの作成
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // ファイル出力（エラーレベル）
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH || './logs/app.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // ファイル出力（全レベル）
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH || './logs/app.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// 開発環境ではコンソールにも出力
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

/**
 * データベースにログを記録
 */
export function logToDatabase(level, category, message, details = null) {
  try {
    // 動的にインポートしてDBロガーを作成
    import('../models/database.js').then(({ exec }) => {
      exec(
        `INSERT INTO logs (level, category, message, details) VALUES (?, ?, ?, ?)`,
        [
          level,
          category,
          message,
          details ? JSON.stringify(details) : null
        ]
      );
    }).catch(error => {
      logger.error('Failed to log to database', { error: error.message });
    });
  } catch (error) {
    logger.error('Failed to log to database', { error: error.message });
  }
}

/**
 * 収集アクティビティをログ
 */
export function logCollectionActivity(sourceName, status, count, details = null) {
  const message = `Collection from ${sourceName}: ${status} (${count} items)`;
  logger.info(message, { category: 'collection', sourceName, status, count });
  logToDatabase('info', 'collection', message, { sourceName, status, count, ...details });
}

/**
 * 生成アクティビティをログ
 */
export function logGenerationActivity(templateType, status, details = null) {
  const message = `Content generation (${templateType}): ${status}`;
  logger.info(message, { category: 'generation', templateType, status });
  logToDatabase('info', 'generation', message, { templateType, status, ...details });
}

/**
 * APIエラーをログ
 */
export function logApiError(endpoint, error, details = null) {
  const message = `API Error at ${endpoint}: ${error.message}`;
  logger.error(message, { category: 'api', endpoint, error: error.stack });
  logToDatabase('error', 'api', message, { endpoint, error: error.message, stack: error.stack, ...details });
}

/**
 * システムイベントをログ
 */
export function logSystemEvent(event, details = null) {
  const message = `System event: ${event}`;
  logger.info(message, { category: 'system', event });
  logToDatabase('info', 'system', message, { event, ...details });
}

export default logger;
