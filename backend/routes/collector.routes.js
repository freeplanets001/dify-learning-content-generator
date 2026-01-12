import express from 'express';
import collectorService from '../services/collector.service.js';
import * as urlService from '../services/url.service.js';
import * as articleModel from '../models/article.model.js';
import * as configModel from '../models/config.model.js';
import { validatePagination, formatSuccessResponse, formatErrorResponse } from '../utils/validator.js';
import logger, { logApiError } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/collector/status
 * 収集ステータスを取得
 */
router.get('/status', (req, res) => {
  try {
    const status = collectorService.getCollectionStatus();
    res.json(formatSuccessResponse(status));
  } catch (error) {
    logApiError('/api/collector/status', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/collector/trigger
 * 収集をトリガー
 */
router.post('/trigger', async (req, res) => {
  try {
    const { sourceId, source } = req.body;

    let result;

    if (sourceId) {
      // 特定のソースから収集
      result = await collectorService.collectFromSourceById(sourceId);
    } else if (source) {
      // ソース名指定で収集
      switch (source) {
        case 'dify-blog':
          result = await collectorService.collectDifyBlog();
          break;
        case 'qiita':
          result = await collectorService.collectQiita();
          break;
        case 'zenn':
          result = await collectorService.collectZenn();
          break;
        default:
          return res.status(400).json(formatErrorResponse('Unknown source'));
      }
    } else {
      // 全ソースから収集
      result = await collectorService.collectFromAllSources();
    }

    res.json(formatSuccessResponse(result, 'Collection completed'));
  } catch (error) {
    logApiError('/api/collector/trigger', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/collector/articles
 * 記事一覧を取得
 */
router.get('/articles', (req, res) => {
  try {
    const {
      status,
      source_type,
      source_name,
      limit = 50,
      offset = 0,
      orderBy = 'collected_date',
      order = 'DESC'
    } = req.query;

    // ページネーションバリデーション
    const validation = validatePagination(limit, offset);
    if (!validation.isValid) {
      return res.status(400).json(formatErrorResponse(validation.errors));
    }

    const options = {
      status,
      source_type,
      source_name,
      limit: validation.limit,
      offset: validation.offset,
      orderBy,
      order
    };

    const articles = articleModel.getArticles(options);
    const total = articleModel.getArticleCount(options);

    res.json(formatSuccessResponse({
      articles,
      total,
      limit: validation.limit,
      offset: validation.offset
    }));
  } catch (error) {
    logApiError('/api/collector/articles', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/collector/articles/:id
 * 記事詳細を取得
 */
router.get('/articles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const article = articleModel.getArticleById(parseInt(id));

    if (!article) {
      return res.status(404).json(formatErrorResponse('Article not found'));
    }

    res.json(formatSuccessResponse(article));
  } catch (error) {
    logApiError(`/api/collector/articles/${req.params.id}`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * PATCH /api/collector/articles/:id/status
 * 記事のステータスを更新
 */
router.patch('/articles/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json(formatErrorResponse('Status is required'));
    }

    const validStatuses = ['unprocessed', 'processing', 'processed', 'error', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(
        formatErrorResponse(`Status must be one of: ${validStatuses.join(', ')}`)
      );
    }

    const article = articleModel.updateArticleStatus(parseInt(id), status);

    if (!article) {
      return res.status(404).json(formatErrorResponse('Article not found'));
    }

    res.json(formatSuccessResponse(article, 'Status updated'));
  } catch (error) {
    logApiError(`/api/collector/articles/${req.params.id}/status`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * DELETE /api/collector/articles/:id
 * 記事を削除
 */
router.delete('/articles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = articleModel.deleteArticle(parseInt(id));

    if (!deleted) {
      return res.status(404).json(formatErrorResponse('Article not found'));
    }

    res.json(formatSuccessResponse({ deleted: true }, 'Article deleted'));
  } catch (error) {
    logApiError(`/api/collector/articles/${req.params.id}`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/collector/articles/batch-delete
 * 記事を一括削除
 */
router.post('/articles/batch-delete', (req, res) => {
  try {
    const { ids, all, status } = req.body;
    let count = 0;

    if (all) {
      count = articleModel.deleteAllArticles(status);
    } else if (Array.isArray(ids) && ids.length > 0) {
      count = articleModel.deleteArticles(ids);
    } else {
      return res.status(400).json(formatErrorResponse('No IDs provided'));
    }

    res.json(formatSuccessResponse({ count }, `${count} articles deleted`));
  } catch (error) {
    logApiError('/api/collector/articles/batch-delete', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/collector/sources
 * データソース一覧を取得
 */
router.get('/sources', (req, res) => {
  try {
    const { enabled } = req.query;
    const sources = configModel.getAllDataSources(enabled === 'true');

    res.json(formatSuccessResponse(sources));
  } catch (error) {
    logApiError('/api/collector/sources', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/collector/sources/:id
 * データソース詳細を取得
 */
router.get('/sources/:id', (req, res) => {
  try {
    const { id } = req.params;
    const source = configModel.getDataSource(parseInt(id));

    if (!source) {
      return res.status(404).json(formatErrorResponse('Source not found'));
    }

    res.json(formatSuccessResponse(source));
  } catch (error) {
    logApiError(`/api/collector/sources/${req.params.id}`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/collector/sources
 * データソースを作成
 */
router.post('/sources', (req, res) => {
  try {
    const { name, type, url, enabled, config: sourceConfig } = req.body;

    if (!name || !type) {
      return res.status(400).json(
        formatErrorResponse('Name and type are required')
      );
    }

    const source = configModel.createDataSource({
      name,
      type,
      url,
      enabled,
      config: sourceConfig
    });

    res.status(201).json(formatSuccessResponse(source, 'Source created'));
  } catch (error) {
    logApiError('/api/collector/sources', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * PATCH /api/collector/sources/:id
 * データソースを更新
 */
router.patch('/sources/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const source = configModel.updateDataSource(parseInt(id), updateData);

    if (!source) {
      return res.status(404).json(formatErrorResponse('Source not found'));
    }

    res.json(formatSuccessResponse(source, 'Source updated'));
  } catch (error) {
    logApiError(`/api/collector/sources/${req.params.id}`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/collector/sources/:id/toggle
 * データソースの有効/無効を切り替え
 */
router.post('/sources/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const source = configModel.toggleDataSource(parseInt(id));

    if (!source) {
      return res.status(404).json(formatErrorResponse('Source not found'));
    }

    res.json(formatSuccessResponse(source, 'Source toggled'));
  } catch (error) {
    logApiError(`/api/collector/sources/${req.params.id}/toggle`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});



/**
 * DELETE /api/collector/sources/:id
 * データソースを削除
 */
router.delete('/sources/:id', (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Received DELETE request for source ID: ${id}`);
    const deleted = configModel.deleteDataSource(parseInt(id));

    if (!deleted) {
      // 既に削除されている場合も成功として扱い、画面側でリスト更新させる（冪等性）
      logger.warn(`Source with ID ${id} not found during delete (treated as success)`);
      return res.json(formatSuccessResponse({ deleted: false }, 'Source already deleted'));
    }

    res.json(formatSuccessResponse({ deleted: true }, 'Source deleted'));
  } catch (error) {
    logApiError(`/api/collector/sources/${req.params.id}`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/collector/stats
 * 収集統計を取得
 */
router.get('/stats', (req, res) => {
  try {
    const stats = articleModel.getArticleStats();
    const bySource = articleModel.getArticlesBySource();

    res.json(formatSuccessResponse({
      overall: stats,
      by_source: bySource
    }));
  } catch (error) {
    logApiError('/api/collector/stats', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/collector/url
 * URLからコンテンツを収集
 */
router.post('/url', async (req, res) => {
  try {
    const { url, urls, sourceName = 'URL Import', save = true } = req.body;

    // 単一URLまたは複数URLを処理
    const targetUrls = urls || (url ? [url] : []);

    if (targetUrls.length === 0) {
      return res.status(400).json(formatErrorResponse('URL is required'));
    }

    // URLコンテンツを取得
    const results = [];
    const articlesToSave = []; // 同期用に記事を収集

    for (const targetUrl of targetUrls) {
      const result = await urlService.fetchUrlContent(targetUrl);

      if (result.success && save) {
        // 記事として正規化
        const article = urlService.normalizeUrlContent(result.data, sourceName);

        // 重複チェック
        const existing = articleModel.findArticleByUrl(targetUrl);
        if (!existing) {
          articlesToSave.push(article);
          result.saved = true;
        } else {
          result.saved = false;
          result.duplicate = true;
        }
      }

      results.push(result);
    }

    // saveArticlesを使用して保存（GAS/Obsidian同期を含む）
    let saved = 0;
    let duplicates = results.filter(r => r.duplicate).length;

    if (articlesToSave.length > 0) {
      const saveResult = await collectorService.saveArticles(articlesToSave);
      saved = saveResult.saved;
      duplicates += saveResult.duplicates;

      logger.info(`URL collection completed with sync`, {
        saved: saveResult.saved,
        duplicates: saveResult.duplicates
      });
    }

    const failed = results.filter(r => !r.success).length;

    res.json(formatSuccessResponse({
      total: targetUrls.length,
      saved,
      duplicates,
      failed,
      results
    }, `${saved} URLs collected and synced`));
  } catch (error) {
    logApiError('/api/collector/url', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/collector/url/preview
 * URLからコンテンツをプレビュー（保存せず）
 */
router.post('/url/preview', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json(formatErrorResponse('URL is required'));
    }

    const result = await urlService.fetchUrlContent(url);

    if (!result.success) {
      return res.status(400).json(formatErrorResponse(result.error));
    }

    res.json(formatSuccessResponse(result.data, 'Content extracted'));
  } catch (error) {
    logApiError('/api/collector/url/preview', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

export default router;

