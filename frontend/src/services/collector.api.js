import api from './api';

/**
 * 収集API
 */

// 収集ステータスを取得
export const getCollectionStatus = () => api.get('/api/collector/status');

// 収集をトリガー
export const triggerCollection = (params = {}) => api.post('/api/collector/trigger', params);

// 記事一覧を取得
export const getArticles = (params = {}) => api.get('/api/collector/articles', { params });

// 記事詳細を取得
export const getArticle = (id) => api.get(`/api/collector/articles/${id}`);

// 記事ステータスを更新
export const updateArticleStatus = (id, status) =>
  api.patch(`/api/collector/articles/${id}/status`, { status });

// 記事を削除
export const deleteArticle = (id) => api.delete(`/api/collector/articles/${id}`);

// データソース一覧を取得
export const getDataSources = (enabled = null) => {
  const params = enabled !== null ? { enabled } : {};
  return api.get('/api/collector/sources', { params });
};

// データソース詳細を取得
export const getDataSource = (id) => api.get(`/api/collector/sources/${id}`);

// データソースを作成
export const createDataSource = (data) => api.post('/api/collector/sources', data);

// データソースを更新
export const updateDataSource = (id, data) => api.patch(`/api/collector/sources/${id}`, data);

// データソースを切り替え
export const toggleDataSource = (id) => api.post(`/api/collector/sources/${id}/toggle`);

// データソースを削除
export const deleteDataSource = (id) => api.delete(`/api/collector/sources/${id}`);

// 統計情報を取得
export const getStats = () => api.get('/api/collector/stats');

export default {
  getCollectionStatus,
  triggerCollection,
  getArticles,
  getArticle,
  updateArticleStatus,
  deleteArticle,
  getDataSources,
  getDataSource,
  createDataSource,
  updateDataSource,
  toggleDataSource,
  deleteDataSource,
  getStats
};
