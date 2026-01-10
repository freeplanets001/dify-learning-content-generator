import api from './api';

/**
 * ダッシュボードAPI
 */

// 統計情報を取得
export const getStats = () => api.get('/api/dashboard/stats');

// アクティビティログを取得
export const getActivity = (params = {}) => api.get('/api/dashboard/activity', { params });

// 概要を取得
export const getOverview = () => api.get('/api/dashboard/overview');

// 記事タイムラインを取得
export const getArticlesTimeline = (days = 7) =>
  api.get('/api/dashboard/charts/articles-timeline', { params: { days } });

// ソース別分布を取得
export const getSourceDistribution = () =>
  api.get('/api/dashboard/charts/source-distribution');

// コンテンツステータス分布を取得
export const getContentStatusDistribution = () =>
  api.get('/api/dashboard/charts/content-status');

export default {
  getStats,
  getActivity,
  getOverview,
  getArticlesTimeline,
  getSourceDistribution,
  getContentStatusDistribution
};
