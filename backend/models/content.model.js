import { query, queryOne, exec } from './database.js';

/**
 * Content Model - 生成コンテンツデータの管理
 */

/**
 * コンテンツを作成
 */
export function createContent(contentData) {
  const result = exec(
    `INSERT INTO contents (
      article_id, template_type, title, content, status,
      version, generated_by, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contentData.article_id || null,
      contentData.template_type,
      contentData.title,
      contentData.content,
      contentData.status || 'draft',
      contentData.version || 1,
      contentData.generated_by || 'system',
      contentData.metadata ? JSON.stringify(contentData.metadata) : null
    ]
  );

  return { id: result.lastInsertRowid, ...contentData };
}

/**
 * コンテンツを更新
 */
export function updateContent(id, updateData) {
  const fields = [];
  const values = [];

  Object.keys(updateData).forEach(key => {
    if (key !== 'id') {
      fields.push(`${key} = ?`);
      if (key === 'metadata') {
        values.push(typeof updateData[key] === 'string' ? updateData[key] : JSON.stringify(updateData[key]));
      } else {
        values.push(updateData[key]);
      }
    }
  });

  fields.push('updated_at = datetime("now")');
  values.push(id);

  exec(`UPDATE contents SET ${fields.join(', ')} WHERE id = ?`, values);
  return getContentById(id);
}

/**
 * IDでコンテンツを取得
 */
export function getContentById(id) {
  const content = queryOne('SELECT * FROM contents WHERE id = ?', [id]);

  if (content && content.metadata) {
    content.metadata = JSON.parse(content.metadata);
  }

  return content;
}

/**
 * コンテンツ一覧を取得
 */
export function getContents(options = {}) {
  const {
    status,
    template_type,
    article_id,
    limit = 50,
    offset = 0,
    orderBy = 'created_at',
    order = 'DESC'
  } = options;

  let sql = 'SELECT * FROM contents WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (template_type) {
    sql += ' AND template_type = ?';
    params.push(template_type);
  }

  if (article_id) {
    sql += ' AND article_id = ?';
    params.push(article_id);
  }

  sql += ` ORDER BY ${orderBy} ${order}`;
  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const contents = query(sql, params);

  return contents.map(content => ({
    ...content,
    metadata: content.metadata ? JSON.parse(content.metadata) : {}
  }));
}

/**
 * コンテンツの総数を取得
 */
export function getContentCount(options = {}) {
  const { status, template_type, article_id } = options;

  let sql = 'SELECT COUNT(*) as count FROM contents WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (template_type) {
    sql += ' AND template_type = ?';
    params.push(template_type);
  }

  if (article_id) {
    sql += ' AND article_id = ?';
    params.push(article_id);
  }

  const result = queryOne(sql, params);
  return result ? result.count : 0;
}

/**
 * コンテンツのステータスを更新
 */
export function updateContentStatus(id, status, approvedBy = null) {
  const fields = ['status = ?', 'updated_at = datetime("now")'];
  const params = [status];

  if (status === 'approved' && approvedBy) {
    fields.push('approved_by = ?', 'approved_at = datetime("now")');
    params.push(approvedBy);
  }

  params.push(id);

  exec(`UPDATE contents SET ${fields.join(', ')} WHERE id = ?`, params);
  return getContentById(id);
}

/**
 * コンテンツを削除
 */
export function deleteContent(id) {
  const result = exec('DELETE FROM contents WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * 記事IDに紐づくコンテンツを取得
 */
export function getContentsByArticleId(articleId) {
  const contents = query(
    `SELECT * FROM contents
    WHERE article_id = ?
    ORDER BY version DESC, created_at DESC`,
    [articleId]
  );

  return contents.map(content => ({
    ...content,
    metadata: content.metadata ? JSON.parse(content.metadata) : {}
  }));
}

/**
 * コンテンツの新しいバージョンを作成
 */
export function createNewVersion(contentId, newContent, updatedBy) {
  const original = getContentById(contentId);
  if (!original) {
    throw new Error('Original content not found');
  }

  const newVersion = {
    ...original,
    content: newContent,
    version: original.version + 1,
    generated_by: updatedBy,
    status: 'draft'
  };

  delete newVersion.id;
  delete newVersion.created_at;
  delete newVersion.updated_at;

  return createContent(newVersion);
}

/**
 * ダッシュボード用統計情報を取得
 */
export function getContentStats() {
  const result = queryOne(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
      SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pending_approval,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
      SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as today
    FROM contents
  `);

  return result || { total: 0, draft: 0, pending_approval: 0, approved: 0, rejected: 0, published: 0, today: 0 };
}

/**
 * テンプレート別のコンテンツ数を取得
 */
export function getContentsByTemplate() {
  return query(`
    SELECT
      template_type,
      COUNT(*) as count,
      MAX(created_at) as last_generated
    FROM contents
    GROUP BY template_type
    ORDER BY count DESC
  `);
}

/**
 * 承認待ちコンテンツを取得
 */
export function getPendingApprovalContents(limit = 20) {
  const contents = query(
    `SELECT c.*, a.title as article_title, a.url as article_url
    FROM contents c
    LEFT JOIN articles a ON c.article_id = a.id
    WHERE c.status = 'pending_approval'
    ORDER BY c.created_at ASC
    LIMIT ?`,
    [limit]
  );

  return contents.map(content => ({
    ...content,
    metadata: content.metadata ? JSON.parse(content.metadata) : {}
  }));
}

export default {
  createContent,
  updateContent,
  getContentById,
  getContents,
  getContentCount,
  updateContentStatus,
  deleteContent,
  getContentsByArticleId,
  createNewVersion,
  getContentStats,
  getContentsByTemplate,
  getPendingApprovalContents
};
