import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_PATH = process.env.DATABASE_PATH || join(__dirname, '../../data/content.db');

// データディレクトリの作成
const dataDir = dirname(DATABASE_PATH);
fs.ensureDirSync(dataDir);

let db = null;
let SQL = null;

/**
 * データベース接続を初期化
 */
export async function initializeDB() {
  try {
    SQL = await initSqlJs();

    // 既存のデータベースファイルがあれば読み込む
    if (fs.existsSync(DATABASE_PATH)) {
      const buffer = fs.readFileSync(DATABASE_PATH);
      db = new SQL.Database(buffer);
      console.log('✅ Existing database loaded');
    } else {
      db = new SQL.Database();
      console.log('✅ New database created');
    }

    return db;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * データベースをファイルに保存
 */
export function saveDatabase() {
  if (!db) {
    console.warn('Database not initialized');
    return;
  }

  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DATABASE_PATH, buffer);
  } catch (error) {
    console.error('Failed to save database:', error);
  }
}

/**
 * クエリ実行（SELECT）
 */
export function query(sql, params = []) {
  if (!db) throw new Error('Database not initialized');

  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return results;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

/**
 * クエリ実行（単一行）
 */
export function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * クエリ実行（INSERT/UPDATE/DELETE）
 */
export function exec(sql, params = []) {
  if (!db) throw new Error('Database not initialized');

  try {
    if (params.length > 0) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
    } else {
      db.run(sql);
    }

    // 自動保存
    saveDatabase();

    return {
      changes: db.getRowsModified(),
      lastInsertRowid: queryOne('SELECT last_insert_rowid() as id')?.id || 0
    };
  } catch (error) {
    console.error('Exec error:', error);
    throw error;
  }
}

/**
 * データベーステーブル初期化
 */
export async function initializeDatabase() {
  if (!db) {
    await initializeDB();
  }

  // articlesテーブル
  exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL,
      source_name TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      description TEXT,
      author TEXT,
      published_date TEXT,
      collected_date TEXT NOT NULL DEFAULT (datetime('now')),
      content TEXT,
      tags TEXT,
      status TEXT NOT NULL DEFAULT 'unprocessed',
      priority INTEGER DEFAULT 0,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // contentsテーブル
  exec(`
    CREATE TABLE IF NOT EXISTS contents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER,
      template_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER DEFAULT 1,
      generated_by TEXT,
      approved_by TEXT,
      approved_at TEXT,
      published_url TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
    )
  `);

  // configsテーブル
  exec(`
    CREATE TABLE IF NOT EXISTS configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      category TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // logsテーブル
  exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      user_id TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // data_sourcesテーブル
  exec(`
    CREATE TABLE IF NOT EXISTS data_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      url TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_collected_at TEXT,
      collection_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      config TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // インデックス作成
  try {
    exec('CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url)');
    exec('CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)');
    exec('CREATE INDEX IF NOT EXISTS idx_articles_source_type ON articles(source_type)');
    exec('CREATE INDEX IF NOT EXISTS idx_articles_collected_date ON articles(collected_date)');
    exec('CREATE INDEX IF NOT EXISTS idx_contents_article_id ON contents(article_id)');
    exec('CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status)');
    exec('CREATE INDEX IF NOT EXISTS idx_contents_template_type ON contents(template_type)');
    exec('CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category)');
    exec('CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at)');
    exec('CREATE INDEX IF NOT EXISTS idx_data_sources_enabled ON data_sources(enabled)');
  } catch (error) {
    // インデックスが既に存在する場合はスキップ
  }

  // デフォルトデータソースの追加
  const dataSources = [
    {
      name: 'Dify Blog',
      type: 'rss',
      url: 'https://dify.ai/blog/rss.xml',
      enabled: 1,
      config: JSON.stringify({ category: 'official', language: 'en' })
    },
    {
      name: 'Dify YouTube',
      type: 'youtube',
      url: 'https://www.youtube.com/feeds/videos.xml?channel_id=YOUR_CHANNEL_ID',
      enabled: 1,
      config: JSON.stringify({ category: 'official', language: 'en' })
    },
    {
      name: 'Qiita Dify',
      type: 'rss',
      url: 'https://qiita.com/tags/dify/feed',
      enabled: 1,
      config: JSON.stringify({ category: 'community', language: 'ja' })
    },
    {
      name: 'Zenn Dify',
      type: 'rss',
      url: 'https://zenn.dev/topics/dify/feed',
      enabled: 1,
      config: JSON.stringify({ category: 'community', language: 'ja' })
    },
    {
      name: 'Twitter Dify',
      type: 'twitter',
      url: null,
      enabled: 0,
      config: JSON.stringify({ query: 'dify AI', category: 'social' })
    }
  ];

  dataSources.forEach(source => {
    try {
      exec(
        `INSERT OR IGNORE INTO data_sources (name, type, url, enabled, config) VALUES (?, ?, ?, ?, ?)`,
        [source.name, source.type, source.url, source.enabled, source.config]
      );
    } catch (error) {
      // 既に存在する場合はスキップ
    }
  });

  saveDatabase();
  console.log('✅ Database initialized successfully');
}

/**
 * データベーススキーマのバージョン確認と更新
 */
export function checkAndUpgradeSchema() {
  const LATEST_VERSION = 1;

  try {
    const result = queryOne(`SELECT value FROM configs WHERE key = 'schema_version' LIMIT 1`);
    const currentVersion = result ? parseInt(result.value) : 0;

    if (currentVersion < LATEST_VERSION) {
      console.log(`Upgrading schema from version ${currentVersion} to ${LATEST_VERSION}`);

      exec(
        `INSERT OR REPLACE INTO configs (key, value, category, description) VALUES (?, ?, ?, ?)`,
        ['schema_version', LATEST_VERSION.toString(), 'system', 'Database schema version']
      );

      console.log('✅ Schema upgrade completed');
    }
  } catch (error) {
    // configsテーブルがまだ存在しない場合はスキップ
  }
}

// スクリプトとして直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Initializing database...');
  initializeDatabase().then(() => {
    checkAndUpgradeSchema();
    process.exit(0);
  });
}

// プロセス終了時にデータベースを保存
process.on('exit', () => {
  saveDatabase();
});

process.on('SIGINT', () => {
  saveDatabase();
  process.exit(0);
});

export default {
  initializeDB,
  initializeDatabase,
  checkAndUpgradeSchema,
  query,
  queryOne,
  exec,
  saveDatabase
};
