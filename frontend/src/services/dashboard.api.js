import api from './api-adapter';

/**
 * ダッシュボードAPI
 */

// 統計情報を取得
export const getStats = () => api.dashboard.getStats()
  .then(data => ({ data: data }));

// アクティビティログを取得 (Dummy)
export const getActivity = (params = {}) => Promise.resolve({ data: [] });

// 概要を取得 (Dummy)
export const getOverview = () => Promise.resolve({ data: {} });

// 記事タイムラインを取得 (Dummy)
export const getArticlesTimeline = (days = 7) => Promise.resolve({ data: [] });

// ソース別分布を取得 (Dummy)
export const getSourceDistribution = () => Promise.resolve({ data: [] });

// コンテンツステータス分布を取得 (Dummy)
export const getContentStatusDistribution = () => Promise.resolve({ data: [] });

export default {
  getStats,
  getActivity,
  getOverview,
  getArticlesTimeline,
  getSourceDistribution,
  getContentStatusDistribution
};
