import api from './api';

/**
 * コンテンツ生成API
 */

// テンプレート一覧を取得
export const getTemplates = () => api.get('/api/content/templates');

// コンテンツを生成
export const generateContent = (data) => api.post('/api/content/generate', data);

// コンテンツをプレビュー
export const previewContent = (data) => api.post('/api/content/preview', data);

// バッチ生成
export const batchGenerate = (data) => api.post('/api/content/batch-generate', data);

// コンテンツ一覧を取得
export const getContents = (params = {}) => api.get('/api/content', { params });

// コンテンツ詳細を取得
export const getContent = (id) => api.get(`/api/content/${id}`);

// コンテンツを更新
export const updateContent = (id, data) => api.patch(`/api/content/${id}`, data);

// コンテンツを承認
export const approveContent = (id, approvedBy = 'user') =>
  api.post(`/api/content/${id}/approve`, { approvedBy });

// コンテンツを却下
export const rejectContent = (id, reason = null) =>
  api.post(`/api/content/${id}/reject`, { reason });

// コンテンツを再生成
export const regenerateContent = (id, options = {}) =>
  api.post(`/api/content/${id}/regenerate`, options);

// コンテンツを削除
export const deleteContent = (id) => api.delete(`/api/content/${id}`);

// 承認待ちコンテンツを取得
export const getPendingApprovalContents = (limit = 20) =>
  api.get('/api/content/pending/approval', { params: { limit } });

// 統計情報を取得
export const getStats = () => api.get('/api/content/stats');

export default {
  getTemplates,
  generateContent,
  previewContent,
  batchGenerate,
  getContents,
  getContent,
  updateContent,
  approveContent,
  rejectContent,
  regenerateContent,
  deleteContent,
  getPendingApprovalContents,
  getStats
};
