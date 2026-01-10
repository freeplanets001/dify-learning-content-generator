import api from './api';

/**
 * Obsidian連携API
 */

// Vault設定を取得
export const getVaultConfig = () => api.get('/api/obsidian/config');

// Vault設定を更新
export const updateVaultConfig = (data) => api.post('/api/obsidian/config', data);

// Vaultの存在確認
export const checkVault = (vaultPath) => api.post('/api/obsidian/check-vault', { vaultPath });

// Daily Noteを生成
export const generateDailyNote = (data = {}) => api.post('/api/obsidian/daily-note', data);

// 個別記事のNoteを生成
export const generateArticleNote = (id, templateType = 'default') =>
  api.post(`/api/obsidian/article-note/${id}`, { templateType });

// Daily Notes一覧を取得
export const getDailyNotes = (limit = 30) =>
  api.get('/api/obsidian/daily-notes', { params: { limit } });

export default {
  getVaultConfig,
  updateVaultConfig,
  checkVault,
  generateDailyNote,
  generateArticleNote,
  getDailyNotes
};
