import express from 'express';
import * as contentGeneratorService from '../services/content-generator.service.js';
import * as contentModel from '../models/content.model.js';
import { validateContentData, validatePagination, formatSuccessResponse, formatErrorResponse } from '../utils/validator.js';
import { logApiError } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/content/templates
 * 利用可能なテンプレート一覧を取得
 */
router.get('/templates', (req, res) => {
  try {
    const templates = contentGeneratorService.getAvailableTemplates();
    res.json(formatSuccessResponse(templates));
  } catch (error) {
    logApiError('/api/content/templates', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/content/generate
 * コンテンツを生成
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      articleId,
      templateType,
      customPrompt = null,
      useDify = true,
      autoApprove = false,
      generatedBy = 'user'
    } = req.body;

    if (!articleId || !templateType) {
      return res.status(400).json(
        formatErrorResponse('articleId and templateType are required')
      );
    }

    const result = await contentGeneratorService.generateContentFromArticle(
      articleId,
      templateType,
      {
        customPrompt,
        useDify,
        autoApprove,
        generatedBy
      }
    );

    res.json(formatSuccessResponse(result, 'Content generated successfully'));
  } catch (error) {
    logApiError('/api/content/generate', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/content/preview
 * コンテンツをプレビュー（保存しない）
 */
router.post('/preview', async (req, res) => {
  try {
    const {
      articleId,
      templateType,
      customPrompt = null,
      useDify = true
    } = req.body;

    if (!articleId || !templateType) {
      return res.status(400).json(
        formatErrorResponse('articleId and templateType are required')
      );
    }

    const result = await contentGeneratorService.previewContent(
      articleId,
      templateType,
      {
        customPrompt,
        useDify
      }
    );

    res.json(formatSuccessResponse(result));
  } catch (error) {
    logApiError('/api/content/preview', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/content/batch-generate
 * バッチ生成
 */
router.post('/batch-generate', async (req, res) => {
  try {
    const {
      articleIds,
      templateType,
      customPrompt = null,
      useDify = true,
      autoApprove = false
    } = req.body;

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json(
        formatErrorResponse('articleIds must be a non-empty array')
      );
    }

    if (!templateType) {
      return res.status(400).json(
        formatErrorResponse('templateType is required')
      );
    }

    const result = await contentGeneratorService.batchGenerateContent(
      articleIds,
      templateType,
      {
        customPrompt,
        useDify,
        autoApprove,
        generatedBy: 'user'
      }
    );

    res.json(formatSuccessResponse(result, 'Batch generation completed'));
  } catch (error) {
    logApiError('/api/content/batch-generate', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/content
 * コンテンツ一覧を取得
 */
router.get('/', (req, res) => {
  try {
    const {
      status,
      template_type,
      article_id,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC'
    } = req.query;

    const validation = validatePagination(limit, offset);
    if (!validation.isValid) {
      return res.status(400).json(formatErrorResponse(validation.errors));
    }

    const options = {
      status,
      template_type,
      article_id: article_id ? parseInt(article_id) : undefined,
      limit: validation.limit,
      offset: validation.offset,
      orderBy,
      order
    };

    const contents = contentModel.getContents(options);
    const total = contentModel.getContentCount(options);

    res.json(formatSuccessResponse({
      contents,
      total,
      limit: validation.limit,
      offset: validation.offset
    }));
  } catch (error) {
    logApiError('/api/content', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/content/:id
 * コンテンツ詳細を取得
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const content = contentModel.getContentById(parseInt(id));

    if (!content) {
      return res.status(404).json(formatErrorResponse('Content not found'));
    }

    res.json(formatSuccessResponse(content));
  } catch (error) {
    logApiError(`/api/content/${req.params.id}`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * PATCH /api/content/:id
 * コンテンツを更新
 */
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const content = contentModel.updateContent(parseInt(id), updateData);

    if (!content) {
      return res.status(404).json(formatErrorResponse('Content not found'));
    }

    res.json(formatSuccessResponse(content, 'Content updated'));
  } catch (error) {
    logApiError(`/api/content/${req.params.id}`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/content/:id/approve
 * コンテンツを承認
 */
router.post('/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy = 'user' } = req.body;

    const content = contentModel.updateContentStatus(parseInt(id), 'approved', approvedBy);

    if (!content) {
      return res.status(404).json(formatErrorResponse('Content not found'));
    }

    res.json(formatSuccessResponse(content, 'Content approved'));
  } catch (error) {
    logApiError(`/api/content/${req.params.id}/approve`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/content/:id/reject
 * コンテンツを却下
 */
router.post('/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason = null } = req.body;

    const content = contentModel.updateContentStatus(parseInt(id), 'rejected');

    if (!content) {
      return res.status(404).json(formatErrorResponse('Content not found'));
    }

    // 却下理由をメタデータに保存
    if (reason) {
      const metadata = content.metadata || {};
      metadata.rejection_reason = reason;
      metadata.rejected_at = new Date().toISOString();

      contentModel.updateContent(parseInt(id), { metadata });
    }

    res.json(formatSuccessResponse(content, 'Content rejected'));
  } catch (error) {
    logApiError(`/api/content/${req.params.id}/reject`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * POST /api/content/:id/regenerate
 * コンテンツを再生成
 */
router.post('/:id/regenerate', async (req, res) => {
  try {
    const { id } = req.params;
    const { replaceOld = false, useDify = true, customPrompt = null } = req.body;

    const result = await contentGeneratorService.regenerateContent(
      parseInt(id),
      {
        replaceOld,
        useDify,
        customPrompt,
        generatedBy: 'user'
      }
    );

    res.json(formatSuccessResponse(result, 'Content regenerated'));
  } catch (error) {
    logApiError(`/api/content/${req.params.id}/regenerate`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * DELETE /api/content/:id
 * コンテンツを削除
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = contentModel.deleteContent(parseInt(id));

    if (!deleted) {
      return res.status(404).json(formatErrorResponse('Content not found'));
    }

    res.json(formatSuccessResponse({ deleted: true }, 'Content deleted'));
  } catch (error) {
    logApiError(`/api/content/${req.params.id}`, error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/content/pending/approval
 * 承認待ちコンテンツを取得
 */
router.get('/pending/approval', (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const contents = contentModel.getPendingApprovalContents(parseInt(limit));

    res.json(formatSuccessResponse(contents));
  } catch (error) {
    logApiError('/api/content/pending/approval', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

/**
 * GET /api/content/stats
 * コンテンツ統計を取得
 */
router.get('/stats', (req, res) => {
  try {
    const stats = contentGeneratorService.getGenerationStats();
    res.json(formatSuccessResponse(stats));
  } catch (error) {
    logApiError('/api/content/stats', error);
    res.status(500).json(formatErrorResponse(error.message));
  }
});

export default router;
