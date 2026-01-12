import api from './api';

/**
 * コンテンツ生成API
 */

// テンプレート一覧を取得
export const getTemplates = () => api.get('/api/content/templates');

// コンテンツを生成 (GAS未実装 - dummy)
// コンテンツを生成
export const generateContent = (data) => {
  // data: { articleId, templateType, useDify }
  // useDify flag is handled by GAS based on config, or we can pass it if supported.
  // For now, api-adapter supports generate(articleId, templateId).
  return api.content.generate(data.articleId, data.templateType)
    .then(res => ({ data: { success: true, content: res } }));
};

// コンテンツをプレビュー (GAS未実装 - dummy)
export const previewContent = (data) => Promise.resolve({ data: { preview: 'dummy preview content' } });

// バッチ生成 (GAS未実装 - dummy)
export const batchGenerate = (data) => Promise.resolve({ data: [] });

// コンテンツ一覧を取得
export const getContents = (params = {}) => api.content.getList(params)
  .then(data => ({ data: data }));

// コンテンツ詳細を取得 (GASのリストから検索)
export const getContent = (id) => api.content.getList()
  .then(data => {
    const content = data.find(c => c.id == id);
    return { data: content || null };
  });

// コンテンツを作成 (手動作成: GAS未実装 - dummy)
export const createContent = (data) => Promise.resolve({ data: { id: Date.now(), ...data } });

// コンテンツを更新 (GAS未実装 - dummy)
export const updateContent = (id, data) => Promise.resolve({ data: { id, ...data } });

// コンテンツを削除 (GAS未実装 - dummy)
export const deleteContent = (id) => Promise.resolve({ data: { success: true } });

// コンテンツ承認 (GAS未実装 - dummy)
export const approveContent = (id) => Promise.resolve({ data: { success: true, status: 'approved' } });

// コンテンツ却下 (GAS未実装 - dummy)
export const rejectContent = (id, reason) => Promise.resolve({ data: { success: true, status: 'rejected' } });

// コンテンツを再生成 (GAS未実装 - dummy)
export const regenerateContent = (id, options = {}) => Promise.resolve({ data: { id, ...options, regenerated: true } });

// 承認待ち一覧を取得 (GAS未実装 - dummy)
export const getPendingContents = () => Promise.resolve({ data: [] });

// 統計情報を取得 (GAS未実装 - dummy)
export const getStats = () => Promise.resolve({
  data: {
    total_contents: 0,
    approved_count: 0,
    rejected_count: 0
  }
});

export default {
  getTemplates,
  generateContent,
  previewContent,
  batchGenerate,
  getContents,
  getContent,
  createContent,
  updateContent,
  deleteContent,
  approveContent,
  rejectContent,
  regenerateContent,
  getPendingContents,
  getStats
};
