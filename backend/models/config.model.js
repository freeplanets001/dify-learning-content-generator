import { query, queryOne, exec } from './database.js';

/**
 * Config Model - システム設定の管理
 */

/**
 * 設定を作成または更新
 */
export function setConfig(key, value, category = null, description = null) {
  exec(
    `INSERT INTO configs (key, value, category, description)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      category = excluded.category,
      description = excluded.description,
      updated_at = datetime('now')`,
    [key, value, category, description]
  );

  return getConfig(key);
}

/**
 * 設定を取得
 */
export function getConfig(key) {
  return queryOne('SELECT * FROM configs WHERE key = ? LIMIT 1', [key]);
}

/**
 * 設定値のみを取得
 */
export function getConfigValue(key, defaultValue = null) {
  const config = getConfig(key);
  return config ? config.value : defaultValue;
}

/**
 * カテゴリ別に設定を取得
 */
export function getConfigsByCategory(category) {
  return query('SELECT * FROM configs WHERE category = ? ORDER BY key', [category]);
}

/**
 * 全設定を取得
 */
export function getAllConfigs() {
  return query('SELECT * FROM configs ORDER BY category, key');
}

/**
 * 設定を削除
 */
export function deleteConfig(key) {
  const result = exec('DELETE FROM configs WHERE key = ?', [key]);
  return result.changes > 0;
}

/**
 * 複数の設定を一括更新
 */
export function setConfigs(configs) {
  configs.forEach(config => {
    exec(
      `INSERT INTO configs (key, value, category, description)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        category = excluded.category,
        description = excluded.description,
        updated_at = datetime('now')`,
      [config.key, config.value, config.category || null, config.description || null]
    );
  });

  return true;
}

/**
 * データソースを取得
 */
export function getDataSource(id) {
  const source = queryOne('SELECT * FROM data_sources WHERE id = ?', [id]);

  if (source && source.config) {
    source.config = JSON.parse(source.config);
  }

  return source;
}

/**
 * データソース名で取得
 */
export function getDataSourceByName(name) {
  const source = queryOne('SELECT * FROM data_sources WHERE name = ?', [name]);

  if (source && source.config) {
    source.config = JSON.parse(source.config);
  }

  return source;
}

/**
 * 全データソースを取得
 */
export function getAllDataSources(enabledOnly = false) {
  let sql = 'SELECT * FROM data_sources';
  const params = [];

  if (enabledOnly) {
    sql += ' WHERE enabled = 1';
  }
  sql += ' ORDER BY name';

  const sources = query(sql, params);

  return sources.map(source => ({
    ...source,
    config: source.config ? JSON.parse(source.config) : {}
  }));
}

/**
 * データソースを更新
 */
export function updateDataSource(id, updateData) {
  const fields = [];
  const values = [];

  Object.keys(updateData).forEach(key => {
    if (key !== 'id') {
      fields.push(`${key} = ?`);
      if (key === 'config') {
        values.push(typeof updateData[key] === 'string' ? updateData[key] : JSON.stringify(updateData[key]));
      } else {
        values.push(updateData[key]);
      }
    }
  });

  fields.push('updated_at = datetime("now")');
  values.push(id);

  exec(`UPDATE data_sources SET ${fields.join(', ')} WHERE id = ?`, values);
  return getDataSource(id);
}

/**
 * データソースの有効/無効を切り替え
 */
export function toggleDataSource(id) {
  exec(
    `UPDATE data_sources
    SET enabled = NOT enabled, updated_at = datetime('now')
    WHERE id = ?`,
    [id]
  );

  return getDataSource(id);
}

/**
 * データソースの収集情報を更新
 */
export function updateDataSourceCollection(id, success = true) {
  exec(
    `UPDATE data_sources
    SET
      last_collected_at = datetime('now'),
      collection_count = collection_count + 1,
      error_count = CASE WHEN ? THEN error_count ELSE error_count + 1 END,
      updated_at = datetime('now')
    WHERE id = ?`,
    [success ? 1 : 0, id]
  );

  return getDataSource(id);
}

/**
 * データソースを作成
 */
export function createDataSource(sourceData) {
  const result = exec(
    `INSERT INTO data_sources (name, type, url, enabled, config)
    VALUES (?, ?, ?, ?, ?)`,
    [
      sourceData.name,
      sourceData.type,
      sourceData.url || null,
      sourceData.enabled !== undefined ? sourceData.enabled : 1,
      sourceData.config ? JSON.stringify(sourceData.config) : null
    ]
  );

  return getDataSource(result.lastInsertRowid);
}

/**
 * データソースを削除
 */
export function deleteDataSource(id) {
  const result = exec('DELETE FROM data_sources WHERE id = ?', [id]);
  return result.changes > 0;
}

export default {
  setConfig,
  getConfig,
  getConfigValue,
  getConfigsByCategory,
  getAllConfigs,
  deleteConfig,
  setConfigs,
  getDataSource,
  getDataSourceByName,
  getAllDataSources,
  updateDataSource,
  toggleDataSource,
  updateDataSourceCollection,
  createDataSource,
  deleteDataSource
};
