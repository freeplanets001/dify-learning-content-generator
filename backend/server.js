import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import config, { validateRequiredEnvVars, printConfig } from './config/env.js';
import logger, { logSystemEvent } from './utils/logger.js';
import { initializeDatabase, checkAndUpgradeSchema } from './models/database.js';

// ルートのインポート
import collectorRoutes from './routes/collector.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import obsidianRoutes from './routes/obsidian.routes.js';
import contentRoutes from './routes/content.routes.js';
import settingsRoutes from './routes/settings.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/**
 * ミドルウェア設定
 */

// CORS設定
app.use(cors({
  origin: config.nodeEnv === 'production'
    ? ['http://localhost:5173'] // 本番環境では適切なオリジンに変更
    : '*',
  credentials: true
}));

// JSONパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// レート制限
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// リクエストログ
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

/**
 * ヘルスチェックエンドポイント
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  });
});

/**
 * API情報エンドポイント
 */
app.get('/api', (req, res) => {
  res.json({
    name: 'Dify Learning Content Generator API',
    version: '1.0.0',
    description: '学習コンテンツ自動生成プラットフォーム',
    endpoints: {
      health: '/health',
      collector: '/api/collector',
      obsidian: '/api/obsidian',
      content: '/api/content',
      dashboard: '/api/dashboard',
      settings: '/api/settings'
    }
  });
});

/**
 * ルート設定
 */
app.use('/api/collector', collectorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/obsidian', obsidianRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/settings', settingsRoutes);

// 静的ファイルサービング（スライド画像）
// app.use('/slide-images', express.static(path.join(__dirname, '../data/slide-images')));
// app.use('/slides', express.static(path.join(__dirname, '../data/slides')));

/**
 * エラーハンドリングミドルウェア
 */

// 404エラー
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// グローバルエラーハンドラー
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const message = config.nodeEnv === 'production'
    ? 'Internal Server Error'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: err.name || 'Error',
    message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack })
  });
});

/**
 * サーバー起動
 */
async function startServer() {
  try {
    // 環境変数の検証
    console.log('🔍 Validating environment variables...');
    validateRequiredEnvVars();

    // 設定情報の表示
    printConfig();

    // データベース初期化
    console.log('🗄️  Initializing database...');
    await initializeDatabase();
    checkAndUpgradeSchema();

    // サーバー起動
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Server is running on http://0.0.0.0:${config.port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`📊 API Documentation: http://localhost:${config.port}/api`);
      console.log('');

      logSystemEvent('server_started', {
        port: config.port,
        environment: config.nodeEnv
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    logger.error('Server startup failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  logSystemEvent('server_shutdown', { signal: 'SIGTERM' });
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  logSystemEvent('server_shutdown', { signal: 'SIGINT' });
  process.exit(0);
});

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// サーバー起動
startServer();

export default app;
