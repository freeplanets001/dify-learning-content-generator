import * as difyService from './dify.service.js';
import * as articleModel from '../models/article.model.js';
import * as contentModel from '../models/content.model.js';
import { generateArticleTemplate } from '../utils/markdown.js';
import logger, { logGenerationActivity } from '../utils/logger.js';

/**
 * コンテンツ生成サービス
 */

/**
 * 記事からコンテンツを生成
 */
export async function generateContentFromArticle(articleId, templateType, options = {}) {
  const {
    customPrompt = null,
    useDify = true,
    autoApprove = false,
    generatedBy = 'system'
  } = options;

  // 記事を取得
  const article = articleModel.getArticleById(articleId);

  if (!article) {
    throw new Error('Article not found');
  }

  logger.info('Generating content', {
    articleId,
    title: article.title,
    templateType
  });

  let generatedContent;
  let method = 'template';

  try {
    if (useDify) {
      // Dify APIを使用してコンテンツ生成
      const result = await difyService.generateContent(article, templateType, customPrompt);

      if (!result.success) {
        throw new Error(result.error || 'Dify generation failed');
      }

      generatedContent = result.answer || result.outputs?.content || result.data;
      method = 'dify';

      logger.info('Content generated via Dify', {
        articleId,
        templateType,
        contentLength: generatedContent.length
      });
    } else {
      // テンプレートベースで生成
      generatedContent = generateArticleTemplate(article, templateType);
      method = 'template';

      logger.info('Content generated via template', {
        articleId,
        templateType
      });
    }

    // コンテンツをデータベースに保存
    const content = contentModel.createContent({
      article_id: articleId,
      template_type: templateType,
      title: article.title,
      content: generatedContent,
      status: autoApprove ? 'approved' : 'pending_approval',
      version: 1,
      generated_by: generatedBy,
      metadata: {
        method,
        custom_prompt: customPrompt,
        generated_at: new Date().toISOString()
      }
    });

    // 記事のステータスを更新
    if (article.status === 'unprocessed') {
      articleModel.updateArticleStatus(articleId, 'processing');
    }

    logGenerationActivity(templateType, 'success', {
      contentId: content.id,
      articleId,
      method
    });

    return {
      success: true,
      content,
      method
    };
  } catch (error) {
    logger.error('Content generation failed', {
      articleId,
      templateType,
      error: error.message
    });

    logGenerationActivity(templateType, 'error', {
      articleId,
      error: error.message
    });

    throw error;
  }
}

/**
 * バッチ生成（複数記事）
 */
export async function batchGenerateContent(articleIds, templateType, options = {}) {
  const results = [];

  for (const articleId of articleIds) {
    try {
      const result = await generateContentFromArticle(articleId, templateType, options);
      results.push({
        articleId,
        success: true,
        contentId: result.content.id
      });
    } catch (error) {
      results.push({
        articleId,
        success: false,
        error: error.message
      });
    }
  }

  const summary = {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };

  logger.info('Batch generation completed', summary);

  return summary;
}

/**
 * コンテンツを再生成
 */
export async function regenerateContent(contentId, options = {}) {
  const existingContent = contentModel.getContentById(contentId);

  if (!existingContent) {
    throw new Error('Content not found');
  }

  // 元の記事から再生成
  const result = await generateContentFromArticle(
    existingContent.article_id,
    existingContent.template_type,
    {
      ...options,
      generatedBy: options.generatedBy || 'system'
    }
  );

  // 古いコンテンツを削除（オプション）
  if (options.replaceOld) {
    contentModel.deleteContent(contentId);
  }

  return result;
}

/**
 * コンテンツをプレビュー（保存せず生成のみ）
 */
export async function previewContent(articleId, templateType, options = {}) {
  const article = articleModel.getArticleById(articleId);

  if (!article) {
    throw new Error('Article not found');
  }

  const { customPrompt = null, useDify = true } = options;

  let generatedContent;
  let method = 'template';

  if (useDify) {
    const result = await difyService.generateContent(article, templateType, customPrompt);

    if (!result.success) {
      throw new Error(result.error || 'Dify generation failed');
    }

    generatedContent = result.answer || result.outputs?.content || result.data;
    method = 'dify';
  } else {
    generatedContent = generateArticleTemplate(article, templateType);
    method = 'template';
  }

  return {
    success: true,
    preview: generatedContent,
    method,
    article: {
      id: article.id,
      title: article.title,
      url: article.url
    }
  };
}

/**
 * テンプレート一覧を取得
 */
export function getAvailableTemplates() {
  return [
    {
      id: 'tutorial',
      name: 'チュートリアル',
      description: '初心者向けの詳細なチュートリアル記事',
      icon: '📚',
      recommendedFor: ['technical', 'how-to']
    },
    {
      id: 'note-article',
      name: 'note記事',
      description: 'noteプラットフォーム向けの記事下書き',
      icon: '📝',
      recommendedFor: ['general', 'opinion']
    },
    {
      id: 'threads-post',
      name: 'Threads投稿',
      description: '速報・Tipsのための短文投稿',
      icon: '🧵',
      recommendedFor: ['news', 'tips']
    },
    {
      id: 'slide-outline',
      name: 'スライド構成',
      description: '勉強会用のスライド構成案',
      icon: '📊',
      recommendedFor: ['presentation', 'workshop']
    }
  ];
}

/**
 * 生成統計を取得
 */
export function getGenerationStats() {
  const contentStats = contentModel.getContentStats();
  const byTemplate = contentModel.getContentsByTemplate();

  return {
    overall: contentStats,
    by_template: byTemplate,
    templates: getAvailableTemplates()
  };
}

export default {
  generateContentFromArticle,
  batchGenerateContent,
  regenerateContent,
  previewContent,
  getAvailableTemplates,
  getGenerationStats
};
