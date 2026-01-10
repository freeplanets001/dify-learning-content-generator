import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の読み込み
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * 環境変数の設定と検証
 */
const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databasePath: process.env.DATABASE_PATH || './data/content.db',

  // Google Apps Script
  gasWebAppUrl: process.env.GAS_WEB_APP_URL,
  gasApiKey: process.env.GAS_API_KEY,

  // Google Sheets
  googleSheetsId: process.env.GOOGLE_SHEETS_ID,
  googleServiceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,

  // Dify API
  difyApiBaseUrl: process.env.DIFY_API_BASE_URL || 'https://api.dify.ai/v1',
  difyApiKey: process.env.DIFY_API_KEY,
  difyWorkflowId: process.env.DIFY_WORKFLOW_ID,

  // Twitter/X API
  twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,

  // Obsidian
  obsidianVaultPath: process.env.OBSIDIAN_VAULT_PATH,
  obsidianDailyNotePath: process.env.OBSIDIAN_DAILY_NOTE_PATH || 'Daily Notes',

  // RSS Feeds
  difyBlogRss: process.env.DIFY_BLOG_RSS || 'https://dify.ai/blog/rss.xml',
  youtubeChannelRss: process.env.YOUTUBE_CHANNEL_RSS,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFilePath: process.env.LOG_FILE_PATH || './logs/app.log',

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15分
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
};

/**
 * 必須の環境変数をチェック
 */
export function validateRequiredEnvVars() {
  const warnings = [];
  const errors = [];

  // 警告レベル（機能が制限される）
  if (!config.gasWebAppUrl) {
    warnings.push('GAS_WEB_APP_URL is not set - GAS collection will be disabled');
  }

  if (!config.difyApiKey) {
    warnings.push('DIFY_API_KEY is not set - Content generation will be disabled');
  }

  if (!config.obsidianVaultPath) {
    warnings.push('OBSIDIAN_VAULT_PATH is not set - Obsidian integration will be disabled');
  }

  if (!config.googleSheetsId) {
    warnings.push('GOOGLE_SHEETS_ID is not set - Google Sheets integration will be disabled');
  }

  if (!config.twitterBearerToken) {
    warnings.push('TWITTER_BEARER_TOKEN is not set - Twitter collection will be disabled');
  }

  // 警告を表示
  if (warnings.length > 0) {
    console.warn('\n⚠️  Configuration Warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }

  // エラーがあれば例外をスロー
  if (errors.length > 0) {
    console.error('\n❌ Configuration Errors:');
    errors.forEach(error => console.error(`   - ${error}`));
    console.error('');
    throw new Error('Required environment variables are missing');
  }

  return { warnings, errors };
}

/**
 * 設定情報を表示（センシティブな情報は隠す）
 */
export function printConfig() {
  console.log('\n📋 Configuration:');
  console.log(`   - Environment: ${config.nodeEnv}`);
  console.log(`   - Port: ${config.port}`);
  console.log(`   - Database: ${config.databasePath}`);
  console.log(`   - Log Level: ${config.logLevel}`);
  console.log(`   - GAS Integration: ${config.gasWebAppUrl ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   - Dify API: ${config.difyApiKey ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   - Obsidian: ${config.obsidianVaultPath ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   - Google Sheets: ${config.googleSheetsId ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   - Twitter: ${config.twitterBearerToken ? '✅ Enabled' : '❌ Disabled'}`);
  console.log('');
}

export default config;
