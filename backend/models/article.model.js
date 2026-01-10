import { query, queryOne, exec } from './database.js';

/**
 * Article Model - 収集記事データの管理
 */

/**
 * 記事を作成
 */
export function createArticle(articleData) {
  const result = exec(
    `INSERT INTO articles (
      source_type, source_name, title, url, description, author,
      published_date, content, tags, status, priority, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      articleData.source_type,
      articleData.source_name,
      articleData.title,
      articleData.url,
      articleData.description || null,
      articleData.author || null,
      articleData.published_date || null,
      articleData.content || null,
      articleData.tags ? JSON.stringify(articleData.tags) : null,
      articleData.status || 'unprocessed',
      articleData.priority || 0,
      articleData.metadata ? JSON.stringify(articleData.metadata) : null
    ]
  );

  return { id: result.lastInsertRowid, ...articleData };
}

/**
 * URLで記事を検索（重複チェック用）
 */
export function findArticleByUrl(url) {
  return queryOne('SELECT * FROM articles WHERE url = ? LIMIT 1', [url]);
}

/**
 * 記事を更新
 */
export function updateArticle(id, updateData) {
  const fields = [];
  const values = [];

  Object.keys(updateData).forEach(key => {
    if (key !== 'id') {
      fields.push(`${key} = ?`);
      if (key === 'tags' || key === 'metadata') {
        values.push(typeof updateData[key] === 'string' ? updateData[key] : JSON.stringify(updateData[key]));
      } else {
        values.push(updateData[key]);
      }
    }
  });

  fields.push('updated_at = datetime("now")');
  values.push(id);

  exec(`UPDATE articles SET ${fields.join(', ')} WHERE id = ?`, values);
  return getArticleById(id);
}

/**
 * IDで記事を取得
 */
export function getArticleById(id) {
  const article = queryOne('SELECT * FROM articles WHERE id = ?', [id]);

  if (article) {
    article.tags = article.tags ? JSON.parse(article.tags) : [];
    article.metadata = article.metadata ? JSON.parse(article.metadata) : {};
  }

  return article;
}

/**
 * 記事一覧を取得（フィルター・ページネーション対応）
 */
export function getArticles(options = {}) {
  const {
    status,
    source_type,
    source_name,
    limit = 50,
    offset = 0,
    orderBy = 'collected_date',
    order = 'DESC'
  } = options;

  let sql = 'SELECT * FROM articles WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (source_type) {
    sql += ' AND source_type = ?';
    params.push(source_type);
  }

  if (source_name) {
    sql += ' AND source_name = ?';
    params.push(source_name);
  }

  sql += ` ORDER BY ${orderBy} ${order}`;
  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const articles = query(sql, params);

  return articles.map(article => ({
    ...article,
    tags: article.tags ? JSON.parse(article.tags) : [],
    metadata: article.metadata ? JSON.parse(article.metadata) : {}
  }));
}

/**
 * 記事の総数を取得
 */
export function getArticleCount(options = {}) {
  const { status, source_type, source_name } = options;

  let sql = 'SELECT COUNT(*) as count FROM articles WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (source_type) {
    sql += ' AND source_type = ?';
    params.push(source_type);
  }

  if (source_name) {
    sql += ' AND source_name = ?';
    params.push(source_name);
  }

  const result = queryOne(sql, params);
  return result ? result.count : 0;
}

/**
 * 記事のステータスを更新
 */
export function updateArticleStatus(id, status) {
  exec(`UPDATE articles SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, id]);
  return getArticleById(id);
}

/**
 * 記事を削除
 */
export function deleteArticle(id) {
  const result = exec('DELETE FROM articles WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * 古い記事をアーカイブ（30日以上経過）
 */
export function archiveOldArticles(days = 30) {
  const result = exec(
    `UPDATE articles
    SET status = 'archived', updated_at = datetime('now')
    WHERE status IN ('unprocessed', 'processed')
    AND collected_date < datetime('now', '-' || ? || ' days')`,
    [days]
  );
  return result.changes;
}

/**
 * ダッシュボード用統計情報を取得
 */
export function getArticleStats() {
  const result = queryOne(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'unprocessed' THEN 1 ELSE 0 END) as unprocessed,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) as processed,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
      SUM(CASE WHEN date(collected_date) = date('now') THEN 1 ELSE 0 END) as today
    FROM articles
  `);

  return result || { total: 0, unprocessed: 0, processing: 0, processed: 0, error: 0, today: 0 };
}

/**
 * ソース別の記事数を取得
 */
export function getArticlesBySource() {
  return query(`
    SELECT
      source_type,
      source_name,
      COUNT(*) as count,
      MAX(collected_date) as last_collected
    FROM articles
    GROUP BY source_type, source_name
    ORDER BY count DESC
  `);
}

export default {
  createArticle,
  findArticleByUrl,
  updateArticle,
  getArticleById,
  getArticles,
  getArticleCount,
  updateArticleStatus,
  deleteArticle,
  archiveOldArticles,
  getArticleStats,
  getArticlesBySource
};
