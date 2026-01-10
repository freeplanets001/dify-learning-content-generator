import express from 'express';
import * as articleModel from '../models/article.model.js';
import * as contentModel from '../models/content.model.js';
import * as configModel from '../models/config.model.js';
import { query } from '../models/database.js';
import { formatSuccessResponse, formatErrorResponse } from '../utils/validator.js';
import { logApiError } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * ダッシュボード統計情報を取得
 */
router.get('/stats', (req, res) => {
  try {
    const articleStats = articleModel.getArticleStats();
    const contentStats = contentModel.getContentStats();
    const sources = configModel.getAllDataSources();

    const stats = {
      articles: {
        total: articleStats.total || 0,
        unprocessed: articleStats.unprocessed || 0,
        processing: articleStats.processing || 0,
        processed: articleStats.processed || 0,
        error: articleStats.error || 0,
        today: articleStats.today || 0
      },
      contents: {
        total: contentStats.total || 0,
        draft: contentStats.draft || 0,
        pending_approval: contentStats.pending_approval || 0,
        approved: contentStats.approved || 0,
        rejected: contentStats.rejected || 0,
        published: contentStats.published || 0,
        today: contentStats.today || 0
      },
      sources: {
        total: sources.length,
        enabled: sources.filter(s => s.enabled).length,
        last_collection: sources
          .filter(s => s.last_collected_at)
          .sort((a, b) => new Date(b.last_collected_at) - new Date(a.last_collected_at))[0]
          ?.last_collected_at || null
      }
    };

    res.json(formatSuccessResponse(stats));
  } catch (error) {
    logApiError('/api/dashboard/stats', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/dashboard/activity
 * アクティビティログを取得
 */
router.get('/activity', (req, res) => {
  try {
    const { category, limit = 50 } = req.query;

    let sql = 'SELECT * FROM logs WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const logs = query(sql, params);

    const activities = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));

    res.json(formatSuccessResponse(activities));
  } catch (error) {
    logApiError('/api/dashboard/activity', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/dashboard/overview
 * ダッシュボード概要を取得
 */
router.get('/overview', (req, res) => {
  try {
    const articleStats = articleModel.getArticleStats();
    const contentStats = contentModel.getContentStats();
    const articlesBySource = articleModel.getArticlesBySource();
    const contentsByTemplate = contentModel.getContentsByTemplate();
    const sources = configModel.getAllDataSources();

    // 最近の記事（5件）
    const recentArticles = articleModel.getArticles({
      limit: 5,
      orderBy: 'collected_date',
      order: 'DESC'
    });

    // 承認待ちコンテンツ
    const pendingContents = contentModel.getPendingApprovalContents(5);

    const overview = {
      stats: {
        articles: articleStats,
        contents: contentStats
      },
      breakdown: {
        articles_by_source: articlesBySource,
        contents_by_template: contentsByTemplate
      },
      sources: {
        total: sources.length,
        enabled: sources.filter(s => s.enabled).length,
        list: sources.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          enabled: s.enabled,
          last_collected: s.last_collected_at,
          count: s.collection_count
        }))
      },
      recent: {
        articles: recentArticles,
        pending_approvals: pendingContents
      }
    };

    res.json(formatSuccessResponse(overview));
  } catch (error) {
    logApiError('/api/dashboard/overview', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/dashboard/charts/articles-timeline
 * 記事収集タイムライン（7日間）
 */
router.get('/charts/articles-timeline', (req, res) => {
  try {
    const { days = 7 } = req.query;

    const result = query(`
      SELECT
        date(collected_date) as date,
        COUNT(*) as count
      FROM articles
      WHERE collected_date >= date('now', '-' || ? || ' days')
      GROUP BY date(collected_date)
      ORDER BY date ASC
    `, [parseInt(days)]);

    res.json(formatSuccessResponse(result));
  } catch (error) {
    logApiError('/api/dashboard/charts/articles-timeline', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/dashboard/charts/source-distribution
 * ソース別分布
 */
router.get('/charts/source-distribution', (req, res) => {
  try {
    const distribution = articleModel.getArticlesBySource();
    res.json(formatSuccessResponse(distribution));
  } catch (error) {
    logApiError('/api/dashboard/charts/source-distribution', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/dashboard/charts/content-status
 * コンテンツステータス分布
 */
router.get('/charts/content-status', (req, res) => {
  try {
    const stats = contentModel.getContentStats();

    const distribution = [
      { status: 'draft', count: stats.draft || 0 },
      { status: 'pending_approval', count: stats.pending_approval || 0 },
      { status: 'approved', count: stats.approved || 0 },
      { status: 'rejected', count: stats.rejected || 0 },
      { status: 'published', count: stats.published || 0 }
    ];

    res.json(formatSuccessResponse(distribution));
  } catch (error) {
    logApiError('/api/dashboard/charts/content-status', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

export default router;
