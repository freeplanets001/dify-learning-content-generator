import fs from 'fs-extra';
import path from 'path';
import dayjs from 'dayjs';
import { fileURLToPath } from 'url';
import config from '../config/env.js';
import * as articleModel from '../models/article.model.js'
import * as configModel from '../models/config.model.js';
import { generateDailyNote } from '../utils/markdown.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定ファイルのパス
const SETTINGS_FILE = path.resolve(__dirname, '../../data/settings.json');

/**
 * Obsidian Vault連携サービス
 */

/**
 * settings.jsonから設定を読み込む
 */
async function loadSettings() {
  try {
    if (await fs.pathExists(SETTINGS_FILE)) {
      return await fs.readJson(SETTINGS_FILE);
    }
  } catch (error) {
    logger.error('Failed to load settings:', error);
  }
  return {};
}

/**
 * Vault設定を取得
 */
export async function getVaultConfig() {
  const settings = await loadSettings();
  const vaultPath = settings.obsidianVaultPath || config.obsidianVaultPath || '';
  const dailyNotePath = settings.obsidianDailyNotePath || config.obsidianDailyNotePath || 'Daily Notes';

  return {
    vaultPath,
    dailyNotePath,
    enabled: !!vaultPath
  };
}

/**
 * Vault設定を更新
 */
export function updateVaultConfig(vaultPath, dailyNotePath) {
  // パスの検証
  if (!fs.existsSync(vaultPath)) {
    throw new Error(`Vault path does not exist: ${vaultPath}`);
  }

  const stats = fs.statSync(vaultPath);
  if (!stats.isDirectory()) {
    throw new Error(`Vault path is not a directory: ${vaultPath}`);
  }

  // 設定を保存
  configModel.setConfig('obsidian_vault_path', vaultPath, 'obsidian', 'Obsidian Vault path');
  configModel.setConfig('obsidian_daily_note_path', dailyNotePath, 'obsidian', 'Daily Note subfolder');

  logger.info('Obsidian vault config updated', { vaultPath, dailyNotePath });

  return {
    vaultPath,
    dailyNotePath,
    enabled: true
  };
}

/**
 * Daily Noteを生成
 */
export async function generateDailyNoteFile(date = null, options = {}) {
  const vaultConfig = await getVaultConfig();

  if (!vaultConfig.enabled) {
    throw new Error('Obsidian vault is not configured');
  }

  // 日付の設定
  const targetDate = date ? dayjs(date) : dayjs();
  const dateStr = targetDate.format('YYYY-MM-DD');

  // Daily Noteディレクトリのパス
  const dailyNotesDir = path.join(vaultConfig.vaultPath, vaultConfig.dailyNotePath);
  fs.ensureDirSync(dailyNotesDir);

  // ファイル名とパス
  const fileName = `${dateStr}.md`;
  const filePath = path.join(dailyNotesDir, fileName);

  // 記事を取得
  const {
    includeUnprocessed = true,
    includeProcessed = false,
    sourceTypes = null
  } = options;

  let articles;

  if (includeUnprocessed && includeProcessed) {
    // 全記事（指定日）
    articles = articleModel.getArticles({
      orderBy: 'collected_date',
      order: 'DESC',
      limit: 100
    });
  } else if (includeUnprocessed) {
    // 未処理記事のみ
    articles = articleModel.getArticles({
      status: 'unprocessed',
      orderBy: 'collected_date',
      order: 'DESC',
      limit: 100
    });
  } else {
    // 処理済み記事のみ
    articles = articleModel.getArticles({
      status: 'processed',
      orderBy: 'collected_date',
      order: 'DESC',
      limit: 100
    });
  }

  // 指定日に収集された記事のみフィルター
  articles = articles.filter(article => {
    // 簡易的なJST対応: UTC文字列と仮定して9時間足す
    // DBには "YYYY-MM-DD HH:mm:ss" (UTC) で入っていると想定
    const date = new Date(article.collected_date);
    // タイムゾーン補正 (JST +9)
    // ただし、new Date(string)の挙動は環境依存があるため、明示的にUTCとして扱う
    // サーバーのタイムゾーンがJSTの場合、new Date("... UTC")扱いにならない場合がある
    // 安全策として、dayjsを使って比較する
    // DBの日時がUTCなら、+9時間すればJSTの日付になる
    const collectedDate = dayjs(article.collected_date).add(9, 'hour');
    return collectedDate.format('YYYY-MM-DD') === dateStr;
  });

  // ソースタイプでフィルター
  if (sourceTypes && Array.isArray(sourceTypes)) {
    articles = articles.filter(article => sourceTypes.includes(article.source_type));
  }

  // Markdownコンテンツを生成
  const markdown = generateDailyNote(dateStr, articles);

  // ファイルに書き込み
  fs.writeFileSync(filePath, markdown, 'utf8');

  logger.info('Daily note created', {
    date: dateStr,
    filePath,
    articleCount: articles.length
  });

  // 記事のステータスを更新（オプション）
  if (options.markAsProcessed && articles.length > 0) {
    articles.forEach(article => {
      if (article.status === 'unprocessed') {
        articleModel.updateArticleStatus(article.id, 'processed');
      }
    });
  }

  return {
    success: true,
    filePath,
    date: dateStr,
    articleCount: articles.length,
    categories: categorizeArticles(articles)
  };
}

/**
 * 記事をカテゴリ別に集計
 */
function categorizeArticles(articles) {
  const categories = {};

  articles.forEach(article => {
    const category = article.metadata?.category || 'other';
    categories[category] = (categories[category] || 0) + 1;
  });

  return categories;
}

/**
 * 個別記事のMarkdownファイルを生成
 */
export async function generateArticleNote(articleId, templateType = 'default') {
  const vaultConfig = await getVaultConfig();

  if (!vaultConfig.enabled) {
    throw new Error('Obsidian vault is not configured');
  }

  const article = articleModel.getArticleById(articleId);

  if (!article) {
    throw new Error('Article not found');
  }

  // Articlesディレクトリを作成
  const articlesDir = path.join(vaultConfig.vaultPath, 'Articles');
  fs.ensureDirSync(articlesDir);

  // ファイル名（URLから安全な名前を生成）
  const sanitizedTitle = article.title
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .substring(0, 100);

  const fileName = `${sanitizedTitle}.md`;
  const filePath = path.join(articlesDir, fileName);

  // Markdownコンテンツを生成（markdown.jsのgenerateArticleTemplateを使用）
  const { generateArticleTemplate } = await import('../utils/markdown.js');
  const markdown = generateArticleTemplate(article, templateType);

  // ファイルに書き込み
  fs.writeFileSync(filePath, markdown, 'utf8');

  logger.info('Article note created', {
    articleId,
    title: article.title,
    filePath
  });

  return {
    success: true,
    filePath,
    title: article.title
  };
}

/**
 * Vaultの存在確認
 */
export function checkVaultExists(vaultPath) {
  try {
    if (!fs.existsSync(vaultPath)) {
      return {
        exists: false,
        error: 'Path does not exist'
      };
    }

    const stats = fs.statSync(vaultPath);
    if (!stats.isDirectory()) {
      return {
        exists: false,
        error: 'Path is not a directory'
      };
    }

    // .obsidianフォルダの確認（Obsidian Vaultの証明）
    const obsidianDir = path.join(vaultPath, '.obsidian');
    const isObsidianVault = fs.existsSync(obsidianDir);

    return {
      exists: true,
      isDirectory: true,
      isObsidianVault,
      writable: true // 簡易チェック
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
}

/**
 * Daily Notesの一覧を取得
 */
export async function listDailyNotes(limit = 30) {
  const vaultConfig = await getVaultConfig();

  if (!vaultConfig.enabled) {
    throw new Error('Obsidian vault is not configured');
  }

  const dailyNotesDir = path.join(vaultConfig.vaultPath, vaultConfig.dailyNotePath);

  if (!fs.existsSync(dailyNotesDir)) {
    return [];
  }

  const files = fs.readdirSync(dailyNotesDir)
    .filter(file => file.endsWith('.md'))
    .sort()
    .reverse()
    .slice(0, limit);

  return files.map(file => {
    const filePath = path.join(dailyNotesDir, file);
    const stats = fs.statSync(filePath);

    return {
      fileName: file,
      date: file.replace('.md', ''),
      filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  });
}

export default {
  getVaultConfig,
  updateVaultConfig,
  generateDailyNoteFile,
  generateArticleNote,
  checkVaultExists,
  listDailyNotes
};
